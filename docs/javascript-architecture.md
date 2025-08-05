# JavaScript Architecture

## Overview

The website uses a modular JavaScript architecture with ES6 modules, bundled using esbuild for optimal performance.

## Directory Structure

```
src/assets/js/
├── index.js              # Main entry point
└── modules/              # Feature modules
    ├── language-detector.js
    └── navigation.js
```

## Module System

### Creating a Module

Each module exports functions that can be imported by other modules:

```javascript
// modules/feature.js
export function initFeature() {
    // Initialize feature
}

export function featureMethod() {
    // Additional functionality
}
```

### Module Guidelines

- One feature per module
- Export initialization functions
- Keep modules focused and single-purpose
- Use descriptive function names

## Entry Point

The `index.js` file serves as the main entry point:

```javascript
import { initLanguageDetector } from './modules/language-detector.js';
import { initNavigation } from './modules/navigation.js';

// Initialize modules
document.addEventListener('DOMContentLoaded', () => {
    initLanguageDetector();
    initNavigation();
});
```

## Build Process

### Development Build
- Command: `npm run build:dev` or `npm run dev`
- Output: `dist/assets/js/bundle.js`
- Features: Source maps, no minification
- Use case: Local development and debugging

### Production Build
- Command: `npm run build`
- Output: `dist/assets/js/bundle.min.js`
- Features: Minified, no source maps
- Use case: Deployment to production

## Current Modules

### language-detector.js
Handles automatic language detection and redirection based on browser preferences.

**Functions:**
- `initLanguageDetector()` - Detects browser language and redirects if needed
- `initLanguageSwitcher()` - Handles manual language switching

### navigation.js
Manages navigation interactions and UI enhancements.

**Functions:**
- `initNavigation()` - Sets up navigation event handlers
- Smooth scrolling for anchor links
- Mobile menu toggle (ready for implementation)

## Adding New Features

1. Create a new module file in `src/assets/js/modules/`
2. Export the necessary functions
3. Import in `index.js`
4. Initialize in the DOMContentLoaded event

Example:
```javascript
// modules/analytics.js
export function initAnalytics() {
    // Analytics initialization code
}

// index.js
import { initAnalytics } from './modules/analytics.js';

document.addEventListener('DOMContentLoaded', () => {
    initAnalytics();
});
```

## Bundle Configuration

The bundler (esbuild) is configured in `scripts/build.js`:
- Target: ES2015 for broad browser support
- Format: IIFE (Immediately Invoked Function Expression)
- Source maps: Development only
- Minification: Production only
