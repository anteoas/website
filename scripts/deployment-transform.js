const glob = require('glob');
const { readFileSync, writeFileSync } = require('fs-extra');

/**
 * Apply base path to all URLs in HTML files
 * This is a pure post-processing step that only modifies HTML files
 * 
 * @param {string} basePath - The base path to prepend to URLs (e.g., '/website')
 */
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

/**
 * Determine the base path based on environment
 * 
 * @returns {string} The base path to use (empty string if none)
 */
function determineBasePath() {
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
  
  // Use CUSTOM_DOMAIN env var to determine if we're deploying to custom domain
  const basePath = process.env.CUSTOM_DOMAIN ? '' : (isGitHubActions && repoName ? `/${repoName}` : '');
  
  console.log(`Base path will be: "${basePath}" (applied at end)`);
  
  return basePath;
}

/**
 * Create deployment-specific files
 */
function createDeploymentFiles() {
  const { outputFileSync } = require('fs-extra');
  
  // Create CNAME if custom domain is set
  if (process.env.CUSTOM_DOMAIN) {
    outputFileSync('dist/CNAME', process.env.CUSTOM_DOMAIN);
  }
}

module.exports = {
  applyBasePath,
  determineBasePath,
  createDeploymentFiles
};
