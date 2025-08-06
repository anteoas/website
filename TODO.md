# Anteo Website TODO

## Missing Pages (404 errors)
- [x] Create `/personvern` (Privacy Policy) page - DONE (created as privacy.html)
- [x] Create `/brukervilkar` (Terms of Service) page - DONE (created as terms.html)
- [ ] Create `/products/logistics/index.html` or fix link to use `/products.html#logistics`
- [ ] Create `/products/fish-health/index.html` or fix link to use `/products.html#fish-health`

## Stub Content
- [ ] Add actual content to `/sustainability.html` (currently shows "Innhold kommer...")

## Navigation Issues
- [ ] Product category links (`/products/logistics` and `/products/fish-health`) should either:
  - Link to the main products page with anchors
  - Have their own index pages created
  - Use the existing product-groups pages

## Suggestions
- [x] English versions of privacy policy and terms of service - DONE
- [ ] Add more news articles to populate the news section
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
