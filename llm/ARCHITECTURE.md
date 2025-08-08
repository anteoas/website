# Anteo Website Architecture

## Overview

The Anteo website is a content-driven static site generator built in Clojure. It transforms content files (EDN/Markdown) and templates (Hiccup) into a static website with multi-language support.

## Key Components

### 1. Site Generator Core (`anteo.website.site-generator`)
Processes Hiccup templates with special directives:
- `:sg/body` - Injects page content, handles vector-of-vectors with proper flattening
- `:sg/include` - Includes other templates (footer, nav, etc.), processes included content recursively
- `:sg/get` - Retrieves values from content data, returns key name as string if not found
- `:sg/img` - Processes images with transformations
- `:sg/each` - **NEW**: Iterates over collections with support for :limit and :order-by

The generator handles both single elements and vectors of elements transparently.

### 2. Content System
- **Location**: `site/content/{{lang}}/`
- **Formats**: EDN (data) and Markdown (with frontmatter)
- **Content-driven**: Content files specify which template to use
- **Language support**: Each language has its own content directory
- **Subdirectories**: **NEW**: Supports organizing content by type (products/, news/)

### 3. Template System
- **Location**: `site/templates/`
- **Formats**: 
  - EDN files containing Hiccup data structures
  - **NEW**: CLJ files containing functions (evaluated with SCI)
- **Types**: Page templates (landing, about) and includes (footer, nav, hero)
- **Reusable**: Any template can be included in any other
- **Function templates**: Can contain logic for complex rendering

### 4. Build Pipeline

```
site.edn → Load Config → Load Templates → For each language:
                                          → Load Content (including subdirs)
                                          → Process Templates
                                          → Generate HTML
                                          → Process Images
                                          → Bundle Assets
                                          → Write Output
```

### 5. Asset Processing
- **CSS/JS**: Bundled with esbuild via npx
- **Images**: High-quality scaling with imgscalr library
- **Static files**: Copied as-is

### 6. Image Processing (`anteo.website.image-processor`)
- **Library**: imgscalr (replaced Thumbnailator)
- **Quality**: Uses ULTRA_QUALITY method for best results
- **Features**:
  - High-quality image scaling
  - Preserves original format (no conversion)
  - Maintains aspect ratio by default
  - Generates placeholders for missing images
- **API**: Simple scaling-focused interface
  ```clojure
  (process-image {:source-path "image.png"
                  :width 300
                  :height 200
                  :output-dir "dist/"
                  :allow-stretch false}) ; default
  ```

## Directory Structure

```
site/
├── site.edn          # Site configuration
├── templates/        # Hiccup templates
│   ├── base.edn
│   ├── landing.edn
│   ├── hero.edn      # NEW: Reusable hero component
│   └── team-member.clj # Function template
├── content/          # Content by language
│   └── no/
│       ├── landing.edn
│       ├── about.edn
│       ├── products/     # NEW: Content subdirectories
│       │   ├── anteo-logistikk.edn
│       │   └── anteo-fiskehelse.edn
│       └── news/         # NEW: Content subdirectories
│           ├── 2024-04-15-partnerskap.edn
│           └── ...
└── assets/           # Static assets
    ├── css/
    ├── js/
    └── images/
```

## Configuration (`site.edn`)

```clojure
{:wrapper :base        ; Wrapper template for all pages
 :lang {:no {:name "Norsk" :default true}}
 :render {:landing "/"  ; Maps content to output paths
          :about "/about.html"}
 :image-processor true}
```

## Template Directives

### :sg/each
Iterates over a collection with optional limiting and ordering:
```clojure
[:sg/each :products :limit 3 :order-by [:date :desc]
  [:div [:sg/get :title]]]
```

### :sg/get
Retrieves values with fallback behavior:
```clojure
[:sg/get :title]           ; Returns "title" if not found
[:sg/get :user :name]      ; Returns "user.name" if not found
```
With `:verbose true` in content, logs full context for debugging.

## Key Design Decisions

1. **Content-driven**: Content files drive what gets rendered, not templates
2. **Data-first**: Everything is EDN data or functions that produce data
3. **No magic**: All templates can be includes, no hardcoded lists
4. **Language-aware**: Built for multi-language from the start
5. **Tool agnostic**: Uses best-in-class tools (esbuild) via npx
6. **Proper flattening**: :sg/each and :sg/body results are flattened in parent contexts

## Extension Points

### Adding a New Directive
1. Add test case to `site_generator_test.clj`
2. Add handling in `process` function
3. Document usage

### Adding a New Content Type
1. Create subdirectory under content/{{lang}}/
2. Add :type field to content files
3. Content automatically loaded and merged

### Adding a New Language
1. Add to `:lang` in `site.edn` 
2. Create `content/{{lang}}/` directory
3. Translate content files

## Testing Strategy

- **Unit tests**: Template processing logic (`site_generator_test.clj`)
- **TDD approach**: Write failing tests first, then implement
- **Integration tests**: Full build via REPL commands
- **Visual verification**: Manual inspection of generated site

## Dependencies

### Clojure Libraries
- `hiccup2` - HTML generation
- `markdown-clj` - Markdown parsing  
- `babashka/fs` - File operations
- `sci` - Sandboxed Clojure evaluation (used for .clj templates)
- `imgscalr` - High-quality image scaling

### External Tools (via npx)
- `esbuild` - CSS/JS bundling
- `browser-sync` - Development server

## Recent Improvements (2024-08-08)

1. **:sg/each directive**: Full implementation with limit and ordering
2. **SCI integration**: Function templates now work (.clj files)
3. **Content subdirectories**: Better organization for products, news, etc.
4. **Improved error handling**: :sg/get shows missing keys with warnings
5. **Fixed vector-of-vectors**: Proper flattening prevents Hiccup errors
6. **Image processor rewrite**: Switched from Thumbnailator to imgscalr for better quality
7. **Aspect ratio protection**: Images maintain proportions by default
