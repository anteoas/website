const fs = require('fs');
const path = require('path');
const { readFileSync, existsSync } = require('fs-extra');
const glob = require('glob');
const cheerio = require('cheerio');
const sharp = require('sharp');

// Configuration
const config = {
  roots: ['/', '/en/'],
  publicDir: 'dist',
  ignore: ['/api/*'],
  checkAssets: true,
  verbose: false
};

// Colors for output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Parse command line arguments
const args = process.argv.slice(2);
if (args.includes('--verbose')) config.verbose = true;
if (args.includes('--help')) {
  console.log(`
Link Checker - Verify all links and content reachability

Usage: node tools/link-checker.js [options]

Options:
  --verbose       Show detailed output
  --roots         Comma-separated list of root paths (default: /,/en/)
  --help          Show this help message
  `);
  process.exit(0);
}

// Parse --roots argument
const rootsIndex = args.indexOf('--roots');
if (rootsIndex !== -1 && args[rootsIndex + 1]) {
  config.roots = args[rootsIndex + 1].split(',');
}

class LinkChecker {
  constructor(config) {
    this.config = config;
    this.pages = new Map(); // path -> { links: [], assets: [], anchors: [] }
    this.reachablePages = new Set();
    this.errors = [];
    this.warnings = [];
    this.missingTranslations = [];
    this.imageRequirements = [];
    this.stats = {
      totalPages: 0,
      totalLinks: 0,
      validLinks: 0,
      brokenLinks: 0,
      unreachablePages: 0,
      unusedAssets: 0,
      missingImages: 0,
      undersizedImages: 0,
      missingTranslations: 0
    };
  }

  async run() {
    console.log('🔍 Link Checker\n' + '='.repeat(50) + '\n');
    console.log(`Checking from roots: ${this.config.roots.join(', ')}\n`);

    // Step 1: Scan all HTML files
    this.scanHtmlFiles();

    // Step 2: Check all links
    this.checkAllLinks();

    // Step 3: Check reachability from roots
    this.checkReachability();

    // Step 4: Check image sizes
    await this.checkImageSizes();

    // Step 5: Check for unused assets
    if (this.config.checkAssets) {
      this.checkUnusedAssets();
    }

    // Step 6: Report results
    this.report();
  }

  scanHtmlFiles() {
    const htmlFiles = glob.sync(`${this.config.publicDir}/**/*.html`);
    this.stats.totalPages = htmlFiles.length;

    htmlFiles.forEach(file => {
      const relativePath = '/' + path.relative(this.config.publicDir, file);
      const content = readFileSync(file, 'utf8');
      const $ = cheerio.load(content);

      const pageData = {
        file: file,
        links: [],
        assets: [],
        anchors: [],
        externalLinks: []
      };

      // Find all links
      $('a[href]').each((_, elem) => {
        const href = $(elem).attr('href');
        if (href.startsWith('http://') || href.startsWith('https://')) {
          pageData.externalLinks.push(href);
        } else if (href.startsWith('/') || href.startsWith('#') || !href.includes(':')) {
          pageData.links.push(href);
        }
      });

      // Find all assets
      $('img[src], script[src], link[href]').each((_, elem) => {
        const src = $(elem).attr('src') || $(elem).attr('href');
        if (src && !src.startsWith('http') && !src.startsWith('//')) {
          pageData.assets.push(src);
          
          // Check if image has size requirements
          if (elem.name === 'img' && src.includes('?')) {
            const [cleanPath, queryString] = src.split('?');
            const params = new URLSearchParams(queryString);
            const size = params.get('size');
            
            if (size) {
              const [width, height] = size.split('x').map(Number);
              this.imageRequirements.push({
                page: relativePath,
                src: cleanPath,
                requiredWidth: width,
                requiredHeight: height
              });
            }
          }
        }
      });

      // Find all anchors
      $('[id]').each((_, elem) => {
        pageData.anchors.push($(elem).attr('id'));
      });

      this.pages.set(relativePath, pageData);
    });

    if (this.config.verbose) {
      console.log(`Scanned ${this.stats.totalPages} HTML files\n`);
    }
  }

