# Build System

## Overview

The Anteo website uses a custom Node.js build system that processes Markdown content, applies templates, optimizes images, and bundles JavaScript into a static website.

## Build Commands

| Command | Description | Environment |
|---------|-------------|-------------|
| `npm run build` | Production build | `NODE_ENV=production` |
| `npm run build:dev` | Development build | `NODE_ENV=development` |
| `npm run dev` | Development server with auto-reload | `NODE_ENV=development` |
| `npm run clean` | Remove build artifacts | - |

## Build Pipeline

### 1. Initialization
- Load configuration from `config/build.config.js`
- Determine base path for deployment
- Clean output directories

### 2. Asset Processing
- Copy CSS files to `dist/assets/css/`
- Copy static images to `dist/assets/images/`
- JavaScript handled separately by bundler

### 3. Content Processing
For each language (no, en):
- Load site metadata and navigation
- Process Markdown files with frontmatter
- Apply Handlebars templates
- Generate HTML output

### 4. Image Optimization
- Scan HTML for images with query parameters
- Resize and convert images as needed
- Generate placeholders for missing images
- Update HTML with optimized image paths

### 5. JavaScript Bundling
- Bundle ES6 modules with esbuild
- Development: `bundle.js` with source maps
- Production: `bundle.min.js` minified

### 6. Final Output
- Generate API content index at `/api/content.json`
- Create `.nojekyll` for GitHub Pages
- Create CNAME file if custom domain set

## Configuration

### build.config.js
```javascript
{
  contentPath: 'content',
  templatesPath: 'src/templates',
  assetsPath: 'src/assets',
  outputPath: 'dist',
  tempPath: '.temp',
  languages: ['no', 'en'],
  defaultLanguage: 'no'
}
```

### site.config.js
```javascript
{
  name: 'Anteo AS',
  url: 'https://anteo.no',
  githubRepo: 'anteoas/website',
  customDomain: process.env.CUSTOM_DOMAIN || false
}
```

## Template System

### Template Types
- **Layouts**: Base HTML structure (`base.html`)
- **Pages**: Content-specific templates (`page.html`, `product.html`, `news.html`)

### Template Data
Templates receive:
- Site metadata
- Page frontmatter
- Navigation data
- Language information
- Base path for URLs

### Special Processing
- Team member grids generated from individual Markdown files
- Language-specific content and navigation
- Automatic copyright year updates

## Development Server

The development server (`npm run dev`) provides:
- Browser-sync for auto-reload
- File watching with nodemon
- Automatic rebuilds on changes
- Local server at http://localhost:3000

## Production Deployment

Production builds optimize for:
- Minified JavaScript
- Processed and cached images
- Clean URLs without `.html` extensions
- GitHub Pages compatibility

## Extending the Build

### Adding a New Template
1. Create template in `src/templates/pages/`
2. Add to template mapping in `build.js`
3. Use in content frontmatter: `layout: templatename`

### Adding Processing Steps
1. Create utility in `scripts/utils/`
2. Import in `build.js`
3. Add to build pipeline

### Environment Variables
- `NODE_ENV`: Set build mode (development/production)
- `GITHUB_ACTIONS`: Detected automatically in CI
- `GITHUB_REPOSITORY`: Used for base path
- `CUSTOM_DOMAIN`: Override base path for custom domains
