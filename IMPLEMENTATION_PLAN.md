# Anteo Website - Clojure Implementation Plan

## Overview
Complete rewrite of the Anteo static site generator from Node.js to Clojure, focusing on simplicity, data-driven design, and leveraging Clojure's strengths.

## Current Status ✅
- [x] Basic build system with Hiccup templates
- [x] Support for both Markdown and EDN content files
- [x] Dev server with auto-reload (ring-refresh)
- [x] File watching with automatic rebuild
- [x] Asset copying (CSS, images, etc.)

## Architecture Decisions

### 1. **Content Format**
- **EDN files** for structured content (landing pages, complex layouts)
- **Markdown files** for simple content (blog posts, basic pages)
- Frontmatter in YAML (for Markdown) to ease migration
- All content is data-first, making it easy to query and transform

### 2. **Templates**
- **Hiccup** instead of Handlebars - templates are Clojure functions
- Components are just functions that return Hiccup vectors
- No separate template files - everything is code
- Full power of Clojure for logic and composition

### 3. **File Structure** (Simplified)
```
anteo-site/
├── deps.edn          # Dependencies
├── build.clj         # Build logic
├── dev.clj           # Dev server
├── content/          # All content
│   ├── no/          # Norwegian
│   └── en/          # English
├── src/              # Clojure source
│   ├── templates.clj # All templates
│   └── components.clj # Reusable components
├── assets/           # Static files
└── dist/            # Output
```

## Implementation Phases

### Phase 1: Core Foundation ✅
- [x] Basic build script
- [x] Hiccup templates
- [x] EDN/Markdown parsing
- [x] Dev server

### Phase 2: Content Types & Routing (Next)
- [ ] Implement all content types (page, article, product, person)
- [ ] URL generation based on content type
- [ ] Proper routing structure matching current site
- [ ] Navigation generation from content

### Phase 3: Templates & Components
- [ ] Port all templates to Hiccup
  - [ ] Landing page with all sections
  - [ ] News listing page
  - [ ] News article page
  - [ ] Product pages
  - [ ] Team page
  - [ ] About/contact pages
- [ ] Create reusable components
  - [ ] Header/navigation
  - [ ] Footer
  - [ ] News card
  - [ ] Product card
  - [ ] Team member card

### Phase 4: Data & Content Migration
- [ ] Implement YAML frontmatter parser
- [ ] Migrate all content from old structure
- [ ] Convert complex pages to EDN
- [ ] Implement site.json functionality in EDN

### Phase 5: Multi-language Support
- [ ] Process both language directories
- [ ] Language-specific URLs (no prefix for Norwegian)
- [ ] Language switcher component
- [ ] Translated strings system

### Phase 6: Image Processing
- [ ] Parse image URLs with query parameters
- [ ] Implement image resizing/optimization
- [ ] Cache processed images
- [ ] WebP conversion support

### Phase 7: Production Features
- [ ] Production build optimizations
- [ ] CSS/JS minification
- [ ] GitHub Pages deployment
- [ ] CNAME file generation
- [ ] Base path configuration

### Phase 8: Advanced Features
- [ ] Hot reload with WebSocket (better than polling)
- [ ] Link checker
- [ ] Sitemap generation
- [ ] RSS feed for news
- [ ] Search functionality

## Key Improvements Over Node.js Version

1. **Simpler Architecture**
   - No callback hell
   - Immutable data flow
   - Pure functions throughout

2. **Better Developer Experience**
   - REPL-driven development
   - Test any component interactively
   - Clear error messages
   - No npm/node_modules complexity

3. **More Flexible Content**
   - EDN allows rich data structures
   - Content as data, not strings
   - Easy to add new content types

4. **Maintainability**
   - All templates in one language (Clojure)
   - No context switching between languages
   - Fewer dependencies
   - Clearer data flow

## Technical Decisions

### Dependencies (Minimal)
- **markdown-clj** - Markdown parsing
- **hiccup** - HTML generation
- **ring** - Web server
- **babashka/fs** - File operations

### No Heavy Frameworks
- No complex build tools
- No bundlers needed
- Direct file operations
- Simple and transparent

### Development Workflow
1. Edit content (EDN/Markdown)
2. Save file
3. Watcher detects change
4. Rebuild runs automatically
5. Browser refreshes via ring-refresh

## Migration Strategy

1. **Keep both systems running** during migration
2. **Migrate incrementally** - one content type at a time
3. **Start with simple pages** (about, contact)
4. **Move to complex pages** (landing, products)
5. **Finish with dynamic content** (news, team)

## Next Immediate Steps

1. Create proper template namespace with all page templates
2. Implement content type routing from build.config
3. Port the landing page template completely
4. Add YAML parser for existing frontmatter
5. Create navigation component

## Long-term Vision

- **Everything as data** - content, config, templates
- **Composable components** - build pages from small parts
- **REPL-first development** - test everything interactively
- **Minimal dependencies** - only what's essential
- **Clear and simple** - easy to understand and modify

---

*This plan is a living document and will be updated as the implementation progresses.*