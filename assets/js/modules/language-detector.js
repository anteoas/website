// Language detection and redirect logic
export function init(config = {}) {
  const { basePath = '', currentLang = 'no', langPrefix = '' } = config;
  
  // Initialize language detection
  detectAndRedirect(config);
  
  // Initialize language switcher
  initLanguageSwitcher(config);
}

function detectAndRedirect(config) {
  const { basePath = '', currentLang = 'no' } = config;
  const pathname = window.location.pathname;
  
  // Determine if we're on the homepage
  const isHomepage = 
    pathname === basePath + '/' || 
    pathname === basePath + '/index.html' ||
    pathname === basePath + '/en/' ||
    pathname === basePath + '/en/index.html' ||
    pathname === basePath || // Just the base path
    pathname === basePath + '/' + currentLang + '/' ||
    pathname === basePath + '/' + currentLang + '/index.html';
  
  if (!isHomepage) {
    return;
  }

  // Check if user has already chosen a language
  const languagePreference = localStorage.getItem('languagePreference');
  
  if (!languagePreference) {
    // Detect browser language
    const browserLang = navigator.language || navigator.userLanguage;
    
    // If browser language is English, redirect to English version
    if (browserLang.toLowerCase().startsWith('en')) {
      // Redirect to English homepage
      window.location.href = basePath + '/en/';
    }
    
    // Set preference to prevent future redirects
    localStorage.setItem('languagePreference', browserLang.toLowerCase().startsWith('en') ? 'en' : 'no');
  }
}

// Update language preference when user clicks language switcher
function initLanguageSwitcher(config) {
  const langSwitches = document.querySelectorAll('.lang-switch');
  
  langSwitches.forEach(link => {
    link.addEventListener('click', function(e) {
      // Determine which language they're switching to
      const switchingToEnglish = this.href.includes('/en/');
      localStorage.setItem('languagePreference', switchingToEnglish ? 'en' : 'no');
    });
  });
}
