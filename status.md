# Project Status

## Current State (August 8, 2025)

The Anteo website static site generator has been successfully ported from the Node.js implementation to Clojure. The core functionality is working and the site builds correctly.

## Completed Features

### ✅ Core Site Generation
- EDN-based configuration loading
- Template system with Hiccup support
- Markdown content parsing with metadata
- Multi-language support
- Template includes and body replacement

### ✅ Image Processing
- URL-based image transformation (size, format, quality)
- WebP and SVG support
- Automatic URL replacement in HTML
- Proper temporary file handling
- Consistent data structure throughout

### ✅ Asset Bundling
- CSS bundling with `@import` resolution
- JavaScript bundling with esbuild
- Development mode (sourcemaps) and production mode (minification)
- Uses npx to avoid global dependencies

### ✅ Development Experience
- Browser-sync dev server with live reload
- CLI with mode flags (dev/prod)
- Custom output directory support
- `--serve` flag implies dev mode

### ✅ Testing
- Comprehensive test suite for site generator
- Image URL extraction tests
- All tests passing

## Working But Needs Enhancement

### ⚠️ SCI Template Support
- SCI is integrated but Clojure templates are currently skipped
- Need to properly set up the SCI context with Hiccup functions
- `team-member.clj` template is not being used

### ⚠️ Content Loading
- Currently only supports single-level content directories
- May need support for nested content organization

## Not Yet Implemented

### ❌ Watch Mode
- No file watching for automatic rebuilds
- Would need Java WatchService or similar

### ❌ Incremental Builds
- Always rebuilds everything
- No caching or dependency tracking

### ❌ CSS/JS Source Maps in Production
- Only dev mode has source maps
- Might want source maps in prod for debugging

### ❌ Advanced Image Processing
- No smart cropping or focal point support
- No lazy loading markup generation
- No responsive image sets

### ❌ Build Optimization
- No parallel processing
- No build caching
- Sequential image processing

## Technical Debt

1. **Error Handling**: Some operations could use better error messages
2. **Logging**: Currently uses println, could benefit from proper logging
3. **Configuration Validation**: No schema validation for site.edn
4. **Performance**: Image processing is sequential, could be parallelized

## Dependencies

### Clojure Libraries
- `clojure 1.12.1` - Core language (using new process API)
- `markdown-clj` - Markdown parsing
- `hiccup 2.0.0-RC2` - HTML generation
- `babashka/fs` - File system utilities
- `sci` - Sandboxed Clojure evaluation
- `thumbnailator` - Image processing
- `twelvemonkeys` - Additional image format support

### Node.js Tools (via npx)
- `esbuild` - CSS/JS bundling
- `browser-sync` - Development server

## Next Steps (Prioritized)

1. **Fix SCI Templates**: Get Clojure templates working properly
2. **Add Watch Mode**: Implement file watching for better dev experience
3. **Improve Error Messages**: Better user feedback when things go wrong
4. **Add Build Caching**: Speed up rebuilds by tracking changes
5. **Parallelize Image Processing**: Use pmap or similar for better performance

## Migration Notes

The migration from Node.js to Clojure is functionally complete. The main differences:

1. **No Handlebars**: Using Hiccup + directives instead
2. **No Webpack**: Using esbuild for simpler bundling
3. **Process management**: Using Clojure 1.12's process API instead of Node's child_process
4. **File handling**: Using Java NIO + babashka/fs instead of Node's fs

## Usage

### Development
```bash
# Install Node dependencies (one time)
npm install

# Build and serve for development
clojure -M:run site/site.edn --serve

# Or separate terminals:
clojure -M:run site/site.edn --mode dev
npm run dev
```

### Production
```bash
# Build for production
clojure -M:run site/site.edn

# Build to custom directory
clojure -M:run site/site.edn --output-dir /path/to/output
```

## Summary

The Clojure implementation successfully replicates all core functionality of the Node.js version while providing a more consistent, data-driven architecture. The tool is ready for production use, with some nice-to-have features that can be added incrementally.
