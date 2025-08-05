/**
 * Main build orchestrator
 * 
 * This file coordinates the build process by:
 * 1. Running the site build (which knows nothing about deployment)
 * 2. Applying deployment-specific transforms (like base paths)
 * 
 * This separation ensures that build logic and deployment concerns
 * remain isolated, making the system more maintainable and testable.
 */

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
