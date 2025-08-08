# Anteo Website Architecture

## Overview

The Anteo website is built using a data-driven static site generator. The entire site definition lives under the `site/` directory, while the generator library code is under `src/`.

## Site Structure

### Site Configuration (`site.edn`)

The `site.edn` file is the entry point that defines:
- **Template mappings**: Which wrapper template to use (e.g., `base`)
- **Page routes**: Maps content to output paths (e.g., `about` → `/about.html`, `landing` → `/index.html`)
- **Language support**: Maps language codes to their metadata
- **Processors**: Which processors to apply (e.g., `image-processor`)

### Templates (`site/templates/`)

Templates define the structure and layout of pages:
- **Format**: Can be `.edn` files (static Hiccup data) or `.clj` files (functions returning Hiccup)
- **Loading**: All templates are loaded into a map at build start
- **Composition**: Templates can reference and include other templates
- **SCI Support**: Clojure templates are evaluated in a sandboxed SCI environment (planned)

### Content (`site/content/{{lang}}/`)

Content is organized by language:
- **Formats**: 
  - `.md` files: MultiMarkdown with metadata header
  - `.edn` files: Direct EDN data structures
- **Processing**: 
  - Markdown content is parsed into EDN: `{:markdown/content "...", :other :metadata}`
  - All content becomes EDN before template processing

### Assets (`site/assets/`)

Static assets organized by type:
- **CSS**: `assets/css/` - bundled with esbuild, `@import` resolution
- **JavaScript**: `assets/js/` - bundled with esbuild, IIFE format
- **Images**: `assets/images/` - copied as-is, processed versions via query params
- **Other**: Fonts, icons, etc. - copied as-is

## Build Process

1. **Initialize**: Read `site.edn` for configuration
2. **Load Templates**: Load all templates from `site/templates/` into memory
3. **Process Content**: For each language:
   - Load content files from `site/content/{{lang}}/`
   - Parse markdown files (metadata + content)
   - Load EDN files directly
4. **Apply Templates**: Combine content with templates according to mappings
5. **Bundle Assets**: 
   - Bundle CSS with `@import` resolution
   - Bundle JavaScript (with sourcemaps in dev, minified in prod)
6. **Process Images**: 
   - Extract image URLs with query parameters from HTML/CSS
   - Process images according to parameters (size, format, quality)
   - Replace URLs with processed image paths
7. **Generate Output**: Write files to output directory

## Key Components

### Site Generator (`src/anteo/website/site_generator.clj`)
- Processes Hiccup templates with includes system
- Extracts image URLs with query parameters from HTML and CSS
- Generates replacement URLs for processed images
- Handles nested template processing

### Image Processor (`src/anteo/website/image_processor.clj`)
- Processes images based on URL query parameters
- Supports resizing, format conversion, and quality adjustment
- Handles WebP and SVG formats with proper libraries
- Outputs to `.temp/images` directory for later copying
- Uses consistent key names throughout (`source-path`, `width`, `height`, etc.)

### Core Build System (`src/anteo/website/core.clj`)
- Loads site configuration from EDN files
- Manages templates (EDN and Clojure files)
- Orchestrates the complete build process
- Handles asset bundling via esbuild
- Supports dev/prod build modes
- Integrates image processing into HTML generation

### Asset Bundling
- CSS bundling with `@import` resolution via esbuild
- JavaScript bundling with source maps (dev) or minification (prod)
- Uses `npx` to avoid global tool installation
- External references preserved for image URLs in CSS

### Development Server
- Browser-sync based (via npx)
- Live reload on file changes
- Non-blocking process management with Clojure 1.12's process API
- No JVM web server dependencies

## CLI Interface

```bash
clojure -M:run path/to/site.edn [options]

Options:
  --output-dir PATH  Output directory (default: dist relative to site)
  --mode MODE        Build mode: dev or prod (default: prod)
  --serve            Start dev server after build (implies --mode dev)
```

## Build Modes

### Development Mode (`--mode dev`)
- CSS: Bundled but not minified
- JavaScript: Bundled with source maps
- Images: Processed as needed
- Server: Available with `--serve` flag

### Production Mode (`--mode prod`, default)
- CSS: Bundled and minified
- JavaScript: Bundled and minified as `bundle.min.js`
- Images: Processed as needed
- Server: Not typically used

## Key Design Principles

- **Data-Driven**: Everything is data (EDN) or functions that produce data
- **Declarative**: Site structure is declared, not programmed
- **Separation**: Clear separation between site definition (`site/`) and generator code (`src/`)
- **Tool/Site Split**: Build tool dependencies at root, site content under `site/`
- **Modern Tooling**: Uses best-in-class tools (esbuild, browser-sync) via npx
- **Extensible**: Easy to add new templates, content, languages, or processors

## Template Directives

The site generator supports the following template directives:

### `:sg/body`
Replaces the directive with the page content. If the content is a vector of vectors (multiple elements), they are spliced in place.

Example:
```clojure
[:main [:sg/body]]
;; With content: [:p "Hello"]
;; Becomes: [:main [:p "Hello"]]
```

### `:sg/include`
Includes a named template component from the includes map.

Example:
```clojure
[:div [:sg/include :footer]]
;; With includes: {:footer [:footer "© 2024"]}
;; Becomes: [:div [:footer "© 2024"]]
```

## Image Processing

Images can be processed on-demand using URL query parameters:

```html
<img src="/assets/images/hero.jpg?size=800x600&format=webp&quality=85">
<!-- Becomes: /assets/images/hero-800x600.webp -->
```

Supported parameters:
- `size`: `WIDTHxHEIGHT` or `WIDTHx` (maintain aspect ratio)
- `format`: Target format (jpg, png, webp)
- `quality`: JPEG/WebP quality (1-100)

## Example Flow

1. `site.edn` declares that `about` content should use `base` template and output to `/about.html`
2. Generator loads `site/templates/base.edn` (or `.clj`)
3. Generator loads `site/content/no/about.edn` (or `.md`)
4. CSS and JS assets are bundled
5. Content is merged with template using site generator rules
6. Image processor scans HTML for image URLs with parameters
7. Images are processed and URLs are replaced
8. Final HTML is written to `dist/about.html`
