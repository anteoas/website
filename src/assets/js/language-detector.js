// Language detection and redirect logic
(function() {
  // Only run on the homepage
  if (window.location.pathname !== '/' && 
      window.location.pathname !== '/index.html' &&
      !window.location.pathname.includes('/website/') &&
      !window.location.pathname.includes('/website/index.html')) {
    return;
  }

  // Check if user has already chosen a language
  const languagePreference = localStorage.getItem('languagePreference');
  
  if (!languagePreference) {
    // Detect browser language
    const browserLang = navigator.language || navigator.userLanguage;
    
    // If browser language is English, redirect to English version
    if (browserLang.toLowerCase().startsWith('en')) {
      // Get base path
      const basePath = document.querySelector('base')?.getAttribute('href') || '';
      
      // Redirect to English homepage
      window.location.href = basePath + '/en/';
    }
    
    // Set preference to prevent future redirects
    localStorage.setItem('languagePreference', browserLang.toLowerCase().startsWith('en') ? 'en' : 'no');
  }
})();

// Update language preference when user clicks language switcher
document.addEventListener('DOMContentLoaded', function() {
  const langSwitches = document.querySelectorAll('.lang-switch');
  
  langSwitches.forEach(link => {
    link.addEventListener('click', function(e) {
      // Determine which language they're switching to
      const switchingToEnglish = this.href.includes('/en/');
      localStorage.setItem('languagePreference', switchingToEnglish ? 'en' : 'no');
    });
  });
});