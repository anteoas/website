// Language detection and redirect logic
export function initLanguageDetector() {
  const pathname = window.location.pathname;
  
  // Check if we're on the homepage
  // Handle both root and potential base paths
  const pathParts = pathname.split('/').filter(p => p);
  
  // We're on homepage if:
  // - pathname is exactly '/' or '/index.html'
  // - pathname ends with just 'index.html' 
  // - pathname has only one segment (potential base path like '/website/')
  const isHomepage = 
    pathname === '/' || 
    pathname === '/index.html' ||
    pathname.endsWith('/index.html') ||
    (pathParts.length === 0) ||
    (pathParts.length === 1 && pathParts[0] !== 'en');
  
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
      // Determine base path from current URL
      // If we're at /website/ the base is /website, if we're at / the base is empty
      const currentPath = window.location.pathname;
      let basePath = '';
      
      if (currentPath !== '/' && currentPath !== '/index.html') {
        // We might have a base path
        const pathParts = currentPath.split('/').filter(p => p && p !== 'index.html');
        if (pathParts.length === 1) {
          basePath = '/' + pathParts[0];
        }
      }
      
      // Redirect to English homepage
      window.location.href = basePath + '/en/';
    }
    
    // Set preference to prevent future redirects
    localStorage.setItem('languagePreference', browserLang.toLowerCase().startsWith('en') ? 'en' : 'no');
  }
}

// Update language preference when user clicks language switcher
export function initLanguageSwitcher() {
  const langSwitches = document.querySelectorAll('.lang-switch');
  
  langSwitches.forEach(link => {
    link.addEventListener('click', function(e) {
      // Determine which language they're switching to
      const switchingToEnglish = this.href.includes('/en/');
      localStorage.setItem('languagePreference', switchingToEnglish ? 'en' : 'no');
    });
  });
}
