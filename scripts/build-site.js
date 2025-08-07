/**
 * Simplified content-type based site builder
 * 
 * 1. Load all content once
 * 2. Check which types should render
 * 3. Render each item, passing the full content store
 */

const { ensureDirSync, readFileSync, outputFileSync, copySync, existsSync } = require('fs-extra');
const path = require('path');
const glob = require('glob');
const Handlebars = require('handlebars');
const marked = require('marked');
const matter = require('gray-matter');

const buildConfig = require('../config/build.config');
const ImageProcessor = require('./utils/image-processor');
const { bundleCSS } = require('./css-bundler');
const { bundleJS } = require('./js-bundler');

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true
});

// Register Handlebars helpers
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('contains', (arr, val) => arr && arr.includes(val));
Handlebars.registerHelper('t', function(key, options) {
  const keys = key.split('.');
  let value = options.data.root || this;
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
});

// Helper to get content by type
Handlebars.registerHelper('getContent', function(type) {
  return this.contentStore?.[type] || [];
});

// Helper to sort content
Handlebars.registerHelper('sortBy', function(array, key) {
  if (!Array.isArray(array)) return [];
  return array.sort((a, b) => {
    const aVal = a[key] || 999;
    const bVal = b[key] || 999;
    return aVal - bVal;
  });
});

// Helper to filter content
Handlebars.registerHelper('filterBy', function(array, key, value) {
  if (!Array.isArray(array)) return [];
  return array.filter(item => {
    const val = item[key];
    return val === value;
  });
});

// Template cache
const templates = {};

/**
 * Load all templates
 */
function loadTemplates() {
  // Load layouts
  const layoutFiles = glob.sync('src/templates/layouts/*.html');
  layoutFiles.forEach(file => {
    const name = path.basename(file, '.html');
    const content = readFileSync(file, 'utf8');
    templates[`layout-${name}`] = Handlebars.compile(content);
  });
  
  // Load page templates
  const pageFiles = glob.sync('src/templates/pages/*.html');
  pageFiles.forEach(file => {
    const name = path.basename(file, '.html');
    const content = readFileSync(file, 'utf8');
    templates[name] = Handlebars.compile(content);
  });
  
  // Load and register partials
  const partialFiles = glob.sync('src/templates/partials/*.html');
  partialFiles.forEach(file => {
    const name = path.basename(file, '.html');
    const content = readFileSync(file, 'utf8');
    Handlebars.registerPartial(name, content);
  });
  
  console.log(`Loaded ${Object.keys(templates).length} templates`);
}

/**
 * Load all markdown content for a language
 */
function loadAllContent(lang) {
  const content = {};
  const files = glob.sync(`content/${lang}/**/*.md`);
  
  files.forEach(file => {
    try {
      const { data: frontmatter, content: body } = matter(readFileSync(file, 'utf8'));
      
      if (!frontmatter.type) {
        console.warn(`No type specified in ${file}`);
        return;
      }
      
      const item = {
        file,
        type: frontmatter.type,
        slug: path.basename(file, '.md'),
        ...frontmatter,  // Spread frontmatter fields at top level
        content: body,   // Markdown content
        lang
      };
      
      // Group by type
      if (!content[item.type]) {
        content[item.type] = [];
      }
      content[item.type].push(item);
      
    } catch (err) {
      console.error(`Error loading ${file}:`, err);
    }
  });
  
  // Log what we loaded
  console.log(`Loaded ${files.length} files:`);
  Object.entries(content).forEach(([type, items]) => {
    console.log(`  - ${type}: ${items.length} items`);
  });
  
  return content;
}

/**
 * Load site data for a language
 */
function loadSiteData(lang) {
  const sitePath = path.join('content', lang, 'site.json');
  if (!existsSync(sitePath)) {
    throw new Error(`Site data not found: ${sitePath}`);
  }
  
  const siteData = JSON.parse(readFileSync(sitePath, 'utf8'));
  const langPrefix = lang === 'no' ? '' : `/${lang}`;
  
  // Resolve navigation if needed
  if (siteData.navigation?.main) {
    siteData.navigation.main = siteData.navigation.main.map(item => {
      if (item.contentPath) {
        const contentFile = path.join('content', lang, `${item.contentPath}.md`);
        if (existsSync(contentFile)) {
          const { data } = matter(readFileSync(contentFile, 'utf8'));
          const url = item.contentPath.replace('pages/', '');
          return {
            label: data.title || 'Untitled',
            url: `${langPrefix}/${url}.html`
          };
        }
      }
      return item;
    }).filter(Boolean);
  }
  
  // Add current year for copyright
  siteData.currentYear = new Date().getFullYear();
  if (siteData.copyright) {
    siteData.copyright = siteData.copyright.replace(/\d{4}/, siteData.currentYear);
  }
  
  return siteData;
}

