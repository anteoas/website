// Main entry point for Anteo website JavaScript
import { init as initLanguageDetector } from './modules/language-detector.js';
import { init as initNavigation } from './modules/navigation.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Anteo website initialized');
  
  // Get configuration injected by build system
  const config = window.ANTEO_CONFIG || {
    basePath: '',
    langPrefix: '',
    currentLang: 'no',
    defaultLang: 'no'
  };
  
  // Initialize modules with configuration
  initLanguageDetector(config);
  initNavigation(config);
});
