(() => {
  // assets/js/modules/language-detector.js
  function init(config = {}) {
    const { basePath = "", currentLang = "no", langPrefix = "" } = config;
    detectAndRedirect(config);
    initLanguageSwitcher(config);
  }
  function detectAndRedirect(config) {
    const { basePath = "", currentLang = "no" } = config;
    const pathname = window.location.pathname;
    const isHomepage = pathname === basePath + "/" || pathname === basePath + "/index.html" || pathname === basePath + "/en/" || pathname === basePath + "/en/index.html" || pathname === basePath || // Just the base path
    pathname === basePath + "/" + currentLang + "/" || pathname === basePath + "/" + currentLang + "/index.html";
    if (!isHomepage) {
      return;
    }
    const languagePreference = localStorage.getItem("languagePreference");
    if (!languagePreference) {
      const browserLang = navigator.language || navigator.userLanguage;
      if (browserLang.toLowerCase().startsWith("en")) {
        window.location.href = basePath + "/en/";
      }
      localStorage.setItem("languagePreference", browserLang.toLowerCase().startsWith("en") ? "en" : "no");
    }
  }
  function initLanguageSwitcher(config) {
    const langSwitches = document.querySelectorAll(".lang-switch");
    langSwitches.forEach((link) => {
      link.addEventListener("click", function(e) {
        const switchingToEnglish = this.href.includes("/en/");
        localStorage.setItem("languagePreference", switchingToEnglish ? "en" : "no");
      });
    });
  }
})();
//# sourceMappingURL=language-detector.js.map
