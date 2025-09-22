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

  // assets/js/modules/navigation.js
  function init2(config = {}) {
    console.log("Navigation module initialized");
    const menuToggle = document.querySelector(".menu-toggle");
    const navMenu = document.querySelector(".nav-menu");
    if (menuToggle && navMenu) {
      menuToggle.addEventListener("click", () => {
        navMenu.classList.toggle("active");
        menuToggle.classList.toggle("active");
      });
    }
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      });
    });
  }

  // assets/js/index.js
  document.addEventListener("DOMContentLoaded", () => {
    console.log("Anteo website initialized");
    const config = window.ANTEO_CONFIG || {
      basePath: "",
      langPrefix: "",
      currentLang: "no",
      defaultLang: "no"
    };
    init(config);
    init2(config);
    const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
    const navMenu = document.querySelector(".nav-menu");
    const body = document.body;
    if (mobileMenuToggle && navMenu) {
      mobileMenuToggle.addEventListener("click", () => {
        const isActive = navMenu.classList.contains("active");
        navMenu.classList.toggle("active");
        mobileMenuToggle.classList.toggle("active");
        mobileMenuToggle.setAttribute("aria-expanded", !isActive);
        body.style.overflow = isActive ? "" : "hidden";
      });
      document.addEventListener("click", (e) => {
        if (navMenu.classList.contains("active") && !navMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
          navMenu.classList.remove("active");
          mobileMenuToggle.classList.remove("active");
          mobileMenuToggle.setAttribute("aria-expanded", "false");
          body.style.overflow = "";
        }
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && navMenu.classList.contains("active")) {
          navMenu.classList.remove("active");
          mobileMenuToggle.classList.remove("active");
          mobileMenuToggle.setAttribute("aria-expanded", "false");
          body.style.overflow = "";
        }
      });
      navMenu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
          navMenu.classList.remove("active");
          mobileMenuToggle.classList.remove("active");
          mobileMenuToggle.setAttribute("aria-expanded", "false");
          body.style.overflow = "";
        });
      });
    }
    const languageToggle = document.querySelector(".language-toggle");
    const languageDropdown = document.querySelector(".language-dropdown");
    if (languageToggle && languageDropdown) {
      languageToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        languageDropdown.classList.toggle("active");
      });
      document.addEventListener("click", (e) => {
        if (!languageDropdown.contains(e.target)) {
          languageDropdown.classList.remove("active");
        }
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          languageDropdown.classList.remove("active");
        }
      });
    }
  });
})();
//# sourceMappingURL=index.js.map
