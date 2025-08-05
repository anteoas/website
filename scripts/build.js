const { buildSite } = require('./build-site');
const { applyBasePath, determineBasePath, createDeploymentFiles } = require('./deployment-transform');

/**
 * Main build orchestrator
 * 
 * This separates the build process into two distinct phases:
 * 1. Build the site with root-relative paths
 * 2. Apply deployment transforms (base path) if needed
 */
async function build() {
  try {
    // Phase 1: Build the site
    // This phase knows nothing about deployment targets or base paths
    await buildSite();
    
    // Phase 2: Deployment transforms
    // Only this phase knows about base paths
    const basePath = determineBasePath();
    createDeploymentFiles();
    
    if (basePath) {
      applyBasePath(basePath);
    }
    
    console.log('\nBuild complete!');
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

// Run build
build();
