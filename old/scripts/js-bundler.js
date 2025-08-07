const esbuild = require('esbuild');
const path = require('path');

async function bundleJS() {
  console.log('Bundling JavaScript...');
  
  try {
    // Development build (with source maps)
    await esbuild.build({
      entryPoints: ['src/assets/js/index.js'],
      bundle: true,
      outfile: 'dist/assets/js/bundle.js',
      sourcemap: true,
      format: 'iife'
    });
    
    // Production build (minified)
    await esbuild.build({
      entryPoints: ['src/assets/js/index.js'],
      bundle: true,
      outfile: 'dist/assets/js/bundle.min.js',
      minify: true,
      format: 'iife'
    });
    
    console.log('✓ JavaScript bundled successfully');
  } catch (error) {
    console.error('✗ JavaScript bundling failed:', error);
    throw error;
  }
}

module.exports = { bundleJS };
