/**
 * Main build orchestrator
 * 
 * This file coordinates the build process by:
 * 1. Running the site build (which knows nothing about deployment)
 * 2. Applying deployment-specific configuration and transforms
 * 
 * This separation ensures that build logic and deployment concerns
 * remain isolated, making the system more maintainable and testable.
 */

const { buildSite } = require('./build-site');
const { applyDeploymentConfig, createDeploymentFiles } = require('./deployment-transform');

/**
 * Determine the base path based on environment
 * 
 * @returns {string} The base path to use (empty string if none)
 */
function determineBasePath() {
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
  
  // Use CUSTOM_DOMAIN env var to determine if we're deploying to custom domain
  return process.env.CUSTOM_DOMAIN ? '' : (isGitHubActions && repoName ? `/${repoName}` : '');
}

/**
 * Main build orchestrator
 */
async function build() {
  try {
    // Phase 1: Build the site
    // This phase knows nothing about deployment targets or base paths
    await buildSite();
    
    // Phase 2: Determine deployment configuration
    const deploymentConfig = {
      basePath: determineBasePath(),
      customDomain: process.env.CUSTOM_DOMAIN || null,
      environment: process.env.NODE_ENV || 'production',
      gitHubActions: process.env.GITHUB_ACTIONS === 'true'
    };
    
    // Phase 3: Apply deployment configuration (URLs + config injection)
    applyDeploymentConfig(deploymentConfig);
    
    // Phase 4: Create deployment files
    createDeploymentFiles(deploymentConfig);
    
    console.log('\nBuild complete!');
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

// Run build
build();
