# JavaScript Bundling with esbuild

## ✅ Feature Implemented

The project now includes automatic JavaScript bundling using esbuild, providing fast builds and optimized output for production.

## Structure

```
src/assets/js/
├── index.js              # Main entry point
└── modules/              # Individual modules
    ├── language-detector.js
    └── navigation.js
```

## How it Works

### Development Mode (`npm run dev` or `npm run build:dev`)
- Creates `dist/assets/js/bundle.js`
- Includes source maps for debugging
- No minification for easier debugging
- Fast rebuilds

### Production Mode (`npm run build`)
- Creates `dist/assets/js/bundle.min.js`
- Minified for smaller file size
- No source maps
- Optimized for performance

## Features

1. **Module System**: Use ES6 imports/exports
```javascript
// In modules/feature.js
export function initFeature() {
    // feature code
}

// In index.js
import { initFeature } from './modules/feature.js';
```

2. **Automatic Bundle Selection**: Templates automatically use the right bundle
```html
<!-- Development: bundle.js -->
<!-- Production: bundle.min.js -->
```

3. **Fast Builds**: esbuild is ~100x faster than webpack
- Development bundle: ~1ms
- Production bundle: ~1ms

4. **Size Reduction**:
- Original files: ~2.2kb
- Minified bundle: ~1.3kb (40% reduction)

## Adding New JavaScript

1. Create a new module in `src/assets/js/modules/`
2. Export your functions
3. Import in `index.js`
4. Initialize in the DOMContentLoaded listener

Example:
```javascript
// modules/analytics.js
export function initAnalytics() {
    console.log('Analytics initialized');
    // Add your analytics code here
}

// index.js
import { initAnalytics } from './modules/analytics.js';

document.addEventListener('DOMContentLoaded', () => {
    initAnalytics();
});
```

## Benefits

- ✅ Single HTTP request instead of multiple
- ✅ Smaller file sizes in production
- ✅ Modern JavaScript with ES6 modules
- ✅ Source maps in development
- ✅ No configuration needed
- ✅ Lightning-fast builds
