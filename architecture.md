# Anteo Website Architecture

## Overview

The Anteo website is built using a data-driven static site generator. The entire site definition lives under the `site/` directory, while the generator library code is under `src/`.

## Site Structure

### Site Configuration (`site.edn`)

The `site.edn` file is the entry point that defines:
- **Template mappings**: Which wrapper template to use (e.g., `base`)
- **Page routes**: Maps content to output paths (e.g., `about` → `/about.html`, `landing` → `/index.html`)
- **Language support**: Lists supported languages with their metadata
- **Processors**: Which processors to apply (e.g., `image-processor`)

### Templates (`site/templates/`)

Templates define the structure and layout of pages:
- **Format**: Can be `.edn` files (static Hiccup data) or `.clj` files (functions returning Hiccup)
- **Loading**: All templates are loaded into a map at build start
- **Composition**: Templates can reference and include other templates

### Content (`site/content/{{lang}}/`)

Content is organized by language:
- **Formats**: 
  - `.md` files: MultiMarkdown with metadata header
  - `.edn` files: Direct EDN data structures
- **Processing**: 
  - Markdown content is parsed into EDN: `{:markdown/content "...", :other :metadata}`
  - All content becomes EDN before template processing

## Build Process

1. **Initialize**: Read `site.edn` for configuration
2. **Load Templates**: Load all templates from `site/templates/` into memory
3. **Process Content**: For each language:
   - Load content files from `site/content/{{lang}}/`
   - Parse markdown files (metadata + content)
   - Load EDN files directly
4. **Apply Templates**: Combine content with templates according to mappings
5. **Run Processors**: Apply configured processors (e.g., image-processor for image optimization)
6. **Generate Output**: Write HTML files to output directory according to route mappings

## Key Design Principles

- **Data-Driven**: Everything is data (EDN) or functions that produce data
- **Declarative**: Site structure is declared, not programmed
- **Separation**: Clear separation between site definition (`site/`) and generator code (`src/`)
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

## Example Flow

1. `site.edn` declares that `about` content should use `base` template and output to `/about.html`
2. Generator loads `site/templates/base.edn` (or `.clj`)
3. Generator loads `site/content/no/about.edn` (or `.md`)
4. Content is merged with template using site generator rules
5. Image processor scans HTML for image optimization instructions
6. Final HTML is written to `/about.html`