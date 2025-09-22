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
  
  // Initialize mobile menu
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const body = document.body;
  
  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener('click', () => {
      const isActive = navMenu.classList.contains('active');
      
      // Toggle menu
      navMenu.classList.toggle('active');
      mobileMenuToggle.classList.toggle('active');
      mobileMenuToggle.setAttribute('aria-expanded', !isActive);
      
      // Prevent body scroll when menu is open
      body.style.overflow = isActive ? '' : 'hidden';
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (navMenu.classList.contains('active') && 
          !navMenu.contains(e.target) && 
          !mobileMenuToggle.contains(e.target)) {
        navMenu.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        body.style.overflow = '';
      }
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        body.style.overflow = '';
      }
    });
    
    // Close menu when clicking on a link (for same-page navigation)
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        body.style.overflow = '';
      });
    });
  }
  
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
