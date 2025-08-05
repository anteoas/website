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
  
  // Initialize language dropdown
  const languageToggle = document.querySelector('.language-toggle');
  const languageDropdown = document.querySelector('.language-dropdown');
  
  if (languageToggle && languageDropdown) {
    // Toggle dropdown on click
    languageToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      languageDropdown.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!languageDropdown.contains(e.target)) {
        languageDropdown.classList.remove('active');
      }
    });
    
    // Close dropdown on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        languageDropdown.classList.remove('active');
      }
    });
  }
});
