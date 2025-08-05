const glob = require('glob');
const { readFileSync, writeFileSync, outputFileSync } = require('fs-extra');

/**
 * Apply deployment configuration to all HTML files
 * This includes both config injection and URL transformation
 * 
 * @param {Object} config - Deployment configuration
 * @param {string} config.basePath - Base path for URLs (e.g., '/website')
 * @param {string} config.customDomain - Custom domain if set
 * @param {string} config.environment - Build environment
 * @param {boolean} config.gitHubActions - Whether running in GitHub Actions
 */
function applyDeploymentConfig(config) {
  const { basePath = '', customDomain = null } = config;
  
  console.log(`\nApplying deployment configuration...`);
  if (basePath) {
    console.log(`- Base path: ${basePath}`);
  }
  if (customDomain) {
    console.log(`- Custom domain: ${customDomain}`);
  }
  
  const htmlFiles = glob.sync('dist/**/*.html');
  
  htmlFiles.forEach(file => {
    let content = readFileSync(file, 'utf8');
    
    // Extract page metadata from HTML
    const langMatch = content.match(/lang="([^"]+)"/);
    const lang = langMatch ? langMatch[1] : 'no';
    const isDefaultLang = lang === 'no';
    const langPrefix = isDefaultLang ? '' : `/${lang}`;
    
    // Create page-specific config merged with deployment config
    const pageConfig = {
      ...config,
      langPrefix: langPrefix,
      currentLang: lang,
      defaultLang: 'no',
      pageUrl: file.replace('dist/', '').replace('.html', '')
    };
    
    // Inject configuration
    const configScript = `
<script>
  window.ANTEO_CONFIG = ${JSON.stringify(pageConfig, null, 2)};
</script>
`;
    content = content.replace('</head>', `${configScript}</head>`);
    
    // Apply base path to URLs if needed
    if (basePath) {
      content = content
        .replace(/(src|href)="\/([^"]+)"/g, `$1="${basePath}/$2"`)
        .replace(/href="\/"/g, `href="${basePath}/"`)
        // Also handle background-image URLs in style attributes
        .replace(/background-image:\s*url\('\/([^']+)'\)/g, `background-image: url('${basePath}/$1')`);
    }
    
    writeFileSync(file, content);
  });
  
  console.log(`✓ Deployment config applied to ${htmlFiles.length} HTML files`);
}

/**
 * Create deployment-specific files
 * 
 * @param {Object} config - Deployment configuration
 */
function createDeploymentFiles(config) {
  const { customDomain } = config;
  
  // Create CNAME if custom domain is set
  if (customDomain) {
    outputFileSync('dist/CNAME', customDomain);
    console.log(`✓ Created CNAME file for ${customDomain}`);
  }
}

module.exports = {
  applyDeploymentConfig,
  createDeploymentFiles
};
