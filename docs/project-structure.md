# Project Structure

## Overview

The Anteo website follows a clear separation between source files, configuration, build scripts, and generated output.

## Directory Layout

```
anteo-website/
├── config/                 # Configuration files
│   ├── build.config.js    # Build process settings
│   ├── site.config.js     # Site metadata
│   └── nodemon.json       # Development server config
│
├── content/               # Markdown content (multilingual)
│   ├── no/               # Norwegian content
│   │   ├── data/         # Site and navigation data
│   │   ├── pages/        # Static pages
│   │   ├── products/     # Product descriptions
│   │   ├── news/         # News articles
│   │   └── team/         # Team information
│   └── en/               # English content (same structure)
│
├── scripts/              # Build and utility scripts
│   ├── build.js         # Main build script
│   ├── dev-server.js    # Development server
│   ├── link-checker.js  # Validate internal links
│   └── utils/           # Build utilities
│       └── image-processor.js
│
├── src/                  # Source files
│   ├── assets/          # Static assets
│   │   ├── css/         # Stylesheets
│   │   ├── js/          # JavaScript modules
│   │   │   ├── index.js # JS entry point
│   │   │   └── modules/ # Feature modules
│   │   └── images/      # Source images
│   └── templates/       # Handlebars templates
│       ├── layouts/     # Page layouts
│       └── pages/       # Content templates
│
├── dist/                # Generated output (git-ignored)
│   ├── assets/          # Processed assets
│   ├── api/             # Generated API endpoints
│   └── [html files]     # Built pages
│
├── .temp/               # Temporary build files (git-ignored)
│   ├── image-cache.json # Image processing cache
│   └── images/          # Processed images
│
└── docs/                # Project documentation
```

## Key Directories

### `/config`
Central location for all configuration files. Separates configuration from code.

### `/content`
Markdown-based content organized by language. Each language follows the same structure for consistency.

### `/scripts`
All build-related scripts. The `utils/` subdirectory contains specialized build utilities.

### `/src`
Source files that get processed during build:
- **assets**: CSS, JavaScript, and images
- **templates**: Handlebars templates for rendering HTML

### `/dist`
The final build output. This directory is:
- Created during build
- Deployed to GitHub Pages
- Ignored by git

### `/.temp`
Temporary files created during build:
- Image processing cache
- Intermediate build artifacts
- Ignored by git

## File Organization Principles

1. **Language Separation**: Content is organized by language at the top level
2. **Type Grouping**: Similar files grouped together (pages, products, news)
3. **Clear Output**: Single output directory (`dist`) for all generated files
4. **Hidden Temporary**: Build artifacts in `.temp` to keep root clean

## Content Structure

### Page Frontmatter
```yaml
---
title: "Page Title"
description: "SEO description"
layout: page
---
```

### Product Frontmatter
```yaml
---
title: "Product Name"
description: "Product description"
category: "category-name"
features:
  - "Feature 1"
  - "Feature 2"
---
```

### News Frontmatter
```yaml
---
title: "Article Title"
date: "2024-01-15"
author: "Author Name"
category: "news-category"
description: "Article summary"
---
```

### Team Member Frontmatter
```yaml
---
name: "Full Name"
position: "Job Title"
email: "email@anteo.no"
phone: "+47 XXX XX XXX"
linkedin: "https://linkedin.com/in/profile"
photo: "/assets/images/team/name.jpg"
order: 1
---
```

## Build Artifacts

### Git-Ignored
- `/dist` - All build output
- `/.temp` - Temporary files
- `/node_modules` - Dependencies
- `.DS_Store` - macOS files
- `*.log` - Log files

### Git-Tracked
- All source files
- Configuration files
- Documentation
- Package files
- GitHub Actions workflow