/**
 * Process markdown with custom blocks
 */
function processMarkdown(content) {
  let processedContent = content;
  
  // Process hero blocks
  processedContent = processedContent.replace(
    /:::\s*hero\s+([^\s]+)(?:\s+(.+))?\n([\s\S]*?)\n:::/gm,
    (match, imagePath, cssString, heroText) => {
      const text = heroText.trim();
      let styles = '';
      
      if (cssString) {
        styles = cssString.trim();
        if (!styles.includes('url(')) {
          if (styles.includes('background-image:')) {
            styles = styles.replace(
              /background-image:([^;]+)/,
              `background-image:$1, url('${imagePath}')`
            );
          } else {
            styles = `background-image: url('${imagePath}'); ${styles}`;
          }
        }
      } else {
        styles = `background-image: url('${imagePath}')`;
      }
      
      return `<div class="hero" style="${styles}">
        <div class="hero-content">
          <div class="container">
            <h1>${text}</h1>
          </div>
        </div>
      </div>`;
    }
  );
  
  // Process value blocks
  processedContent = processedContent.replace(
    /:::\s*value-block\n([\s\S]*?)\n:::/gm,
    (match, content) => {
      const lines = content.trim().split('\n');
      const items = [];
      let currentItem = null;
      
      lines.forEach(line => {
        if (line.startsWith('### ')) {
          if (currentItem) items.push(currentItem);
          currentItem = {
            title: line.substring(4),
            content: []
          };
        } else if (currentItem && line.trim()) {
          currentItem.content.push(line);
        }
      });
      
      if (currentItem) items.push(currentItem);
      
      return items.map(item => 
        `<div class="value-item">
          <h3>${item.title}</h3>
          <p>${item.content.join(' ')}</p>
        </div>`
      ).join('');
    }
  );
  
  // Convert to HTML
  return marked.parse(processedContent);
}

/**
 * Extract theme colors from CSS
 */
function extractThemeColors() {
  const cssPath = path.join('src', 'assets', 'css', 'style.css');
  const cssContent = readFileSync(cssPath, 'utf8');
  
  const colors = {};
  const headerMatch = cssContent.match(/header[^{]*\{[^}]*background(?:-color)?:\s*([^;]+);/);
  if (headerMatch) {
    colors.headerBackground = headerMatch[1].trim();
  }
  
  return colors.headerBackground || '#00529c';
}

/**
 * Render a single content item
 */
function renderItem(item, contentStore, siteData, langPrefix, imageProcessor) {
  const { type, content } = item;
  const renderConfig = buildConfig.renders[type];
  
  if (!renderConfig) {
    console.error(`No render config for type: ${type}`);
    return null;
  }
  
  // Get URL and template
  const url = renderConfig.generateUrl(item, langPrefix);
  const templateName = renderConfig.getTemplate(item);
  const template = templates[templateName];
  
  if (!template) {
    console.error(`Template not found: ${templateName}`);
    return null;
  }
  
  // Process markdown
  const htmlContent = processMarkdown(content);
  
  // Build page data
  const pageData = {
    ...item,  // Spread all item properties (includes former frontmatter fields)
    content: htmlContent,  // Override with processed HTML
    ...siteData,
    contentStore, // Pass entire content store
    langPrefix,
    currentPath: url,
    layout: templateName, // For body class
    // Add language config for language switcher
    languageConfig: buildConfig.languageConfig,
    currentLang: item.lang,
    defaultLang: buildConfig.defaultLanguage
  };
  
  // Add back link if configured
  if (renderConfig.backLink) {
    pageData.backLink = {
      url: `${langPrefix}${renderConfig.backLink.url}`,
      text: siteData.strings?.[renderConfig.backLink.textKey] || 'Back'
    };
  }
  
  // Special handling for specific templates
  if (templateName === 'landing') {
    // Add latest news
    const articles = contentStore.article || [];
    pageData.latestNews = articles
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3)
      .map(article => ({
        ...article,
        url: buildConfig.renders.article.generateUrl(article, langPrefix)
      }));
    
    // Add product groups
    const pages = contentStore.page || [];
    const productCollections = pages.filter(p => p.template === 'product-collection');
    
    // Create productGroups object for landing page
    pageData.productGroups = {};
    productCollections.forEach(page => {
      if (page.collection === 'logistics') {
        pageData.productGroups.logistics = {
          ...page,
          link: buildConfig.renders.page.generateUrl(page, langPrefix),
          linkText: 'Les mer →',
          image: '/assets/images/logistics-placeholder.jpg',
          landingDescription: page.description || 'Komplett løsning for fartøyovervåkning og logistikk.'
        };
      } else if (page.collection === 'fish-health') {
        pageData.productGroups.fishHealth = {
          ...page,
          link: buildConfig.renders.page.generateUrl(page, langPrefix),
          linkText: 'Les mer →',
          image: '/assets/images/fish-health-placeholder.jpg',
          landingDescription: page.description || 'Digital journalføring og registrering av fiskevelferd.'
        };
      }
    });
  }
  
  if (templateName === 'team') {
    // Sort team members
    const people = contentStore.person || [];
    pageData.teamMembers = people.sort((a, b) => 
      (a.order || 999) - (b.order || 999)
    );
  }
  
  if (templateName === 'news-listing') {
    // Add all articles
    const articles = contentStore.article || [];
    pageData.articles = articles
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(article => ({
        ...article,
        url: buildConfig.renders.article.generateUrl(article, langPrefix)
      }));
  }
  
  if (templateName === 'product-collection') {
    // Get products for this collection
    const collection = item.collection;
    const products = contentStore.product || [];
    pageData.products = products
      .filter(p => p.category === collection)
      .map(product => ({
        ...product,
        url: buildConfig.renders.product.generateUrl(product, langPrefix)
      }));
  }
  
  // Render page template
  const pageHtml = template(pageData);
  
  // Wrap in base layout
  const layout = templates['layout-base'];
  if (!layout) {
    console.error('Base layout not found');
    return { url, html: pageHtml };
  }
  
  const finalHtml = layout({
    ...pageData,
    body: pageHtml,
    themeColors: { headerBackground: extractThemeColors() }
  });
  
  // Extract and process images
  imageProcessor.extractFromHtml(finalHtml, item.file);
  const processedHtml = imageProcessor.replaceUrlsInHtml(finalHtml);
  
  return { url, html: processedHtml };
}

