const glob = require('glob');
const path = require('path');
const { readFileSync, outputFileSync, copySync, ensureDirSync } = require('fs-extra');
const matter = require('gray-matter');
const marked = require('marked');
const Handlebars = require('handlebars');

// Supported languages
const languages = ['no', 'en'];
const defaultLang = 'no';

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

// Build function
function build() {
  console.log('Building multilingual site...');
  
  // Check if we're in GitHub Actions and determine base path
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
  
  // Use CUSTOM_DOMAIN env var to determine if we're deploying to custom domain
  const basePath = process.env.CUSTOM_DOMAIN ? '' : (isGitHubActions && repoName ? `/${repoName}` : '');
  
  console.log(`Base path: "${basePath}"`);
  
  // Ensure output directory exists
  ensureDirSync('public');
  
  // Clean up old directories if they exist
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
    
    // Process all markdown files for this language
    const teamMembers = [];
    
    glob.sync(`content/${lang}/**/*.md`).forEach(file => {
      const { data, content } = matter(readFileSync(file, 'utf8'));
      
      // Add language to frontmatter data
      data.lang = lang;
      
      // Replace absolute links in markdown content with basePath and language prefix
      const langPrefix = lang === defaultLang ? '' : `/${lang}`;
      const processedContent = content.replace(/\]\(\//g, `](${basePath}${langPrefix}/`);
      
      const html = marked.parse(processedContent);
      
      // Determine template based on path
      let template = 'page';
      if (file.includes('/products/')) template = 'product';
      if (file.includes('/news/')) template = 'news';
      
      // Collect team members for the team index
      if (file.includes('/team/') && !file.endsWith('index.md')) {
        teamMembers.push({
          ...data,
          slug: path.basename(file, '.md')
        });
      }
      
      // Prepare data
      const pageData = {
        ...siteData,
        ...data,
        content: html,
        navigation: navData,
        basePath: basePath,
        currentLang: lang,
        langPrefix: lang === defaultLang ? '' : `/${lang}`,
        isDefaultLang: lang === defaultLang,
        currentPath: file.replace(`content/${lang}/`, '').replace('.md', '.html').replace('/pages/', '/'),
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
            <img src="${basePath}${member.photo}" alt="${member.name}" class="team-photo">
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
  ensureDirSync('public/api');
  outputFileSync('public/api/content.json', JSON.stringify(contentIndex, null, 2));
  console.log('\n✓ Generated AI content index');
  
  console.log('\nBuild complete!');
}

// Run build
build();