module.exports = {
  // Site metadata
  name: 'Anteo AS',
  url: 'https://anteo.no',
  
  // GitHub Pages settings
  githubRepo: 'anteoas/website',
  customDomain: process.env.CUSTOM_DOMAIN || false,
  
  // Development
  devPort: 3000,
  
  // Features
  features: {
    imageOptimization: true,
    linkChecker: true,
    sitemap: false  // TODO: implement
  }
};
