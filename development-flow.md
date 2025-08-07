# Anteo Website Development Flow

## Overview
This document outlines the Test-Driven Development (TDD) workflow and conventions for the Anteo website static site generator.

## Core Architecture

### Site Generator (`anteo.website.site-generator`)
- Pure functions for template processing
- No file I/O - all data passed as arguments
- Extensible through `:sg/*` namespaced keywords

### Current Features
1. **`:sg/body`** - Replace with page content
   - Supports single elements: `[:div "content"]`
   - Supports vector splicing: `[[:section "1"] [:section "2"]]`

2. **`:sg/include :name`** - Include named components
   - Looks up `:name` in the includes map
   - Returns placeholder if not found

## TDD Development Flow

### 1. Write Tests First
Always start with failing tests in `test/anteo/website/site_generator_test.clj`:

```clojure
(testing "New feature"
  (let [base [:div [:sg/new-feature :arg]]
        content {...}
        expected [:div [:result]]]
    (is (= expected (sg/process base content)))))
```

### 2. Run Tests to Confirm Failure
```bash
clojure -M:test
```

### 3. Implement Minimal Solution
Update `src/anteo/website/site_generator.clj` with the simplest code that makes tests pass.

### 4. Verify Tests Pass
```bash
clojure -M:test
```

### 5. Integration Test
Update `core.clj` if needed and build the site:
```clojure
(require '[anteo.website.core :as core] :reload-all)
(core/build-page "dist/")
```

### 6. Verify Output
Check the generated HTML:
```bash
# Check specific features
grep "pattern" dist/index.html

# View structure
tail -20 dist/index.html
```

## File Organization

### Site Content (`site/`)
- `base.edn` - Main template with `:sg/*` placeholders
- `landing.edn` - Homepage content (vector of sections)
- `footer.edn` - Footer component
- Future: `nav.edn`, `header.edn`, etc.

### Source Code (`src/anteo/website/`)
- `site_generator.clj` - Template processing engine
- `core.clj` - File I/O and build orchestration

## Design Principles

1. **Separation of Concerns**
   - File I/O separate from template logic
   - Pure functions for testing
   - Data-driven templates

2. **Incremental Development**
   - One feature at a time
   - Full TDD cycle for each feature
   - Integration test after each feature

3. **EDN-First**
   - Templates are data structures
   - Easy to read, write, and test
   - No string templating

## Next Features to Consider

### Navigation Extraction
```clojure
;; Instead of hardcoded in base.edn:
[:sg/include :nav]

;; nav.edn could be:
[[:li [:a {:href "/products.html"} "Produkter"]]
 [:li [:a {:href "/news.html"} "Aktuelt"]]
 ...]
```

### Dynamic Attributes
```clojure
;; Allow dynamic values in templates
[:body {:class [:sg/attr :body-class]}]

;; Pass in content map:
{:body ...
 :attrs {:body-class "landing-page"}}
```

### Conditional Rendering
```clojure
[:sg/if :show-banner
  [:div.banner "Special offer!"]]
```

### Loops/Mapping
```clojure
[:ul
  [:sg/for :nav-items
    [:li [:a {:href [:sg/get :href]} [:sg/get :text]]]]]
```

## Questions to Resolve

1. **How to handle nested includes?**
   - Should `:sg/include` in included files be processed?
   - How deep should processing go?

2. **Attribute handling**
   - How to merge/override attributes dynamically?
   - Special handling for classes, styles?

3. **Data access**
   - How to access nested data in templates?
   - Path syntax like `[:sg/get :user :name]`?

4. **File organization**
   - When to split vs. when to keep together?
   - Naming conventions for partials?

## Testing Strategy

1. **Unit Tests** - Each `:sg/*` feature in isolation
2. **Integration Tests** - Multiple features together
3. **Build Tests** - Full site generation
4. **Visual Tests** - Manual inspection of output

## Development Checklist

- [ ] Write failing test
- [ ] Run test to confirm failure
- [ ] Implement minimal solution
- [ ] Run test to confirm pass
- [ ] Refactor if needed
- [ ] Update integration (core.clj)
- [ ] Build site
- [ ] Verify output
- [ ] Commit with descriptive message
