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

## Recently Completed
- [x] Added Norwegian privacy policy (`/privacy.html`)
- [x] Added English privacy policy (`/en/privacy.html`)
- [x] Added Norwegian terms of service (`/terms.html`)
- [x] Added English terms of service (`/en/terms.html`)
- [x] Updated footer links to point to correct URLs
- [x] Fixed background-image URLs in deployment transform for GitHub Pages
