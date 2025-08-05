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

// Get latest news articles
function getLatestNews(lang, count = 3) {
  const newsDir = path.join(__dirname, `../content/${lang}/news`);
  if (!existsSync(newsDir)) {
    return [];
  }
  
  const newsFiles = glob.sync(`${newsDir}/*.md`)
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
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, count);
    
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
  landing: Handlebars.compile(readFileSync(path.join(__dirname, '../src/templates/pages/landing.html'), 'utf8'))
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
function processMarkdownFile(file, lang, siteData, navData, teamMembers, products) {
  const { data, content } = matter(readFileSync(file, 'utf8'));
  
  // Add language to frontmatter data
  data.lang = lang;
  
  // Replace absolute links in markdown content
  const langPrefix = getLangPrefix(lang);
  const processedContent = content.replace(/\]\(\//g, `](${langPrefix}/`);
  
  const html = marked.parse(processedContent);
  
  // Determine template based on path or layout
  let template = 'page';
  if (data.layout) {
    template = data.layout;
  } else {
    if (file.includes('/products/')) template = 'product';
    if (file.includes('/news/')) template = 'news';
  }
  
  // Prepare page data
  const pageData = {
    ...siteData,
    ...data,
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
    currentYear: new Date().getFullYear()
  };
  
  // Special handling for landing page
  if (template === 'landing') {
    // Move frontmatter data to nested structure
    pageData.landing = {
      hero1: data.hero1,
      aboutTeaser: data.aboutTeaser
    };
    
    // Load product groups
    pageData.productGroups = {
      logistics: loadProductGroup('logistics', lang),
      fishHealth: loadProductGroup('fish-health', lang)
    };
    
    // Get latest news
    pageData.latestNews = getLatestNews(lang, 3);
  }
  
  // Special handling for team and about pages
  if (file.endsWith('team/index.md') || file.endsWith('pages/about.md')) {
    const sortedTeam = teamMembers.sort((a, b) => (a.order || 999) - (b.order || 999));
    
    const teamGrid = sortedTeam.map(member => `
      <div class="team-member">
        <img src="${member.photo}?size=300x300&format=jpg" alt="${member.name}" class="team-photo">
        <h3>${member.name}</h3>
        <p class="position">${member.position}</p>
        ${member.email ? `<p class="contact"><a href="mailto:${member.email}">${member.email}</a></p>` : ''}
        ${file.endsWith('about.md') && member.phone ? `<p class="contact"><a href="tel:${member.phone}">${member.phone}</a></p>` : ''}
        ${file.endsWith('team/index.md') && member.linkedin ? `<p class="social"><a href="${member.linkedin}" target="_blank">LinkedIn</a></p>` : ''}
      </div>
    `).join('');
    
    pageData.content = pageData.content.replace(
      '<!-- Team members will be automatically inserted here by the build script -->', 
      `<div class="team-grid">${teamGrid}</div>`
    );
  }
  
  return { pageData, template };
}

// Main build function - knows nothing about base paths
async function buildSite() {
  console.log('Building multilingual site...');
  
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
    const siteDataPath = `content/${lang}/data/site.json`;
    
    if (!require('fs').existsSync(siteDataPath)) {
      console.log(`Warning: No site data for ${lang}, skipping...`);
      return;
    }
    
    const siteData = JSON.parse(readFileSync(siteDataPath, 'utf8'));
    const navData = loadNavigation(lang);  // Use the new function instead of loading JSON
    const products = loadProducts(lang);  // Load products for footer
    
    // Dynamically set copyright year
    const currentYear = new Date().getFullYear();
    if (siteData.copyright) {
      siteData.copyright = siteData.copyright.replace(/\d{4}/, currentYear);
    }
    
    // Process all markdown files for this language
    const teamMembers = [];
    
    // First pass: collect team members
    glob.sync(`content/${lang}/team/members/*.md`).forEach(file => {
      const { data } = matter(readFileSync(file, 'utf8'));
      teamMembers.push({
        ...data,
        slug: path.basename(file, '.md')
      });
    });
    
    // Second pass: process all other files
    glob.sync(`content/${lang}/**/*.md`).forEach(file => {
      // Skip team member individual pages
      if (file.includes('/team/members/') && file.endsWith('.md')) {
        return;
      }
      
      const { pageData, template } = processMarkdownFile(file, lang, siteData, navData, teamMembers, products);
      
      // Generate HTML
      const pageContent = templates[template](pageData);
      
      // Wrap in base template
      let fullPage = Handlebars.compile(readFileSync(path.join(__dirname, '../src/templates/layouts/base.html'), 'utf8'))({
        ...pageData,
        body: pageContent,
        currentPath: pageData.currentPath,
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
}

// Export the build function
module.exports = { buildSite };