  checkAllLinks() {
    // First, collect all pages by language
    const pagesByLanguage = {
      no: new Set(),
      en: new Set()
    };
    
    this.pages.forEach((pageData, pagePath) => {
      const lang = this.detectLanguage(pagePath);
      if (lang && pagesByLanguage[lang]) {
        // Normalize path for comparison
        const normalizedPath = pagePath.replace(/^\/en\//, '/').replace(/index\.html$/, '');
        pagesByLanguage[lang].add(normalizedPath);
      }
    });
    
    // Check for missing translations
    pagesByLanguage.no.forEach(noPath => {
      const enPath = noPath;
      if (!pagesByLanguage.en.has(enPath) && !noPath.includes('/team/') && !noPath.includes('/news/')) {
        this.missingTranslations.push({
          norwegianPage: noPath,
          expectedEnglishPage: '/en' + enPath,
          message: 'English translation missing'
        });
        this.stats.missingTranslations++;
      }
    });
    
    this.pages.forEach((pageData, pagePath) => {
      // Check internal links
      pageData.links.forEach(link => {
        this.stats.totalLinks++;
        
        if (link.startsWith('#')) {
          // Anchor link on same page
          const anchorName = link.substring(1);
          if (anchorName && !pageData.anchors.includes(anchorName)) {
            this.errors.push({
              type: 'broken-anchor',
              from: pagePath,
              to: link,
              message: 'Anchor not found'
            });
            this.stats.brokenLinks++;
          } else {
            this.stats.validLinks++;
          }
        } else {
          // Internal page link
          let targetPath = link;
          let anchor = '';
          
          // Handle anchor links
          if (link.includes('#')) {
            [targetPath, anchor] = link.split('#');
          }

          // Resolve relative links
          if (!targetPath.startsWith('/')) {
            targetPath = path.join(path.dirname(pagePath), targetPath);
          }

          // Normalize path
          targetPath = targetPath.replace(/\/+/g, '/');
          
          // Check if target exists
          const targetFile = path.join(this.config.publicDir, targetPath);
          const targetFileWithIndex = targetPath.endsWith('/') 
            ? path.join(this.config.publicDir, targetPath, 'index.html')
            : targetFile;

          if (existsSync(targetFile) || existsSync(targetFileWithIndex)) {
            this.stats.validLinks++;
            
            // Check anchor if present
            if (anchor) {
              const targetPageData = this.pages.get(targetPath) || 
                                   this.pages.get(targetPath + 'index.html') ||
                                   this.pages.get(targetPath.replace(/\.html$/, '') + '/index.html');
              
              if (targetPageData && !targetPageData.anchors.includes(anchor)) {
                this.warnings.push({
                  type: 'broken-anchor',
                  from: pagePath,
                  to: link,
                  message: `Anchor '#${anchor}' not found in target page`
                });
              }
            }

            // Check language consistency
            const fromLang = this.detectLanguage(pagePath);
            const toLang = this.detectLanguage(targetPath);
            if (fromLang && toLang && fromLang !== toLang) {
              this.warnings.push({
                type: 'language-mismatch',
                from: pagePath,
                to: targetPath,
                message: `Link from ${fromLang} page to ${toLang} page`
              });
            }
          } else {
            this.errors.push({
              type: 'broken-link',
              from: pagePath,
              to: targetPath,
              message: 'File not found'
            });
            this.stats.brokenLinks++;
          }
        }
      });

      // Check assets
      pageData.assets.forEach(asset => {
        const assetPath = asset.startsWith('/') ? asset : path.join(path.dirname(pagePath), asset);
        const assetFile = path.join(this.config.publicDir, assetPath);
        
        if (!existsSync(assetFile)) {
          // Check if it's an image
          const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
          const isImage = imageExtensions.some(ext => asset.toLowerCase().endsWith(ext));
          
          if (isImage) {
            this.warnings.push({
              type: 'missing-image',
              from: pagePath,
              to: asset,
              message: 'Image file not found - consider using a placeholder image'
            });
            this.stats.missingImages++;
          } else {
            this.errors.push({
              type: 'missing-asset',
              from: pagePath,
              to: asset,
              message: 'Asset file not found'
            });
          }
        }
      });
    });
  }

  checkReachability() {
    // Build a graph of all links
    const graph = new Map();
    
    this.pages.forEach((pageData, pagePath) => {
      const normalizedPath = this.normalizePath(pagePath);
      if (!graph.has(normalizedPath)) {
        graph.set(normalizedPath, new Set());
      }
      
      pageData.links.forEach(link => {
        if (!link.startsWith('#')) {
          let targetPath = link.split('#')[0];
          if (!targetPath.startsWith('/')) {
            targetPath = path.join(path.dirname(pagePath), targetPath);
          }
          targetPath = this.normalizePath(targetPath);
          
          // Add both the normalized path and the path with index.html
          graph.get(normalizedPath).add(targetPath);
          if (!targetPath.endsWith('index.html')) {
            graph.get(normalizedPath).add(targetPath + '/index.html');
          }
        }
      });
    });

    // BFS from each root
    const visited = new Set();
    const queue = [];

    this.config.roots.forEach(root => {
      const rootPath = this.normalizePath(root);
      
      // Try different variations of the root path
      const variations = [
        rootPath,
        rootPath + '/index.html',
        rootPath + 'index.html',
        rootPath.replace(/\/$/, '') + '/index.html'
      ];
      
      variations.forEach(variant => {
        if (graph.has(variant)) {
          queue.push(variant);
          visited.add(variant);
        }
      });
    });

    if (queue.length === 0) {
      console.log(`Warning: No root pages found for ${this.config.roots.join(', ')}`);
      console.log('Available pages in graph:', Array.from(graph.keys()).slice(0, 10));
    } else if (this.config.verbose) {
      console.log(`Found ${queue.length} root pages:`, queue);
    }

    while (queue.length > 0) {
      const current = queue.shift();
      this.reachablePages.add(current);
      
      const links = graph.get(current) || new Set();
      links.forEach(link => {
        if (!visited.has(link) && graph.has(link)) {
          visited.add(link);
          queue.push(link);
        }
      });
    }

    // Find unreachable pages
    this.pages.forEach((_, pagePath) => {
      const normalizedPath = this.normalizePath(pagePath);
      if (!this.reachablePages.has(normalizedPath) && 
          !this.config.ignore.some(pattern => this.matchPattern(normalizedPath, pattern))) {
        this.warnings.push({
          type: 'unreachable',
          page: pagePath,
          message: 'Page not reachable from configured roots'
        });
        this.stats.unreachablePages++;
      }
    });
  }

  async checkImageSizes() {
    for (const requirement of this.imageRequirements) {
      // Find the source image path
      let sourcePath = requirement.src;
      sourcePath = sourcePath.replace(/^\//, '');
      sourcePath = sourcePath.replace(/^assets\/images\//, '');
      sourcePath = path.join('src/assets/images', sourcePath);
      
      if (existsSync(sourcePath)) {
        try {
          const metadata = await sharp(sourcePath).metadata();
          
          if (metadata.width < requirement.requiredWidth || metadata.height < requirement.requiredHeight) {
            this.warnings.push({
              type: 'undersized-image',
              page: requirement.page,
              image: requirement.src,
              actual: `${metadata.width}x${metadata.height}`,
              required: `${requirement.requiredWidth}x${requirement.requiredHeight}`,
              message: 'Source image smaller than required size'
            });
            this.stats.undersizedImages++;
          }
        } catch (error) {
          // Image exists but couldn't be read (might not be a valid image)
          this.warnings.push({
            type: 'invalid-image',
            page: requirement.page,
            image: requirement.src,
            message: `Could not read image metadata: ${error.message}`
          });
        }
      }
    }
  }

  checkUnusedAssets() {
    const referencedAssets = new Set();
    
    // Collect all referenced assets
    this.pages.forEach(pageData => {
      pageData.assets.forEach(asset => {
        const assetPath = asset.startsWith('/') ? asset : path.join(path.dirname(pageData.file), asset);
        referencedAssets.add(this.normalizePath(assetPath));
      });
    });

    // Check all assets in the assets directory
    const assetFiles = glob.sync(`${this.config.publicDir}/assets/**/*`, { nodir: true });
    
    assetFiles.forEach(file => {
      const relativePath = '/' + path.relative(this.config.publicDir, file);
      const normalizedPath = this.normalizePath(relativePath);
      
      if (!referencedAssets.has(normalizedPath)) {
        this.warnings.push({
          type: 'unused-asset',
          file: relativePath,
          message: 'Asset not referenced by any page'
        });
        this.stats.unusedAssets++;
      }
    });
  }

  detectLanguage(pagePath) {
    if (pagePath.startsWith('/en/')) return 'en';
    if (pagePath.startsWith('/no/')) return 'no';
    if (!pagePath.startsWith('/en/')) return 'no'; // Default to Norwegian
    return null;
  }

  normalizePath(p) {
    // Handle empty or root paths
    if (!p || p === '/') return '/index.html';
    
    // Remove .html extension and normalize slashes
    let normalized = p.replace(/\/+/g, '/');
    
    // Handle directory paths - add index.html
    if (normalized.endsWith('/')) {
      normalized = normalized + 'index.html';
    }
    
    return normalized;
  }

  matchPattern(path, pattern) {
    // Simple glob pattern matching
    const regex = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\//g, '\\/');
    return new RegExp(`^${regex}$`).test(path);
  }

  report() {
    console.log('\n📊 Results\n' + '='.repeat(50) + '\n');

    // Errors
    if (this.errors.length > 0) {
      console.log(`${colors.red}❌ Errors (${this.errors.length}):${colors.reset}\n`);
      this.errors.forEach(error => {
        console.log(`  ${colors.red}❌${colors.reset} ${error.from} -> ${error.to}`);
        console.log(`     ${error.message}\n`);
      });
    }

    // Missing Translations
    if (this.missingTranslations.length > 0) {
      console.log(`${colors.yellow}🌐 Missing Translations (${this.missingTranslations.length}):${colors.reset}\n`);
      this.missingTranslations.forEach(item => {
        console.log(`  ${colors.yellow}🌐${colors.reset} ${item.norwegianPage}`);
        console.log(`     Expected English page at: ${item.expectedEnglishPage}\n`);
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log(`${colors.yellow}⚠️  Warnings (${this.warnings.length}):${colors.reset}\n`);
      this.warnings.forEach(warning => {
        if (warning.type === 'unreachable') {
          console.log(`  ${colors.yellow}⚠️${colors.reset}  Unreachable: ${warning.page}`);
        } else if (warning.type === 'unused-asset') {
          console.log(`  ${colors.yellow}⚠️${colors.reset}  Unused asset: ${warning.file}`);
        } else if (warning.type === 'missing-image') {
          console.log(`  ${colors.yellow}🖼️${colors.reset}  Missing image: ${warning.from} -> ${warning.to}`);
        } else if (warning.type === 'undersized-image') {
          console.log(`  ${colors.yellow}📐${colors.reset}  Undersized: ${warning.image} in ${warning.page}`);
          console.log(`     Required: ${warning.required}, Actual: ${warning.actual}`);
        } else {
          console.log(`  ${colors.yellow}⚠️${colors.reset}  ${warning.from} -> ${warning.to}`);
        }
        console.log(`     ${warning.message}\n`);
      });
    }

    // Summary
    console.log('\n📈 Summary\n' + '='.repeat(50));
    console.log(`${colors.green}✅ Valid links:${colors.reset} ${this.stats.validLinks}`);
    console.log(`${colors.red}❌ Broken links:${colors.reset} ${this.stats.brokenLinks}`);
    console.log(`${colors.yellow}🌐 Missing translations:${colors.reset} ${this.stats.missingTranslations}`);
    console.log(`${colors.yellow}🖼️  Missing images:${colors.reset} ${this.stats.missingImages}`);
    console.log(`${colors.yellow}📐 Undersized images:${colors.reset} ${this.stats.undersizedImages}`);
    console.log(`${colors.yellow}⚠️  Unreachable pages:${colors.reset} ${this.stats.unreachablePages}`);
    console.log(`${colors.yellow}⚠️  Unused assets:${colors.reset} ${this.stats.unusedAssets}`);
    console.log(`${colors.blue}📄 Total pages:${colors.reset} ${this.stats.totalPages}`);
    console.log(`${colors.blue}🔗 Total links:${colors.reset} ${this.stats.totalLinks}`);

    const exitCode = this.errors.length > 0 ? 1 : 0;
    console.log(`\n${this.errors.length > 0 ? colors.red : colors.green}Result: ${this.errors.length} errors, ${this.warnings.length + this.missingTranslations.length} warnings${colors.reset}`);
    
    process.exit(exitCode);
  }
}

// Run the checker
const checker = new LinkChecker(config);
checker.run().catch(err => {
  console.error('Link checker failed:', err);
  process.exit(1);
});