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
  
  // Check if we're in GitHub Actions and determine base path
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
  
  // Use CUSTOM_DOMAIN env var to determine if we're deploying to custom domain
  const basePath = process.env.CUSTOM_DOMAIN ? '' : (isGitHubActions && repoName ? `/${repoName}` : '');
  
  console.log(`Base path: "${basePath}"`);
  
  // Ensure output directory exists
  ensureDirSync('public');
  
  // Clean up old pages directory if it exists
  if (require('fs').existsSync('public/pages')) {
    console.log('Cleaning up old pages directory...');
    require('fs-extra').removeSync('public/pages');
  }
  
  // Create GitHub Pages files
  outputFileSync('public/.nojekyll', '');
  // Create CNAME if custom domain is set
  if (process.env.CUSTOM_DOMAIN) {
    outputFileSync('public/CNAME', process.env.CUSTOM_DOMAIN);
  }
  
  // Copy assets from src to public
  console.log('Copying assets...');
  copySync('src/assets', 'public/assets', { overwrite: true });
  
  // Assets are already in public/assets, no copy needed
  
  // Collect all content for AI endpoint
  const contentIndex = [];
  
  // Process all markdown files
  glob.sync('content/**/*.md').forEach(file => {
    const { data, content } = matter(readFileSync(file, 'utf8'));
    
    // Replace absolute links in markdown content with basePath
    const processedContent = basePath ? 
      content.replace(/\]\(\//g, `](${basePath}/`) : 
      content;
    
    const html = marked.parse(processedContent);
    
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
