module.exports = {
  // Source paths
  contentPath: 'content',
  templatesPath: 'src/templates',
  assetsPath: 'src/assets',
  
  // Output paths
  outputPath: 'dist',
  tempPath: '.temp',
  
  // Build options
  languages: ['no', 'en'],
  defaultLanguage: 'no',
  
  // Image processing
  imageProcessing: {
    cachePath: '.temp/image-cache.json',
    outputPath: '.temp/images'
  }
};
