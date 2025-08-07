# Anteo Website TODO

## Current Issues
- [x] Fix product category links - DONE (Created collection pages as products-logistics.html and products-fish-health.html)
- [ ] Update product category navigation to use new collection pages
- [ ] Fix translation helper (`t`) - Currently showing "strings.ui.readMore" instead of "Les mer"
- [ ] Add missing images: hero-sustainability.jpg and SDG icon images

## Technical Debt
- [ ] Consider lazy loading for images below the fold
- [ ] Add meta descriptions to all pages for SEO

## Debugging Notes
When encountering issues with the new build system:
1. Check old build files in git history for reference implementation
2. Use `grep` to find where functionality was previously implemented
3. Common issues:
   - Data structure mismatches (frontmatter was nested, now flattened)
   - Missing configuration (languageConfig, etc.)
   - Template references to old structure (landing.hero1 vs hero1)

## Session: Content Architecture Refactoring (2025-01-20)

### Completed Today
- [x] Fixed hero background-image deployment transform issue
  - Added tests for compound background-image values
  - Fixed protocol-relative URL handling
  - All tests passing
- [x] Implemented new content-type based build system
  - All content loaded once into memory
  - Render definitions in config determine what generates pages
  - Templates receive entire content store for querying
- [x] Simplified data structure
  - Frontmatter fields now at top level (not nested)
  - Markdown content under 'content' key
  - Templates use `{{name}}` instead of `{{frontmatter.name}}`
- [x] Merged site.config.js into build.config.js
  - One config file for all non-translatable configuration
  - site.json remains per-language for translatable content
- [x] Fixed missing processed images
  - Added copy step from .temp/images to dist/assets/images
- [x] Fixed language switcher
  - Added languageConfig to page data from build.config.js

### Build System Architecture
The new build system follows a simple pattern:
1. Load all content for a language into `contentStore`
2. Check `build.config.js` renders section to see which types generate pages
3. Render each item, passing the entire contentStore

Key differences from old system:
- No more ContentStore class - just plain objects
- No complex template data providers
- Templates can query any content using helpers like `{{#each (getContent 'person')}}`
- Content types determine behavior through config, not folder structure
