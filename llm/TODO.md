# TODO

## Completed Tasks

### 2024-08-08 - Template and Content System Improvements

- [x] Implement :sg/each directive for iterating over collections
  - Added support for :limit, :order-by options
  - Handles nested templates and :sg/include
  - Fixed issue with :sg/each results not being flattened properly in vector-of-vectors
  - Fixed issue with :sg/each in :sg/body contexts

- [x] Extract templates and content from landing page
  - Created hero.edn template for reusable hero sections
  - Separated product and news content into individual files
  - Updated landing.edn to use :sg/each for dynamic content

- [x] Add SCI support for Clojure function templates
  - Successfully loads and evaluates .clj template files
  - team-member.clj works as a function template

- [x] Fix image processing error
  - Resolved issue with double-wrapped vectors from :sg/each
  - Fixed vector-of-vectors processing to properly flatten results

- [x] Improve :sg/get error handling
  - Returns key name as string when value not found (e.g., "missing-key")
  - Prints warning: "WARNING: :sg/get key not found: <key>"
  - With :verbose flag, also prints context for debugging

### 2024-08-08 - Image Processor Rewrite

- [x] Replace Thumbnailator with imgscalr library
  - Thumbnailator was producing poor quality PNG images with artifacts
  - imgscalr is specifically designed for high-quality image scaling
  
- [x] Fix PNG scaling issues
  - PNG images with indexed color palettes were getting black stripes
  - Using imgscalr's ULTRA_QUALITY method produces much better results
  - File sizes increased appropriately (e.g., 295x295 went from 5.9KB to 16KB)

- [x] Simplify image processor API
  - Removed format conversion support
  - Removed quality parameter (not needed for scaling)
  - Focus solely on high-quality scaling

- [x] Add aspect ratio protection
  - By default, images maintain aspect ratio even with width AND height specified
  - Added :allow-stretch flag for cases where stretching is explicitly desired
  - Prevents accidental image distortion

### 2024-08-08 - Build System Improvements

- [x] Fix CSS bundling output path issue
  - CSS was being written to site/dist/assets/css/ instead of dist/assets/css/
  - Added :output-path to config alongside :root-path
  - Calculate absolute output-path early in load-site-data
  - All functions now use absolute paths, eliminating directory context issues

## Pending Tasks

- [ ] Implement :sg/if directive for conditional rendering
- [ ] Add :sg/unless directive
- [ ] Implement :sg/for with index/first/last metadata
- [ ] Add template inheritance/extension system
- [ ] Implement partial templates
- [ ] Add caching for processed templates
- [ ] Implement watch mode for development
- [ ] Add incremental builds
- [ ] Parallelize image processing
- [ ] Add support for nested content directories

## Future Considerations

- [ ] Template validation and error reporting
- [ ] Template debugging tools
- [ ] Performance optimization for large sites
- [ ] Integration with CI/CD pipelines
- [ ] Documentation generation from templates
