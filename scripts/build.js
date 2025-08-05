const glob = require('glob');
const path = require('path');
const { readFileSync, outputFileSync, copySync, ensureDirSync, writeFileSync, existsSync } = require('fs-extra');
const matter = require('gray-matter');
const marked = require('marked');
const Handlebars = require('handlebars');
const esbuild = require('esbuild');
const buildConfig = require('../config/build.config');
const siteConfig = require('../config/site.config');
const ImageProcessor = require('./utils/image-processor');

// Supported languages
const languages = buildConfig.languages;
const defaultLang = buildConfig.defaultLanguage;

// Load templates
const templates = {
  page: Handlebars.compile(readFileSync(path.join(__dirname, '../src/templates/pages/page.html'), 'utf8')),
  product: Handlebars.compile(readFileSync(path.join(__dirname, '../src/templates/pages/product.html'), 'utf8')),
  news: Handlebars.compile(readFileSync(path.join(__dirname, '../src/templates/pages/news.html'), 'utf8'))
};

// Helper to wrap content in base template
function wrapInBase(content, data) {
  const baseTemplate = readFileSync(path.join(__dirname, '../src/templates/layouts/base.html'), 'utf8');
  return baseTemplate.replace('{{{body}}}', content);
}

// Bundle JavaScript with esbuild
async function bundleJavaScript() {
  const isDev = process.env.NODE_ENV === 'development';
  
  console.log(`\nBundling JavaScript (${isDev ? 'development' : 'production'})...`);
  
  try {
    const result = await esbuild.build({
      entryPoints: ['src/assets/js/index.js'],
      bundle: true,
      outfile: isDev ? 'dist/assets/js/bundle.js' : 'dist/assets/js/bundle.min.js',
      minify: !isDev,
      sourcemap: isDev,
      target: ['es2015'],
      format: 'iife',
      logLevel: 'info'
    });
    
    console.log(`✓ JavaScript bundled successfully`);
  } catch (error) {
    console.error('❌ JavaScript bundling failed:', error);
    throw error;
  }
}

// Bundle CSS files
function bundleCSS() {
  console.log('Bundling CSS...');
  
  // Read the main CSS file
  const mainCSS = readFileSync('src/assets/css/style.css', 'utf8');
  
  // Replace @import statements with actual file contents
  const bundled = mainCSS.replace(
    /@import url\(['"]\.\/([^'"]+)['"]\);/g,
    (match, filename) => {
      const importPath = path.join('src/assets/css', filename);
      if (existsSync(importPath)) {
        return readFileSync(importPath, 'utf8') + '\n';
      }
      return match; // Keep original if file not found
    }
  );
  
  // Ensure output directory exists
  ensureDirSync('dist/assets/css');
  
  // Write bundled CSS
  writeFileSync('dist/assets/css/style.css', bundled);
  console.log('✓ CSS bundled');
}

// Apply base path to all URLs in HTML files
function applyBasePath(basePath) {
  if (!basePath) return;
  
  console.log(`\nApplying base path: ${basePath}`);
  
  const htmlFiles = glob.sync('dist/**/*.html');
  
  htmlFiles.forEach(file => {
    let content = readFileSync(file, 'utf8');
    
    // Replace URLs in src and href attributes that start with /
    content = content
      // Handle src="/..." and href="/..."
      .replace(/(src|href)="\/([^"]+)"/g, `$1="${basePath}/$2"`)
      // Handle root href="/" specifically
      .replace(/href="\/"/g, `href="${basePath}/"`);
    
    writeFileSync(file, content);
  });
  
  console.log(`✓ Base path applied to ${htmlFiles.length} HTML files`);
}

