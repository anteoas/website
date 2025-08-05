// Main entry point for all JavaScript
import { initLanguageDetector, initLanguageSwitcher } from './modules/language-detector.js';
import { initNavigation } from './modules/navigation.js';

// Initialize on page load
initLanguageDetector(); // Run immediately for redirects

document.addEventListener('DOMContentLoaded', () => {
    console.log('Anteo website initialized');
    
    // Initialize all modules
    initLanguageSwitcher();
    initNavigation();
});
