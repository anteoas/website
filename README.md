# Anteo Website

A static site generator for Anteo AS built with Node.js, featuring multilingual content, automatic image optimization, and GitHub Pages deployment.

## Quick Start

```bash
npm install         # Install dependencies
npm run dev        # Start development server
npm run build      # Build for production
```

## Documentation

For detailed documentation, see the [`/docs`](./docs) directory:

- [Project Structure](./docs/project-structure.md) - Directory layout and organization
- [Build System](./docs/build-system.md) - How the build process works
- [Image Processing](./docs/image-processing.md) - Automatic image optimization
- [JavaScript Architecture](./docs/javascript-architecture.md) - Module system and bundling
- [Testing](./docs/testing.md) - Test suite and testing guidelines

## For Content Editors

### Adding/Editing Content

1. Navigate to the `content/` folder
2. Choose your language folder (`no` or `en`)
3. Edit `.md` files directly in GitHub
4. Commit your changes - the site automatically rebuilds

### Content Types

- **Pages**: `content/[lang]/pages/` - Static pages like About, Contact
- **Products**: `content/[lang]/products/` - Product descriptions
- **News**: `content/[lang]/news/` - News articles (format: `YYYY-MM-DD-title.md`)
- **Team**: `content/[lang]/team/members/` - Team member profiles

### Frontmatter Example

```yaml
---
title: "Page Title"
description: "SEO description"
layout: page
---

Your content here...
```

## For Developers

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with auto-reload |
| `npm run build` | Production build with minification |
| `npm run build:dev` | Development build with source maps |
| `npm run clean` | Remove build artifacts |
| `npm run serve` | Preview production build |
| `npm test` | Run all tests |
| `npm run test:coverage` | Generate test coverage report |

### Key Features

- **Multilingual**: Norwegian (default) and English
- **Image Optimization**: Automatic resizing via query params: `?size=300x200&format=webp`
- **JavaScript Bundling**: ES6 modules bundled with esbuild
- **Markdown Content**: Using frontmatter for metadata
- **GitHub Pages**: Automatic deployment on push to main

### Project Structure

```
├── config/        # Configuration files
├── content/       # Markdown content
├── scripts/       # Build scripts
├── src/           # Source files (templates, assets)
├── dist/          # Build output (git-ignored)
└── docs/          # Documentation
```

## Deployment

The site automatically deploys to GitHub Pages when changes are pushed to the `main` branch. The GitHub Actions workflow handles the build and deployment process.

## API Integration

After building, all content is available as JSON at `/api/content.json` for easy integration with other systems.
