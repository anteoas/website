# Anteo Website Project Summary

## Overview
Static site generator for Anteo AS using markdown files, Node.js, and GitHub Pages deployment.

## Current Status
✅ **Working locally** - Site builds and serves correctly  
✅ **GitHub Actions configured** - Automated deployment pipeline ready  
⚠️ **Deployment pending** - Waiting for CSS/navigation fixes to propagate  
🔄 **Custom domain ready** - Can enable anteo.no when needed  

## Architecture

### Tech Stack
- **Build**: Node.js with Handlebars templates
- **Content**: Markdown with YAML frontmatter
- **Styling**: Plain CSS (no framework)
- **Deployment**: GitHub Pages via Actions
- **Dependencies**: marked, gray-matter, handlebars, fs-extra, glob

### Directory Structure
```
anteo-website/
├── content/           # Markdown source files
│   ├── pages/        # Static pages (about, contact, etc)
│   ├── products/     # Product pages
│   ├── news/         # News articles
│   └── data/         # JSON data (navigation, site info)
├── templates/        # Handlebars HTML templates
├── public/           # Generated site (git-ignored)
│   └── assets/       # CSS, JS, images
├── build.js          # Build script
└── package.json      # Dependencies
```

### Key Design Decisions
1. **All pages at root level** - `/about.html` not `/pages/about.html`
2. **Base path handling** - Works on both `/website/` (GitHub) and `/` (custom domain)
3. **No CMS** - Direct markdown editing in GitHub
4. **AI-friendly** - Generates `/api/content.json` with all content metadata

## Build System

### How it Works
1. Reads all markdown files from `content/`
2. Parses frontmatter and converts markdown to HTML
3. Applies Handlebars templates
4. Outputs to `public/` with proper structure
5. Generates AI content index

### Key Features
- **Base path detection** - Automatically uses `/website` on GitHub Pages
- **Link processing** - Updates markdown links with base path
- **Template system** - Base template wraps page/product/news templates
- **Clean builds** - Removes old directories

### Commands
```bash
npm run build  # Build site
npm run serve  # Serve locally
npm run dev    # Watch & rebuild
```

## Content Structure

### Frontmatter Examples

**Page**:
```yaml
---
title: "Page Title"
description: "SEO description"
layout: page
---
```

**Product**:
```yaml
---
title: "Product Name"
description: "Product description"
category: "logistics"
features:
  - "Feature 1"
  - "Feature 2"
---
```

**News**:
```yaml
---
title: "Article Title"
date: "2024-01-15"
author: "Author Name"
category: "industry"
description: "Article summary"
---
```

## Deployment

### GitHub Actions Workflow
- Triggers on push to main
- Uses Node 22 LTS
- Builds site with proper base path
- Deploys to GitHub Pages

### Environment Variables
- `GITHUB_ACTIONS=true` - Detected automatically
- `GITHUB_REPOSITORY` - Used to determine base path
- `CUSTOM_DOMAIN` - Set to enable custom domain (e.g., `anteo.no`)

### URLs
- **Current**: https://anteoas.github.io/website/
- **Future**: https://anteo.no (when CUSTOM_DOMAIN is set)

## Known Issues & Solutions

### Fixed Issues
1. ✅ **Empty content** - Templates now output content correctly
2. ✅ **CSS not loading** - Base path now included in asset URLs
3. ✅ **Navigation 404s** - Links updated to use base path
4. ✅ **Dev loop** - Nodemon configured to ignore public directory
5. ✅ **News metadata dots** - Template shows only existing fields

### Pending Tasks
1. Add more content (team, case studies, etc.)
2. Improve mobile responsiveness
3. Add search functionality
4. Optimize images
5. Add sitemap.xml generation

## For AI/LLM Context

### Quick Start for Modifications
1. **Add new page**: Create markdown in `content/pages/`
2. **Update navigation**: Edit `content/data/navigation.json`
3. **Change styles**: Edit `public/assets/css/style.css`
4. **Modify templates**: Edit files in `templates/`
5. **Test locally**: Run `npm run dev`

### Important Patterns
- All URLs use `{{basePath}}` prefix in templates
- Markdown links are processed during build
- Templates are simple Handlebars without partials
- Build script handles all path transformations

### Common Pitfalls
- Don't use absolute paths without `{{basePath}}`
- Remember to handle missing frontmatter fields
- Test with `GITHUB_ACTIONS=true` to simulate deployment
- Always commit `package-lock.json` for reproducible builds

## Next Steps
1. Push current changes to see deployment
2. Verify CSS and navigation work on GitHub Pages
3. Add remaining content
4. Configure custom domain when ready