// Build function
async function build() {
  console.log('Building multilingual site...');
  
  // Check if we're in GitHub Actions and determine base path
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
  
  // Use CUSTOM_DOMAIN env var to determine if we're deploying to custom domain
  const basePath = process.env.CUSTOM_DOMAIN ? '' : (isGitHubActions && repoName ? `/${repoName}` : '');
  
  console.log(`Base path will be: "${basePath}" (applied at end)`);
  
  // Initialize image processor
  const imageProcessor = new ImageProcessor();
  
  // Ensure output directory exists
  ensureDirSync(buildConfig.outputPath);
  
  // Clean up old directories if they exist
  if (require('fs').existsSync('dist/pages')) {
    console.log('Cleaning up old pages directory...');
    require('fs-extra').removeSync('dist/pages');
  }
  
  // Create GitHub Pages files
  outputFileSync('dist/.nojekyll', '');
  // Create CNAME if custom domain is set
  if (process.env.CUSTOM_DOMAIN) {
    outputFileSync('dist/CNAME', process.env.CUSTOM_DOMAIN);
  }
  
  // Copy assets from src to public (excluding JS source files)
  console.log('Copying assets...');
  // CSS will be bundled, not copied
  copySync('src/assets/images', 'dist/assets/images', { overwrite: true });
  // JS will be bundled separately, not copied
  
  // Collect all content for AI endpoint
  const contentIndex = [];
  
  // Process each language
  languages.forEach(lang => {
    console.log(`\nProcessing ${lang} content...`);
    
    // Load language-specific site data
    const siteDataPath = `content/${lang}/data/site.json`;
    const navDataPath = `content/${lang}/data/navigation.json`;
    
    if (!require('fs').existsSync(siteDataPath)) {
      console.log(`Warning: No site data for ${lang}, skipping...`);
      return;
    }
    
    const siteData = JSON.parse(readFileSync(siteDataPath, 'utf8'));
    const navData = JSON.parse(readFileSync(navDataPath, 'utf8'));
    
    // Dynamically set copyright year
    const currentYear = new Date().getFullYear();
    if (siteData.copyright) {
      siteData.copyright = siteData.copyright.replace(/\d{4}/, currentYear);
    }
    
    // Process all markdown files for this language
    const teamMembers = [];
    
    glob.sync(`content/${lang}/**/*.md`).forEach(file => {
      const { data, content } = matter(readFileSync(file, 'utf8'));
      
      // Add language to frontmatter data
      data.lang = lang;
      
      // Replace absolute links in markdown content (no basePath needed during build)
      const langPrefix = lang === defaultLang ? '' : `/${lang}`;
      const processedContent = content.replace(/\]\(\//g, `](${langPrefix}/`);
      
      const html = marked.parse(processedContent);
      
      // Determine template based on path
      let template = 'page';
      if (file.includes('/products/')) template = 'product';
      if (file.includes('/news/')) template = 'news';
      
      // Collect team members for the team index
      if (file.includes('/team/members/') && file.endsWith('.md')) {
        teamMembers.push({
          ...data,
          slug: path.basename(file, '.md')
        });
        // Skip building individual team member pages
        return;
      }
      
      // Prepare data (no basePath!)
      const pageData = {
        ...siteData,
        ...data,
        content: html,
        navigation: navData,
        currentLang: lang,
        langPrefix: lang === defaultLang ? '' : `/${lang}`,
        isDefaultLang: lang === defaultLang,
        currentPath: file.replace(`content/${lang}/`, '').replace('pages/', '').replace('.md', '.html'),
        languages: languages,
        defaultLang: defaultLang
      };
      
      // Special handling for team index page
      if (file.endsWith('team/index.md')) {
        // Sort team members by order
        const sortedTeam = teamMembers.sort((a, b) => (a.order || 999) - (b.order || 999));
        
        // Generate team grid HTML
        const teamGrid = sortedTeam.map(member => `
          <div class="team-member">
            <img src="${member.photo}?size=300x300&format=jpg" alt="${member.name}" class="team-photo">
            <h3>${member.name}</h3>
            <p class="position">${member.position}</p>
            ${member.email ? `<p class="contact"><a href="mailto:${member.email}">${member.email}</a></p>` : ''}
            ${member.linkedin ? `<p class="social"><a href="${member.linkedin}" target="_blank">LinkedIn</a></p>` : ''}
          </div>
        `).join('');
        
        // Replace placeholder in content
        pageData.content = pageData.content.replace(
          '<!-- Team members will be automatically inserted here by the build script -->', 
          `<div class="team-grid">${teamGrid}</div>`
        );
      }
      
      // Special handling for about page to include team members
      if (file.endsWith('pages/about.md')) {
        // Sort team members by order
        const sortedTeam = teamMembers.sort((a, b) => (a.order || 999) - (b.order || 999));
        
        // Generate team grid HTML
        const teamGrid = sortedTeam.map(member => `
          <div class="team-member">
            <img src="${member.photo}?size=300x300&format=jpg" alt="${member.name}" class="team-photo">
            <h3>${member.name}</h3>
            <p class="position">${member.position}</p>
            ${member.email ? `<p class="contact"><a href="mailto:${member.email}">${member.email}</a></p>` : ''}
            ${member.phone ? `<p class="contact"><a href="tel:${member.phone}">${member.phone}</a></p>` : ''}
          </div>
        `).join('');
        
        // Replace placeholder in content
        pageData.content = pageData.content.replace(
          '<!-- Team members will be automatically inserted here by the build script -->', 
          `<div class="team-grid">${teamGrid}</div>`
        );
      }
      
      // Generate HTML
      const pageContent = templates[template](pageData);
      
      // Wrap in base template
      let fullPage = Handlebars.compile(readFileSync(path.join(__dirname, '../src/templates/layouts/base.html'), 'utf8'))({
        ...pageData,
        body: pageContent,
        isDevelopment: process.env.NODE_ENV === 'development'
      });
      
      // Extract image requirements from the final HTML
      imageProcessor.extractFromHtml(fullPage, file);
      
      // Replace image URLs with processed versions (no basePath yet!)
      fullPage = imageProcessor.replaceUrlsInHtml(fullPage);
      
      // Write file
      let outPath = file
        .replace('content/', 'dist/')
        .replace(`/${lang}/`, lang === defaultLang ? '/' : `/${lang}/`)
        .replace('.md', '.html');
      
      // Move pages to root level
      if (file.includes('/pages/')) {
        outPath = outPath.replace('/pages/', '/');
      }
      
      ensureDirSync(path.dirname(outPath));
      outputFileSync(outPath, fullPage);
      
      // Add to content index for AI
      contentIndex.push({
        path: file.replace('content/', ''),
        url: outPath.replace('public/', '/').replace('index.html', ''),
        type: template,
        lang: lang,
        ...data
      });
      
      console.log(`✓ Built: ${file} → ${outPath}`);
    });
  });
  
  // Write AI-friendly content index
  ensureDirSync('dist/api');
  outputFileSync('dist/api/content.json', JSON.stringify(contentIndex, null, 2));
  console.log('\n✓ Generated AI content index');
  
  // Process all collected images
  await imageProcessor.processAll();
  
  // Copy processed images to public
  if (require('fs').existsSync('.temp/images')) {
    console.log('\nCopying processed images...');
    copySync('.temp/images', 'dist/assets/images', { overwrite: true });
    console.log('✓ Copied processed images');
  }
  
  // Bundle JavaScript
  await bundleJavaScript();
  
  // Bundle CSS
  bundleCSS();
  
  // Apply base path to all URLs if needed
  if (basePath) {
    applyBasePath(basePath);
  }
  
  console.log('\nBuild complete!');
}

// Run build
build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
