# Base Path Handling

## Overview

The build system handles base paths (required for GitHub Pages deployment) through a clean separation of concerns:

1. **Build Phase** (`build-site.js`) - Builds the site with root-relative paths, knows nothing about deployment
2. **Deployment Configuration Phase** (`deployment-transform.js`) - Injects configuration and applies base paths

## Architecture

### Separation of Concerns

The build system is split into distinct modules:

```
scripts/
├── build.js                    # Main orchestrator
├── build-site.js              # Pure build logic (no deployment knowledge)
└── deployment-transform.js     # Deployment configuration and transforms
```

### Build Phase
- All URLs are generated as root-relative paths (`/assets/...`, `/about.html`)
- Templates use standard HTML without path variables
- No base path logic during content processing
- Pure transformation of content to HTML

### Deployment Configuration Phase
- Injects `window.ANTEO_CONFIG` into all HTML files
- Applies base path to all URLs if needed
- Single-pass transformation of HTML files only
- CSS, JS, and JSON files are never modified

## Configuration Injection

Every HTML page receives a configuration object:

```javascript
window.ANTEO_CONFIG = {
  basePath: '/website',      // Or empty string for root deployment
  customDomain: null,        // Or domain name if set
  environment: 'production', 
  gitHubActions: true,       // Whether built in GitHub Actions
  langPrefix: '/en',         // Or empty for default language
  currentLang: 'en',         // Current page language
  defaultLang: 'no',         // Default site language
  pageUrl: 'about'           // Current page path
};
```

## JavaScript Usage

JavaScript modules receive configuration during initialization:

```javascript
// Main entry point
const config = window.ANTEO_CONFIG || {};
initLanguageDetector(config);
initNavigation(config);
```

Modules use the config instead of parsing URLs:

```javascript
export function init(config = {}) {
  const { basePath = '', currentLang = 'no' } = config;
  
  // Use basePath for URL construction
  window.location.href = basePath + '/en/';
}
```

## Implementation

### Environment Detection
```javascript
const basePath = process.env.CUSTOM_DOMAIN ? '' : 
  (process.env.GITHUB_ACTIONS === 'true' && repoName ? `/${repoName}` : '');
```

### URL Transformation
The `applyDeploymentConfig()` function:
1. Injects configuration script before `</head>`
2. Modifies all root-relative URLs in HTML files
3. Leaves non-HTML files untouched

## URL Patterns

| Original URL | With Base Path `/website` |
|-------------|---------------------------|
| `/assets/css/style.css` | `/website/assets/css/style.css` |
| `/about.html` | `/website/about.html` |
| `/` | `/website/` |
| `/assets/images/logo.png` | `/website/assets/images/logo.png` |

## Benefits

1. **Single source of truth** - Configuration comes from the build system
2. **No URL parsing** - JavaScript doesn't need to guess the base path
3. **Testable** - Modules can be tested with different configurations
4. **Clean separation** - Build and deployment concerns are isolated
5. **Extensible** - Easy to add more deployment configuration options
