# Anteo Website Architecture Guide

This document explains how the Anteo static site generator works, making it easier for developers (and LLMs) to understand and modify the codebase.

## Overview

The Anteo website is a multilingual static site generator built with Node.js. It transforms Markdown content into a static website with automatic image optimization and deployment to GitHub Pages.

## Directory Structure

```
anteo-website/
├── config/                 # Configuration files
│   ├── build.config.js    # Build settings (languages, paths)
│   └── site.config.js     # Site metadata
├── content/               # All content (Markdown files)
│   ├── no/               # Norwegian content
│   │   ├── pages/        # Static pages
│   │   ├── products/     # Product pages
│   │   ├── news/         # News articles
│   │   ├── team/         # Team members
│   │   └── data/         # JSON data files
│   └── en/               # English content (same structure)
├── src/                   # Source files
│   ├── assets/           # CSS, JS, images
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   └── templates/        # Handlebars templates
│       ├── layouts/      # Base layouts
│       └── pages/        # Page templates
├── scripts/              # Build scripts
│   ├── build.js          # Main build orchestrator
│   ├── build-site.js     # Site generation logic
│   └── dev-server.js     # Development server
└── dist/                 # Build output (gitignored)
```

## Build Process Flow

### 1. Entry Points
- **Production build**: `npm run build` → `scripts/build.js`
- **Development server**: `npm run dev` → `scripts/dev-server.js`

### 2. Build Pipeline (`scripts/build.js`)
```javascript
1. buildSite() - Generate the site
2. determineBasePath() - Calculate deployment path
3. applyDeploymentConfig() - Update URLs for deployment
4. createDeploymentFiles() - Generate CNAME, etc.
```

### 3. Site Generation (`scripts/build-site.js`)

#### Key Functions:

**`buildSite()`** - Main orchestrator
- Loads templates
- Processes each language
- Bundles assets
- Generates content index

**`processMarkdownFile()`** - Processes individual Markdown files
- Parses frontmatter with gray-matter
- Converts Markdown to HTML with marked
- Determines template based on path or layout
- Returns pageData and template name

**Template Selection Logic:**
```javascript
let template = 'page';
if (data.layout) {
  template = data.layout;  // Explicit layout in frontmatter
} else {
  if (file.includes('/products/')) template = 'product';
  if (file.includes('/news/')) template = 'news';
}
```

#### Data Loading:
1. **Site data**: `content/[lang]/data/site.json`
2. **Navigation**: `content/[lang]/data/navigation.json`
3. **Team members**: Collected from `content/[lang]/team/members/*.md`

### 4. Templates (Handlebars)

**Base Layout** (`src/templates/layouts/base.html`)
- Wraps all pages
- Contains header, navigation, footer
- Receives `body` content from page templates

**Page Templates** (`src/templates/pages/`)
- `page.html` - Generic pages
- `product.html` - Product pages
- `news.html` - News articles
- `landing.html` - Homepage

**Template Data Structure:**
```javascript
{
  // From frontmatter
  title, description, layout,
  
  // From build process
  content,           // Parsed HTML
  navigation,        // From navigation.json
  langPrefix,        // "" or "/en"
  currentPath,       // Current page path
  
  // From site.json
  name, tagline, copyright,
  
  // Special data
  teamMembers,       // For team/about pages
  latestNews,        // For landing page
  productGroups      // For landing page
}
```

### 5. Output Structure

Files are output based on their type:
- **Pages**: `content/no/pages/about.md` → `dist/about.html`
- **Products**: `content/no/products/logistics/map-tools.md` → `dist/produkter/logistics/map-tools.html`
- **Index pages**: Create directory with index.html

### 6. Image Processing

The `ImageProcessor` class:
1. Extracts image URLs from HTML
2. Supports query parameters: `?size=300x200&format=webp`
3. Processes images on demand
4. Replaces URLs in final HTML

### 7. Development Server

- Watches for file changes
- Rebuilds on change
- Serves from `dist/` directory
- No hot reload (full page refresh)

## Key Concepts

### Multilingual Support
- Default language (Norwegian) has no prefix
- Other languages get URL prefix: `/en/about.html`
- Language switching updates entire path

### Navigation Building
- Defined in `navigation.json`
- Can reference content files to pull labels
- Product navigation can be auto-generated from folder structure

### Frontmatter
All Markdown files use frontmatter for metadata:
```yaml
---
title: "Page Title"
description: "SEO description"
layout: "page"  # Optional, defaults based on path
order: 1        # Optional, for sorting
---
```

### Special Pages

**Team/About Pages**
- Team members are auto-inserted where comment placeholder exists
- Members sorted by `order` field

**Landing Page**
- Uses special `landing` layout
- Pulls data from multiple sources:
  - Hero content from frontmatter
  - Product groups from separate files
  - Latest news from news directory

## Common Modifications

### Adding a New Page Template
1. Create `src/templates/pages/[name].html`
2. Add to templates object in `build-site.js`
3. Use via `layout: [name]` in frontmatter

### Adding a New Language
1. Update `config/build.config.js` languages array
2. Create `content/[lang]/` directory structure
3. Copy and translate all content files

### Changing URL Structure
- Modify output path logic in `build-site.js` (around line 235)
- Update `navigation.json` to match

### Adding Global Data
1. Add to `content/[lang]/data/site.json`
2. Available in all templates automatically

## Debugging Tips

1. **Build output**: Check console for processing order
2. **Template data**: Add `{{log this}}` in templates
3. **File paths**: Build script logs all processed files
4. **Image processing**: Check `dist/assets/images/` for output

## Important Files Reference

- **Build config**: `config/build.config.js` - languages, paths
- **Site config**: `config/site.config.js` - metadata
- **Main build**: `scripts/build-site.js` - core logic
- **Templates**: `src/templates/` - all HTML templates
- **Styles**: `src/assets/css/style.css` - imports other CSS

## Deployment

The site deploys to GitHub Pages via Actions:
1. Push to main branch triggers build
2. `GITHUB_REPOSITORY` env var determines base path
3. `CUSTOM_DOMAIN` env var overrides for custom domains
4. Output goes to `gh-pages` branch

---

*This guide should help anyone (human or AI) understand how to work with and modify the Anteo website builder.*
