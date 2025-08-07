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

// Track missing translations
const missingTranslations = {};
languages.forEach(lang => missingTranslations[lang] = new Set());

// Register Handlebars helpers
Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('lookup', function(obj, key, prop) {
  if (arguments.length === 3) {
    // Two argument version: lookup obj key
    return obj && obj[key];
  } else {
    // Three argument version: lookup obj key prop
    return obj && obj[key] && obj[key][prop];
  }
});

// Translation helper with ### fallback
Handlebars.registerHelper('t', function(key, options) {
  const keys = key.split('.');
  
  // Helper function to get value from nested object
  function getValue(obj, keyPath) {
    let value = obj;
    for (const k of keyPath) {
      value = value?.[k];
    }
    return value;
  }
  
  // Try current context first
  let value = getValue(this, keys);
  
  // If not found and we have root context, try root
  if (!value && options?.data?.root) {
    value = getValue(options.data.root, keys);
  }
  
  if (!value || typeof value !== 'string') {
    // Determine language for tracking
    const lang = this.currentLang || this.lang || 
                 options?.data?.root?.currentLang || 
                 options?.data?.root?.lang || 
                 'unknown';
    
    if (missingTranslations[lang]) {
      missingTranslations[lang].add(key);
    }
    
    const fallback = `### ${key} ###`;
    
    // Add data attribute for dev mode highlighting
    const isDev = this.isDevelopment || options?.data?.root?.isDevelopment;
    if (isDev) {
      return new Handlebars.SafeString(
        `<span data-missing-translation="${key}">${fallback}</span>`
      );
    }
    return fallback;
  }
  
  return value;
});

// Register partials
Handlebars.registerPartial('news-card', readFileSync(path.join(__dirname, '../src/templates/partials/news-card.html'), 'utf8'));

// Helper to get language prefix
const getLangPrefix = (lang) => lang === defaultLang ? '' : `/${lang}`;

// Load site configuration from src/
function loadSiteConfig() {
  const configPath = path.join(__dirname, '../src/site-config.json');
  if (existsSync(configPath)) {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  }
  return {};
}

// Load and resolve navigation
function loadNavigation(lang) {
  const navPath = path.join(__dirname, '../src/navigation.json');
  if (!existsSync(navPath)) {
    return { main: [] };
  }
  
  const navStructure = JSON.parse(readFileSync(navPath, 'utf8'));
  const langPrefix = getLangPrefix(lang);
  
  // Resolve labels from content files
  const resolved = {
    main: navStructure.main.map(item => {
      const contentFile = path.join(__dirname, `../content/${lang}/${item.contentPath}.md`);
      if (existsSync(contentFile)) {
        const { data } = matter(readFileSync(contentFile, 'utf8'));
        const url = item.contentPath.replace('pages/', '');
        return {
          label: data.title || 'Untitled',
          url: `${langPrefix}/${url}.html`
        };
      }
      return null;
    }).filter(Boolean)
  };
  
  return resolved;
}

// Load product group data
function loadProductGroup(groupName, lang) {
  const filePath = path.join(__dirname, `../content/${lang}/product-groups/${groupName}.md`);
  if (existsSync(filePath)) {
    const { data } = matter(readFileSync(filePath, 'utf8'));
    const langPrefix = getLangPrefix(lang);
    return {
      ...data,
      link: data.link ? `${langPrefix}${data.link}` : '#'
    };
  }
  return null;
}

// Get news articles
function getNews(lang, options = {}) {
  const { limit = null, sortOrder = 'desc' } = options;
  const newsDir = path.join(__dirname, `../content/${lang}/news`);
  if (!existsSync(newsDir)) {
    return [];
  }
  
  let newsFiles = glob.sync(`${newsDir}/*.md`)
    .filter(file => !file.endsWith('index.md'))
    .map(file => {
      const { data } = matter(readFileSync(file, 'utf8'));
      const filename = path.basename(file, '.md');
      const langPrefix = getLangPrefix(lang);
      
      return {
        ...data,
        slug: filename,
        url: `${langPrefix}/news/${filename}.html`,
        date: data.date || filename.substring(0, 10) // Extract date from filename if not in frontmatter
      };
    });
    
  // Sort by date
  newsFiles.sort((a, b) => {
    const comparison = new Date(b.date) - new Date(a.date);
    return sortOrder === 'desc' ? comparison : -comparison;
  });
  
  // Apply limit if specified
  if (limit) {
    newsFiles = newsFiles.slice(0, limit);
  }
  
  return newsFiles;
}

