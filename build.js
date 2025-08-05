const glob = require('glob');
const path = require('path');
const { readFileSync, outputFileSync, copySync, ensureDirSync } = require('fs-extra');
const matter = require('gray-matter');
const marked = require('marked');
const Handlebars = require('handlebars');

// Load templates
const baseTemplate = readFileSync('templates/base.html', 'utf8');
const templates = {
  page: Handlebars.compile(readFileSync('templates/page.html', 'utf8')),
  product: Handlebars.compile(readFileSync('templates/product.html', 'utf8')),
  news: Handlebars.compile(readFileSync('templates/news.html', 'utf8'))
};

// Register base template as partial
Handlebars.registerPartial('base', baseTemplate);

// Load site data
const siteData = JSON.parse(readFileSync('content/data/site.json', 'utf8'));
const navData = JSON.parse(readFileSync('content/data/navigation.json', 'utf8'));

// Build function
function build() {
  console.log('Building site...');
  
  // Ensure output directory exists
  ensureDirSync('public');
  
  // Copy assets
  copySync('public/assets', 'public/assets');
  
  // Collect all content for AI endpoint
  const contentIndex = [];
  
  // Process all markdown files
  glob.sync('content/**/*.md').forEach(file => {
    const { data, content } = matter(readFileSync(file, 'utf8'));
    const html = marked.parse(content);
    
    // Determine template based on path
    let template = 'page';
    if (file.includes('/products/')) template = 'product';
    if (file.includes('/news/')) template = 'news';
    
    // Prepare data
    const pageData = {
      ...siteData,
      ...data,
      content: html,
      navigation: navData
    };
    
    // Generate HTML
    const output = templates[template](pageData);
    
    // Write file
    const outPath = file
      .replace('content/', 'public/')
      .replace('.md', '.html');
    
    ensureDirSync(path.dirname(outPath));
    outputFileSync(outPath, output);
    
    // Add to content index for AI
    contentIndex.push({
      path: file.replace('content/', ''),
      url: outPath.replace('public/', '/').replace('index.html', ''),
      type: template,
      ...data
    });
    
    console.log(`✓ Built: ${file} → ${outPath}`);
  });
  
  // Write AI-friendly content index
  ensureDirSync('public/api');
  outputFileSync('public/api/content.json', JSON.stringify(contentIndex, null, 2));
  console.log('✓ Generated AI content index');
  
  console.log('Build complete!');
}

// Run build
build();
