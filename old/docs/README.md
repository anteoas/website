# Anteo Website Documentation

## Overview

The Anteo website is a static site generator built with Node.js that transforms Markdown content into a multilingual website. It features automatic image optimization, JavaScript bundling, and a modular architecture.

## Documentation

### [Project Structure](./project-structure.md)
Understanding the directory layout and organization principles of the project.

### [Build System](./build-system.md)
How the build process works, from Markdown to deployed website.

### [Image Processing](./image-processing.md)
Automatic image optimization, resizing, and placeholder generation.

### [JavaScript Architecture](./javascript-architecture.md)
Module system, bundling, and how to add new JavaScript features.

## Quick Start

### Development
```bash
npm install          # Install dependencies
npm run dev         # Start development server
```

### Production Build
```bash
npm run build       # Create production build
npm run serve       # Preview production build
```

### Deployment
Push to the `main` branch triggers automatic deployment via GitHub Actions.

## Key Features

- **Multilingual**: Norwegian (default) and English
- **Markdown-based**: Content stored as Markdown with YAML frontmatter
- **Image Optimization**: Automatic resizing and format conversion
- **JavaScript Bundling**: ES6 modules bundled with esbuild
- **Auto-reload**: Development server with live reload
- **GitHub Pages**: Automated deployment pipeline

## Technology Stack

- **Build**: Node.js with custom build scripts
- **Templates**: Handlebars
- **Content**: Markdown with gray-matter
- **Images**: Sharp for processing
- **JavaScript**: esbuild for bundling
- **Deployment**: GitHub Actions to GitHub Pages

## Contributing

1. Create content in `content/[language]/`
2. Add images to `src/assets/images/`
3. Implement features in `src/assets/js/modules/`
4. Test with `npm run dev`
5. Build with `npm run build`
