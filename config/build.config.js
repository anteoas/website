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
  
  // Language configuration
  languageConfig: {
    'no': {
      name: 'Norsk',
      flag: '/assets/images/flags/norway-flag.svg'
    },
    'en': {
      name: 'English', 
      flag: '/assets/images/flags/uk-flag.svg'
    }
  },
  
  // Image processing
  imageProcessing: {
    cachePath: '.temp/image-cache.json',
    outputPath: '.temp/images'
  }
};
