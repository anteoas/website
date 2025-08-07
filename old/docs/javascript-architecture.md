# JavaScript Architecture

## Overview

The JavaScript architecture uses ES6 modules with a configuration-driven initialization pattern. All modules receive their configuration from the build system, ensuring consistent behavior across different deployment environments.

## Configuration System

### Build-Time Injection

During the build process, configuration is injected into every HTML page:

```javascript
window.ANTEO_CONFIG = {
  basePath: '/website',      // Base path for all URLs
  customDomain: null,        // Custom domain if configured
  environment: 'production', // Build environment
  gitHubActions: true,       // Whether built in CI
  langPrefix: '/en',         // Language prefix for URLs
  currentLang: 'en',         // Current page language
  defaultLang: 'no',         // Default site language
  pageUrl: 'about'           // Current page identifier
};
```

### Runtime Usage

Modules are initialized with configuration during page load:

```javascript
// src/assets/js/index.js
document.addEventListener('DOMContentLoaded', () => {
  const config = window.ANTEO_CONFIG || {
    basePath: '',
    langPrefix: '',
    currentLang: 'no',
    defaultLang: 'no'
  };
  
  // Initialize all modules with config
  initLanguageDetector(config);
  initNavigation(config);
});
```

## Module Structure

### Module Pattern

Each module exports an `init` function that accepts configuration:

```javascript
// src/assets/js/modules/example.js
export function init(config = {}) {
  const { basePath = '', currentLang = 'no' } = config;
  
  // Module implementation using config
}
```

### Benefits

1. **No URL Parsing** - Modules don't need to guess deployment paths
2. **Testable** - Can test with different configurations
3. **Consistent** - All modules use the same configuration source
4. **Explicit Dependencies** - Clear what configuration each module needs

## Available Modules

### Language Detector (`language-detector.js`)

Handles automatic language detection and redirects:

```javascript
export function init(config = {}) {
  const { basePath = '', currentLang = 'no' } = config;
  
  // Detect browser language and redirect if needed
  // Manage language preferences in localStorage
  // Initialize language switcher UI
}
```

### Navigation (`navigation.js`)

Manages navigation interactions:

```javascript
export function init(config = {}) {
  // Mobile menu toggle
  // Smooth scrolling for anchor links
  // Active state management
}
```

## Build Process

### Development

```bash
npm run build:dev
```
- Source maps enabled
- No minification
- Faster builds

### Production

```bash
npm run build
```
- Minified output
- No source maps
- Optimized file size

### Bundling

JavaScript is bundled using esbuild:
- Entry point: `src/assets/js/index.js`
- Output: `dist/assets/js/bundle.js` (dev) or `bundle.min.js` (prod)
- Format: IIFE (immediately invoked function expression)
- Target: ES2015

## Testing Approach

Modules can be tested by providing different configurations:

```javascript
describe('Language Detector', () => {
  it('should handle root deployment', () => {
    const config = { basePath: '', currentLang: 'no' };
    init(config);
    // Test behavior
  });
  
  it('should handle subdirectory deployment', () => {
    const config = { basePath: '/website', currentLang: 'no' };
    init(config);
    // Test behavior
  });
});
```

## Best Practices

1. **Always destructure config** - Be explicit about what configuration you need
2. **Provide defaults** - Handle missing configuration gracefully
3. **Don't access globals directly** - Use the provided config
4. **Keep modules focused** - Each module should have a single responsibility
5. **Document config usage** - Make it clear what configuration each module expects