// Load product data for footer
function loadProducts(lang) {
  const productsDir = path.join(__dirname, `../content/${lang}/products`);
  const products = {};
  
  ['logistics', 'fish-health'].forEach(category => {
    const categoryDir = path.join(productsDir, category);
    if (!existsSync(categoryDir)) {
      products[category] = [];
      return;
    }
    
    products[category] = glob.sync(`${categoryDir}/*.md`).map(file => {
      const { data } = matter(readFileSync(file, 'utf8'));
      const slug = path.basename(file, '.md');
      return { title: data.title, slug };
    });
  });
  
  return products;
}

// Load templates
const templates = {
  page: Handlebars.compile(readFileSync(path.join(__dirname, '../src/templates/pages/page.html'), 'utf8')),
  product: Handlebars.compile(readFileSync(path.join(__dirname, '../src/templates/pages/product.html'), 'utf8')),
  news: Handlebars.compile(readFileSync(path.join(__dirname, '../src/templates/pages/news.html'), 'utf8')),
  landing: Handlebars.compile(readFileSync(path.join(__dirname, '../src/templates/pages/landing.html'), 'utf8')),
  newsListing: Handlebars.compile(readFileSync(path.join(__dirname, '../src/templates/pages/news-listing.html'), 'utf8'))
};

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
    
    console.log('✓ JavaScript bundled successfully');
  } catch (error) {
    console.error('✗ JavaScript bundling failed:', error);
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

// Process a single markdown file
function processMarkdownFile(file, lang, data, navData, teamMembers, products) {
  const { data: frontmatter, content } = matter(readFileSync(file, 'utf8'));
  
  // Validate frontmatter properties
  const allowedProperties = {
    'news': ['title', 'description', 'date', 'author', 'category', 'image', 'excerpt', 'layout'],
    'team': ['name', 'position', 'email', 'phone', 'photo', 'order', 'linkedin'],
    'products': ['title', 'description', 'layout', 'hero', 'features', 'category'],
    'productGroups': ['title', 'description', 'layout', 'landingDescription', 'link', 'linkText', 'image'],
    'landing': ['title', 'description', 'layout', 'hero1', 'aboutTeaser'],
    'default': ['title', 'description', 'layout']
  };
  
  // Detect content type
  let contentType = 'default';
  if (file.includes('/news/')) contentType = 'news';
  else if (file.includes('/team/members/')) contentType = 'team';
  else if (file.includes('/products/')) contentType = 'products';
  else if (file.includes('/product-groups/')) contentType = 'productGroups';
  else if (file.endsWith('/index.md')) contentType = 'landing';
  
  const allowed = allowedProperties[contentType] || allowedProperties.default;
  const unused = Object.keys(frontmatter).filter(key => !allowed.includes(key));
  
  if (unused.length > 0) {
    console.warn(`⚠️  Unused frontmatter in ${file}: ${unused.join(', ')}`);
  }
  
  // Add language to frontmatter data
  frontmatter.lang = lang;
  
  // Replace absolute links in markdown content
  const langPrefix = getLangPrefix(lang);
  let processedContent = content.replace(/\]\(\//g, `](${langPrefix}/`);
  
  // Process custom container syntax (:::) - must be done BEFORE marked.parse
  // Process hero blocks first
  processedContent = processedContent.replace(
    /:::\s*hero\s+([^\s]+)(?:\s+(.+))?\n([\s\S]*?)\n:::/gm,
    (match, imagePath, cssString, content) => {
      const heroText = content.trim();
      let styles = '';
      
      if (cssString) {
        // Parse CSS properties
        styles = cssString.trim();
        
        // If no background-image URL is in the CSS, add the image path
        if (!styles.includes('url(')) {
          // Add the image to the end of any gradient
          if (styles.includes('background-image:')) {
            styles = styles.replace(
              /background-image:([^;]+)/,
              `background-image:$1, url('${imagePath}')`
            );
          } else {
            // No background-image property, add it
            styles = `background-image: url('${imagePath}'); ${styles}`;
          }
        }
      } else {
        // No CSS provided, just use the image
        styles = `background-image: url('${imagePath}')`;
      }
      
      // Create a placeholder to prevent marked from parsing it
      return `<!--HERO_BLOCK_START-->${styles}|${heroText}<!--HERO_BLOCK_END-->`;
    }
  );
  
  // Process value blocks
  processedContent = processedContent.replace(
    /:::\s*value-block\n([\s\S]*?)\n:::/gm,
    (match, innerContent) => {
      // First, temporarily replace the content with a placeholder to prevent marked from parsing it
      const placeholder = `<!--VALUE_BLOCK_START-->${innerContent}<!--VALUE_BLOCK_END-->`;
      return placeholder;
    }
  );
  
  // Parse markdown
  let html = marked.parse(processedContent);
  
  // Process hero block placeholders
  html = html.replace(
    /<!--HERO_BLOCK_START-->([^|]+)\|([^<]+)<!--HERO_BLOCK_END-->/g,
    (match, styles, heroText) => {
      return `<section class="hero-headline page-hero" style="${styles}">
  <div class="container">
    <div class="hero-content">
      <h1>${heroText}</h1>
    </div>
  </div>
</section>`;
    }
  );
  
  // Now process the value block placeholders
  html = html.replace(
    /<!--VALUE_BLOCK_START-->([\s\S]*?)<!--VALUE_BLOCK_END-->/g,
    (match, innerContent) => {
      // Parse the inner content as markdown
      const innerHtml = marked.parse(innerContent.trim());
      
      // Extract image and content
      const imgMatch = innerHtml.match(/<img[^>]+>/);
      const imgTag = imgMatch ? imgMatch[0] : '';
      const contentHtml = imgMatch ? innerHtml.replace(imgMatch[0], '').trim() : innerHtml;
      
      return `<div class="value-block">
${imgTag}
<div class="value-content">
${contentHtml}
</div>
</div>`;
    }
  );
  
  // Determine template based on path or layout
  let template = 'page';
  if (frontmatter.layout) {
    // Convert kebab-case to camelCase for template lookup
    template = frontmatter.layout.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  } else {
    if (file.includes('/products/')) template = 'product';
    if (file.includes('/news/')) template = 'news';
  }
  
  // Prepare page data
  const pageData = {
    ...data,  // All data from data.json (site, contact, strings, etc.)
    ...frontmatter,  // Frontmatter overrides
    content: html,
    navigation: navData,
    currentLang: lang,
    langPrefix: langPrefix,
    isDefaultLang: lang === defaultLang,
    currentPath: file.replace(`content/${lang}/`, '').replace('pages/', '').replace('.md', '.html'),
    languages: languages,
    languageConfig: buildConfig.languageConfig,
    defaultLang: defaultLang,
    siteConfig: loadSiteConfig(),
    products: products, // Add products for footer
    currentYear: new Date().getFullYear(),
    isDevelopment: process.env.NODE_ENV === 'development'
  };
  
  // Special handling for landing page
  if (template === 'landing') {
    // Move frontmatter data to nested structure
    pageData.landing = {
      hero1: frontmatter.hero1,
      aboutTeaser: frontmatter.aboutTeaser
    };
    
    // Load product groups
    pageData.productGroups = {
      logistics: loadProductGroup('logistics', lang),
      fishHealth: loadProductGroup('fish-health', lang)
    };
    
    // Get latest news
    pageData.latestNews = getNews(lang, { limit: 3 });
  }
  
  // Special handling for news listing page
  if (template === 'newsListing') {
    pageData.allNews = getNews(lang); // No limit - get all news
  }
  
  // Special handling for team and about pages
  if (file.endsWith('team/index.md') || file.endsWith('pages/about.md')) {
    const sortedTeam = teamMembers.sort((a, b) => (a.order || 999) - (b.order || 999));
    
    const teamGrid = sortedTeam.map(member => `
      <div class="team-member">
        <div class="team-card">
          <div class="team-image" style="background-image: url('${member.photo}?size=400x600&format=jpg')"></div>
          <div class="team-content">
            <h3>${member.name}</h3>
            <p class="position">${member.position}</p>
            ${member.bio ? `<p class="bio">${member.bio}</p>` : ''}
            <div class="contact-info">
              ${member.email ? `<p><strong>E-post:</strong> <a href="mailto:${member.email}">${member.email}</a></p>` : ''}
              ${member.phone ? `<p><strong>Tel:</strong> <a href="tel:${member.phone}">${member.phone}</a></p>` : ''}
              ${file.endsWith('team/index.md') && member.linkedin ? `<p><a href="${member.linkedin}" target="_blank">LinkedIn</a></p>` : ''}
            </div>
          </div>
        </div>
      </div>
    `).join('');
    
    pageData.content = pageData.content.replace(
      '<!-- Team members will be automatically inserted here by the build script -->', 
      `<div class="team-section"><div class="team-section-inner"><div class="team-grid">${teamGrid}</div></div></div>`
    );
  }
  
  return { pageData, template };
}

// Extract theme colors from CSS
function extractThemeColors() {
  const cssPath = path.join(__dirname, '../src/assets/css/style.css');
  const cssContent = readFileSync(cssPath, 'utf8');
  
  const colors = {};
  
  // Extract CSS variables if defined
  const rootVarsMatch = cssContent.match(/:root\s*\{([^}]*)\}/);
  if (rootVarsMatch) {
    const varMatches = rootVarsMatch[1].matchAll(/--([^:]+):\s*([^;]+);/g);
    for (const [, name, value] of varMatches) {
      colors[name.trim()] = value.trim();
    }
  }
  
  // Extract header background (handles various CSS formats)
  const headerMatch = cssContent.match(
    /header\s*\{[^}]*background(?:-color)?:\s*([^;]+);/
  );
  
  if (headerMatch) {
    let bgColor = headerMatch[1].trim();
    
    // If it's a CSS variable reference, resolve it
    if (bgColor.startsWith('var(--')) {
      const varName = bgColor.match(/var\(--([^)]+)\)/)?.[1];
      bgColor = colors[varName] || bgColor;
    }
    
    colors.headerBackground = bgColor;
  }
  
  // Fallback to hardcoded value if not found
  colors.headerBackground = colors.headerBackground || '#112a38';
  
  console.log('✓ Extracted theme colors:', colors.headerBackground);
  
  return colors;
}

