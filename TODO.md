# Anteo Website TODO

## Missing Pages (404 errors)
- [x] Create `/personvern` (Privacy Policy) page - DONE (created as privacy.html)
- [x] Create `/brukervilkar` (Terms of Service) page - DONE (created as terms.html)
- [ ] Create `/products/logistics/index.html` or fix link to use `/products.html#logistics`
- [ ] Create `/products/fish-health/index.html` or fix link to use `/products.html#fish-health`

## Stub Content
- [x] Add actual content to `/sustainability.html` - DONE (2025-01-20)
  - Created full sustainability page with SDG content from old site
  - Added hero section and proper styling
  - Need to add: hero-sustainability.jpg and SDG icon images

## Navigation Issues
- [ ] Product category links (`/products/logistics` and `/products/fish-health`) should either:
  - Link to the main products page with anchors
  - Have their own index pages created
  - Use the existing product-groups pages

## Suggestions
- [x] English versions of privacy policy and terms of service - DONE
- [x] Add more news articles to populate the news section - DONE (2025-01-20)
  - Added 6 lorem ipsum articles for testing
- [ ] Consider if product category pages are needed or if the main products page is sufficient

## Mobile Improvements (Already Implemented)
- [x] Hamburger menu for mobile navigation
- [x] Improved footer layout on mobile
- [x] Better news card design on mobile
- [x] Fixed image/text order in hero sections
- [x] Full-width images on mobile
- [x] Consistent button styling
- [x] Reduced spacing between footer elements

## Technical Debt
- [x] Image references in CSS need base path handling for GitHub Pages deployment - FIXED
- [ ] Consider lazy loading for images below the fold
- [ ] Add meta descriptions to all pages for SEO
- [ ] Consolidate `site.json` and `navigation.json` into `data.json` (identified 2025-01-20)
  - Currently split artificially, causing confusion about where to put strings
  - Need "backTo" translation for breadcrumbs
  - Scope: ~20-30 lines of code changes

## Recently Completed (Previous Sessions)
- [x] Added Norwegian privacy policy (`/privacy.html`)
- [x] Added English privacy policy (`/en/privacy.html`)
- [x] Added Norwegian terms of service (`/terms.html`)
- [x] Added English terms of service (`/en/terms.html`)
- [x] Updated footer links to point to correct URLs
- [x] Fixed background-image URLs in deployment transform for GitHub Pages

## Session: Team Section & Hero Improvements (2025-01-17)

### Team Section Redesign
- [x] Updated team section layout from vertical cards to horizontal cards
- [x] Changed image/text ratio to 1/3 image, 2/3 text
- [x] Fixed image file references (.png → .jpg) for missing team photos
- [x] Added bio content extraction from markdown files
- [x] Optimized team photo dimensions (600x800 → 400x600)
- [x] Created two-column grid layout for desktop
- [x] Made team section use full container width (1400px)
- [x] Added responsive design (single column on tablet/mobile)
- [x] Removed education subsections from all team member profiles

### Hero Block Implementation
- [x] Created `::: hero` block syntax for markdown pages
- [x] Added support for arbitrary CSS properties in hero blocks
- [x] Implemented automatic image inclusion when no URL specified
- [x] Added gradient overlay support for better text readability
- [x] Fixed hero positioning to sit flush against header
- [x] Added text-align support (left/center/right)
- [x] Made text-align responsive (centers on mobile)
- [x] Applied to about page with gradient and right-aligned text

### Build System Improvements
- [x] Extracted theme colors from CSS at build time
- [x] Added theme-color meta tag for mobile browser chrome
- [x] Refactored build to use global template data
- [x] Updated image processor to handle compound background-image values
- [x] Added image optimization for hero images using query parameters

### Testing
- [x] Added tests for background-image extraction and replacement
- [x] Added tests for compound background-image with gradients
- [x] All tests passing (52 total)

## Session: Sustainability & News Pages (2025-01-20)

### Sustainability Page Implementation
- [x] Created Norwegian sustainability page with content from old site
- [x] Structured content around 4 UN SDGs (9, 12, 14, 17)
- [x] Added hero section with gradient overlay
- [x] Created two-column layout for intro section with SDG icons
- [x] Used existing `value-block` pattern for SDG content sections
- [x] **Images needed**: hero-sustainability.jpg, sdg-9-icon.png, sdg-12-icon.png, sdg-14-icon.png, sdg-17-icon.png

### News System Improvements
- [x] Created dedicated news listing page (`/news.html`)
- [x] Implemented `news-listing` template with hero section
- [x] Added kebab-case to camelCase conversion for layout names in templates
- [x] Fixed hero positioning issues (margin-top: -120px to counteract main padding)
- [x] Created shared `news-card` partial template for consistency
- [x] Consolidated news card CSS - removed duplication between landing and listing pages
- [x] Added zoom effect on hover for news card images
- [x] Refactored `getLatestNews()` to `getNews()` with options parameter
  - `limit`: number of items (null = all)
  - `sortOrder`: 'desc' or 'asc'
- [x] **Images added**: hero-news.png

### CSS Refactoring
- [x] Created general `.title` class to replace duplicate styles
- [x] Consolidated page-specific main padding rules
- [x] Improved section-header spacing with margin-top: 4rem
- [x] Fixed news listing layout spacing issues

### Build System Updates
- [x] Added partial registration for Handlebars templates
- [x] Pass `layout` variable to base template for body class generation
- [x] Every page now gets `{layout}-page` body class

### Outstanding Issues from Session
- [ ] Individual news article template could be simplified or removed
  - Currently just adds back link and metadata display
  - Could use standard page template instead
- [ ] Back link in news articles points to `/news/` but should be `/news.html`
- [ ] Need translations for "Back to" / "Tilbake til" strings
- [ ] Consider breadcrumb system using navigation.json data