/**
 * Main build function
 */
async function buildSite() {
  console.log('Building site...\n');
  
  // Clean and setup
  ensureDirSync('dist');
  
  // Load templates
  loadTemplates();
  
  // Initialize image processor
  const imageProcessor = new ImageProcessor();
  
  // Bundle assets
  console.log('\nBundling assets...');
  bundleCSS();
  await bundleJS();
  
  // Copy static assets
  console.log('Copying static assets...');
  copySync('src/assets/images', 'dist/assets/images');
  if (existsSync('src/assets/fonts')) {
    copySync('src/assets/fonts', 'dist/assets/fonts');
  }
  
  // Process each language
  for (const lang of buildConfig.languages) {
    console.log(`\nBuilding ${lang}...`);
    
    // Check if content exists
    const sitePath = path.join('content', lang, 'site.json');
    if (!existsSync(sitePath)) {
      console.log(`  No content found for ${lang}, skipping...`);
      continue;
    }
    
    try {
      // Load site data
      const siteData = loadSiteData(lang);
      const langPrefix = lang === 'no' ? '' : `/${lang}`;
      
      // Load ALL content
      const contentStore = loadAllContent(lang);
      
      // Render each content type that has a render definition
      let totalRendered = 0;
      
      for (const [type, renderConfig] of Object.entries(buildConfig.renders)) {
        const items = contentStore[type] || [];
        if (items.length === 0) continue;
        
        console.log(`\nRendering ${items.length} ${type} items...`);
        
        items.forEach(item => {
          try {
            const result = renderItem(item, contentStore, siteData, langPrefix, imageProcessor);
            if (!result) {
              console.error(`Failed to render: ${item.file}`);
              return;
            }
            
            // Write file
            const outputPath = `dist${result.url}`;
            const outputDir = path.dirname(outputPath);
            ensureDirSync(outputDir);
            outputFileSync(outputPath, result.html);
            
            console.log(`  ✓ ${result.url}`);
            totalRendered++;
            
          } catch (err) {
            console.error(`Error rendering ${item.file}:`, err);
          }
        });
      }
      
      console.log(`\nRendered ${totalRendered} pages for ${lang}`);
      
    } catch (err) {
      console.error(`Error building ${lang}:`, err);
    }
  }
  
  // Process images
  console.log('\nProcessing images...');
  await imageProcessor.processAll();
  
  // Copy processed images from temp to dist
  if (existsSync('.temp/images')) {
    console.log('\nCopying processed images...');
    copySync('.temp/images', 'dist/assets/images', { overwrite: true });
    console.log('✓ Copied processed images');
  }
  
  console.log('\n✨ Build complete!');
}

// Export for use in build.js
module.exports = { buildSite };

// Allow direct execution
if (require.main === module) {
  buildSite().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
}
