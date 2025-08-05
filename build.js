const glob = require('glob');
const path = require('path');
const { readFileSync, outputFileSync, copySync, ensureDirSync } = require('fs-extra');
const matter = require('gray-matter');
const marked = require('marked');
const Handlebars = require('handlebars');

// Load templates
const templates = {
  page: Handlebars.compile(readFileSync('templates/page.html', 'utf8')),
  product: Handlebars.compile(readFileSync('templates/product.html', 'utf8')),
  news: Handlebars.compile(readFileSync('templates/news.html', 'utf8'))
};

// Helper to wrap content in base template
function wrapInBase(content, data) {
  const baseTemplate = readFileSync('templates/base.html', 'utf8');
  return baseTemplate.replace('{{{body}}}', content);
}

// Load site data
const siteData = JSON.parse(readFileSync('content/data/site.json', 'utf8'));
const navData = JSON.parse(readFileSync('content/data/navigation.json', 'utf8'));

// Build function
function build() {
  console.log('Building site...');
  
  // Check if we're in GitHub Actions
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
  
  // Determine base path for URLs
  const basePath = isGitHubActions && repoName && !process.env.CUSTOM_DOMAIN 
    ? `/${repoName}` 
    : '';
  
  console.log(`Base path: "${basePath}"`);
  
  // Ensure output directory exists
  ensureDirSync('public');
  
  // Create GitHub Pages files
  outputFileSync('public/.nojekyll', '');
  // Don't create CNAME until ready to deploy to anteo.no
  // outputFileSync('public/CNAME', 'anteo.no');
  
  // Assets are already in public/assets, no copy needed
  
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
      navigation: navData,
      basePath: basePath  // Add base path for templates
    };
    
    // Generate HTML
    const pageContent = templates[template](pageData);
    
    // Wrap in base template
    const fullPage = Handlebars.compile(readFileSync('templates/base.html', 'utf8'))({
      ...pageData,
      body: pageContent
    });
    
    // Write file
    let outPath = file
      .replace('content/', 'public/')
      .replace('.md', '.html');
    
    // Special handling for index page
    if (file === 'content/pages/index.md') {
      // Also create a copy at root
      const rootIndex = 'public/index.html';
      ensureDirSync(path.dirname(rootIndex));
      outputFileSync(rootIndex, fullPage);
      console.log(`✓ Created root index: ${rootIndex}`);
    }
    
    ensureDirSync(path.dirname(outPath));
    outputFileSync(outPath, fullPage);
    
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
