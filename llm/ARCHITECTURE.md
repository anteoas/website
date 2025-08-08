# Anteo Website Architecture

## Overview

The Anteo website is a content-driven static site generator built in Clojure. It transforms content files (EDN/Markdown) and templates (Hiccup) into a static website with multi-language support.

## Key Components

### 1. Site Generator Core (`anteo.website.site-generator`)
Processes Hiccup templates with special directives:
- `:sg/body` - Injects page content
- `:sg/include` - Includes other templates (footer, nav, etc.)
- `:sg/get` - Retrieves values from content data
- `:sg/img` - Processes images with transformations

The generator handles both single elements and vectors of elements transparently.

### 2. Content System
- **Location**: `site/content/{{lang}}/`
- **Formats**: EDN (data) and Markdown (with frontmatter)
- **Content-driven**: Content files specify which template to use
- **Language support**: Each language has its own content directory

### 3. Template System
- **Location**: `site/templates/`
- **Format**: EDN files containing Hiccup data structures
- **Types**: Page templates (landing, about) and includes (footer, nav)
- **Reusable**: Any template can be included in any other

### 4. Build Pipeline

```
site.edn → Load Config → Load Templates → For each language:
                                          → Load Content
                                          → Process Templates
                                          → Generate HTML
                                          → Process Images
                                          → Bundle Assets
                                          → Write Output
```

### 5. Asset Processing
- **CSS/JS**: Bundled with esbuild via npx
- **Images**: On-demand processing based on URL parameters
- **Static files**: Copied as-is

## Directory Structure

```
site/
├── site.edn          # Site configuration
├── templates/        # Hiccup templates
├── content/          # Content by language
│   └── no/
│       ├── landing.edn
│       └── about.edn
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

## Key Design Decisions

1. **Content-driven**: Content files drive what gets rendered, not templates
2. **Data-first**: Everything is EDN data or functions that produce data
3. **No magic**: All templates can be includes, no hardcoded lists
4. **Language-aware**: Built for multi-language from the start
5. **Tool agnostic**: Uses best-in-class tools (esbuild) via npx

## Extension Points

### Adding a New Directive
1. Add test case to `site_generator_test.clj`
2. Add handling in `process` function
3. Document usage

### Adding a New Content Type
1. Add loading logic to `load-content-file`
2. Handle in `build-site` if special processing needed

### Adding a New Language
1. Add to `:lang` in `site.edn` 
2. Create `content/{{lang}}/` directory
3. Translate content files

## Areas for Future Investigation

1. **SCI Templates**: Clojure template support is stubbed out but not implemented
2. **Incremental Builds**: Currently rebuilds everything on each run
3. **Watch Mode**: No automatic rebuilding on file changes
4. **Nested Content**: Only single-level content directories supported
5. **Asset Optimization**: Images processed sequentially, could be parallel

## Testing Strategy

- **Unit tests**: Template processing logic (`site_generator_test.clj`)
- **Integration tests**: Full build via REPL commands
- **Visual verification**: Manual inspection of generated site

## Dependencies

### Clojure Libraries
- `hiccup2` - HTML generation
- `markdown-clj` - Markdown parsing  
- `babashka/fs` - File operations
- `sci` - Sandboxed Clojure evaluation (not yet used)

### External Tools (via npx)
- `esbuild` - CSS/JS bundling
- `browser-sync` - Development server
