# Decision Log

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
