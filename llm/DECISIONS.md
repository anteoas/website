# Decision Log

## Core Development Principles

### Minimal Implementation First

**Decision**: Always implement EXACTLY what was asked, nothing more.

**Rationale**:
- Prevents scope creep and unexpected behavior
- Easier to review and understand changes
- Reduces risk of introducing bugs
- Respects the human's vision for the project

**Examples**:
- If asked for `:sg/get` with default value, implement ONLY that - not nested paths, not multiple defaults
- If asked to fix a bug, fix ONLY that bug - don't refactor surrounding code
- If asked for feature A, implement A - don't also add features B, C, and D

**Process**:
1. Understand the exact requirement
2. Write minimal tests for ONLY that requirement
3. Show tests and results to human
4. Wait for approval before implementing
5. Implement the minimal solution that makes tests pass

## 2024-08-08 - Template Processing Decisions

### :sg/each Directive Implementation

**Decision**: Implement :sg/each for iterating over collections with support for limiting and ordering.

**Rationale**: 
- Needed for dynamic content like products and news listings
- Follows similar patterns to other template engines (e.g., Mustache loops)
- Supports common use cases like "show latest 3 news items"

**Implementation Details**:
- Syntax: `[:sg/each :collection-key :option value ... template]`
- Options: `:limit N`, `:order-by [:field :asc/:desc ...]`
- Returns flattened results to avoid nesting issues

### Vector-of-Vectors Processing

**Decision**: When processing vector-of-vectors (multiple top-level elements), flatten :sg/each and :sg/body results.

**Rationale**:
- Landing page template has multiple top-level elements
- :sg/each returning `[[:div "A"] [:div "B"]]` should splice into parent, not nest
- Prevents "X is not a valid element name" Hiccup errors

**Implementation**: Added flattening logic in two places:
1. When processing vector-of-vectors directly
2. When processing children that contain :sg/each or :sg/body

### :sg/get Missing Value Behavior

**Decision**: Return key name as string when value not found, with logging.

**Rationale**:
- Better than showing `:sg/get` directives in output
- Helps debugging by showing what key was expected
- Non-breaking for existing templates

**Implementation**:
- Missing `:foo` returns `"foo"`
- Missing `[:foo :bar]` returns `"foo.bar"`
- Logs warning to console
- With `:verbose true`, also logs full context

### SCI Integration for Function Templates

**Decision**: Use SCI (Small Clojure Interpreter) to evaluate .clj template files.

**Rationale**:
- Allows more complex template logic than EDN
- Sandboxed execution for safety
- Already a dependency, minimal overhead

**Implementation**: 
- load-template checks for .clj extension
- Evaluates with sci/eval-string
- Returns function that can be called with data

### Content Organization

**Decision**: Support subdirectories for content types (products/, news/).

**Rationale**:
- Better organization for sites with many content items
- Allows type-specific handling
- Natural grouping for related content

**Implementation**:
- load-page-content automatically loads subdirectories
- Merges into main content as :products, :news, etc.
- Content files include :type field for identification

## 2024-08-08 - Output Path Management

### Absolute Output Path Calculation

**Decision**: Calculate absolute output-path alongside root-path in load-site-data.

**Rationale**:
- Eliminates directory context issues when running tools from different locations
- CSS bundling was writing to site/dist/ instead of root dist/
- Consistent with how root-path is handled
- Makes all path handling explicit and unambiguous

**Implementation**:
- load-site-data now takes output-dir parameter
- Calculates absolute output-path and adds to config
- All functions use absolute paths from config
- No more relative path confusion when running esbuild from site directory

## 2024-08-08 - Image Processing Decisions

### Switch from Thumbnailator to imgscalr

**Decision**: Replace Thumbnailator with imgscalr for image processing.

**Rationale**:
- Thumbnailator was producing poor quality results for PNG images with indexed color palettes
- Images had visible artifacts including black vertical stripes
- imgscalr is specifically designed for high-quality image scaling
- Using ULTRA_QUALITY method produces significantly better results

**Evidence**:
- 295x295 PNG scaling: Thumbnailator produced 5.9KB file with artifacts
- Same operation with imgscalr: 16KB file with clean scaling
- 150x150 scaling improved from 2.9KB (poor) to 7.3KB (good)

### Simplify Image Processing API

**Decision**: Remove format conversion and quality parameters from image processor.

**Rationale**:
- Format conversion and quality reduction can be done out-of-band if needed
- Simplifies the API to focus on one thing: high-quality scaling
- Reduces complexity and potential for user error

**Implementation**:
- Removed `format` parameter
- Removed `quality` parameter
- Images always saved in original format
- Only operations are scaling and placeholder generation

### Aspect Ratio Protection by Default

**Decision**: When both width and height are specified, maintain aspect ratio by default rather than stretching.

**Rationale**:
- Stretching/distorting images is almost never the desired behavior
- Users often specify both dimensions expecting the image to fit within bounds
- Accidental distortion looks unprofessional

**Implementation**:
- Default behavior: Use AUTOMATIC mode (fits within bounds, maintains ratio)
- Added `:allow-stretch` flag for explicit stretching when needed
- With flag: Uses FIT_EXACT mode for exact dimensions

### No ARGB Conversion Needed

**Decision**: Remove the convert-to-argb helper function.

**Rationale**:
- Testing showed imgscalr handles color space conversions automatically
- Both direct scaling and ARGB pre-conversion produced identical file sizes
- Unnecessary complexity that doesn't improve output quality

**Evidence**:
- Simple resize: 5,424 bytes
- With ARGB conversion: 5,424 bytes (identical)
- imgscalr already outputs proper RGBA PNGs