// Main build function - knows nothing about base paths
async function buildSite() {
  console.log('Building multilingual site...');
  
  // Extract theme colors from CSS
  const themeColors = extractThemeColors();
  
  // Create global template data
  const globalTemplateData = {
    themeColors: themeColors,
    siteConfig: loadSiteConfig(),
    currentYear: new Date().getFullYear()
  };
  
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
  
  // Copy assets
  console.log('Copying assets...');
  ensureDirSync('dist/assets/images');
  copySync('src/assets/images', 'dist/assets/images', { overwrite: true });
  
  // Collect all content for AI endpoint
  const contentIndex = [];
  
  // Process each language
  languages.forEach(lang => {
    console.log(`\nProcessing ${lang} content...`);
    
    // Load language-specific site data
    const dataPath = `content/${lang}/data/data.json`;
    
    if (!require('fs').existsSync(dataPath)) {
      console.log(`Warning: No data.json for ${lang}, skipping...`);
      return;
    }
    
    const data = JSON.parse(readFileSync(dataPath, 'utf8'));
    const navData = loadNavigation(lang);  // Use the new function instead of loading JSON
    const products = loadProducts(lang);  // Load products for footer
    
    // Dynamically set copyright year
    const currentYear = new Date().getFullYear();
    if (data.site?.copyright) {
      data.site.copyright = data.site.copyright.replace(/\d{4}/, currentYear);
    }
    
    // Process all markdown files for this language
    const teamMembers = [];
    
    // First pass: collect team members
    glob.sync(`content/${lang}/team/members/*.md`).forEach(file => {
      const { data, content } = matter(readFileSync(file, 'utf8'));
      teamMembers.push({
        ...data,
        bio: content.trim(), // Add the content as bio
        slug: path.basename(file, '.md')
      });
    });
    
    // Second pass: process all other files
    glob.sync(`content/${lang}/**/*.md`).forEach(file => {
      // Skip team member individual pages
      if (file.includes('/team/members/') && file.endsWith('.md')) {
        return;
      }
      
      const { pageData, template } = processMarkdownFile(file, lang, data, navData, teamMembers, products);
      
      // Generate HTML
      const pageContent = templates[template](pageData);
      
      // Wrap in base template
      let fullPage = Handlebars.compile(readFileSync(path.join(__dirname, '../src/templates/layouts/base.html'), 'utf8'))({
        ...globalTemplateData,  // Global data first
        ...pageData,           // Page-specific data (can override if needed)
        body: pageContent,
        currentPath: pageData.currentPath,
        layout: template,      // Pass the template name as layout
        isDevelopment: process.env.NODE_ENV === 'development'
      });
      
      // Extract image requirements from the final HTML
      imageProcessor.extractFromHtml(fullPage, file);
      
      // Replace image URLs with processed versions
      fullPage = imageProcessor.replaceUrlsInHtml(fullPage);
      
      // Add to content index
      contentIndex.push({
        title: pageData.title,
        description: pageData.description,
        content: pageData.content.replace(/<[^>]*>?/gm, ''), // Strip HTML
        url: `${pageData.langPrefix}/${pageData.currentPath}`.replace(/\/+/g, '/'),
        language: lang,
        type: template,
        date: pageData.date || null
      });
      
      // Determine output path
      let outputPath;
      const relativePath = file.replace(`content/${lang}/`, '').replace('.md', '.html');
      
      if (file.includes('/pages/')) {
        const pageName = relativePath.replace('pages/', '');
        outputPath = lang === defaultLang 
          ? `dist/${pageName}`
          : `dist/${lang}/${pageName}`;
      } else {
        outputPath = lang === defaultLang
          ? `dist/${relativePath}`
          : `dist/${lang}/${relativePath}`;
      }
      
      // Ensure directory exists
      ensureDirSync(path.dirname(outputPath));
      
      // Write file
      outputFileSync(outputPath, fullPage);
      console.log(`✓ Built: ${file} → ${outputPath}`);
    });
  });
  
  // Generate AI content endpoint
  ensureDirSync('dist/api');
  outputFileSync('dist/api/content.json', JSON.stringify(contentIndex, null, 2));
  console.log('\n✓ Generated AI content index');
  
  // Process images
  await imageProcessor.processAll();
  
  // Copy processed images if any
  if (require('fs').existsSync('.temp/images')) {
    console.log('\nCopying processed images...');
    copySync('.temp/images', 'dist/assets/images', { overwrite: true });
    console.log('✓ Copied processed images');
  }
  
  // Bundle JavaScript
  await bundleJavaScript();
  
  // Bundle CSS
  bundleCSS();
  
  // Report missing translations
  const hasAnyMissing = Object.values(missingTranslations).some(set => set.size > 0);
  if (hasAnyMissing) {
    console.log('\n⚠️  Missing Translations:');
    for (const [lang, keys] of Object.entries(missingTranslations)) {
      if (keys.size > 0) {
        console.log(`  ${lang}: ${Array.from(keys).join(', ')}`);
      }
    }
  }
}

// Export the build function
module.exports = { buildSite };
