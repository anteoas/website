# Anteo Website - Design Document

## Core Philosophy

The Anteo static site generator follows a **structure-as-code, content-as-data** philosophy. Templates define the HTML structure using Hiccup (Clojure data structures), while all translatable content lives in EDN/Markdown files.

## Architecture Overview

### 1. Separation of Concerns

**Structure (Code)**
- Lives in `src/anteo/website/pages/`
- Written in Clojure using Hiccup
- Defines HTML structure and component relationships
- Managed by developers

**Content (Data)**
- Lives in `content/{lang}/`
- Written as EDN frontmatter or pure EDN files
- Contains all translatable text, images, links
- Editable by non-developers

### 2. File Conventions

```
anteo-website/
├── src/anteo/website/
│   ├── pages/
│   │   ├── landing.clj      # Landing page structure
│   │   ├── news.clj         # News listing structure
│   │   └── article.clj      # Article structure
│   └── components.clj       # Reusable components
├── content/
│   ├── no/                  # Norwegian content
│   │   ├── index.edn        # Landing page content
│   │   ├── about.md         # Simple page (EDN + Markdown)
│   │   └── news/
│   │       └── 2024-01-10-fishjrnl.md
│   └── en/                  # English (same structure)
```

### 3. Content Resolution System

Templates use placeholder keywords that get replaced with actual content during build:

```clojure
;; In template (landing.clj)
[:h1 :anteo/hero-headline]
[:img {:src :anteo.asset/hero-image :alt :anteo/hero-alt}]
[:a {:href :anteo.link/about} :anteo/read-more]
```

```clojure
;; In content file (index.edn)
{:hero-headline "Internettbasert sanntidssystemer..."
 :hero-image "/assets/images/hero.jpg"
 :hero-alt "Anteo havbruk"
 :read-more "Les mer"
 :about "/about.html"}
```

### 4. Placeholder Types

**Text**: `:anteo/key`
- Simple text replacement
- Most common type

**Assets**: `:anteo.asset/key`
- Image paths that get processed
- Can apply transformations (resize, optimize)

**Links**: `:anteo.link/key`
- URLs that get proper language prefix
- Can be internal or external

**Components**: `[:anteo.component/news-list {:count 3}]`
- Dynamic components that pull data
- Passed parameters for configuration

### 5. Content File Formats

**Pure EDN** (`.edn`)
```clojure
{:title "Anteo - Bærekraftige løsninger"
 :hero-headline "Internettbasert sanntidssystemer..."
 :products [{:name "Logistikk" :text "..."}
            {:name "Fiskehelse" :text "..."}]}
```

**Markdown with EDN frontmatter** (`.md`)
```clojure
{:title "Om Anteo"
 :description "Lær mer om vårt selskap"}
---
# Om oss

Anteo ble grunnlagt i 2020...
```

### 6. Build Process

1. **Content Loading**
   - Parse EDN frontmatter or pure EDN
   - Extract content map and any markdown

2. **Template Selection**
   - By convention: `/index.*` → `landing.clj`
   - By explicit key: `:template :custom-page`
   - By path pattern: `/news/*.md` → `article.clj`

3. **Tree Walking & Replacement**
   - Walk Hiccup structure from template
   - Replace qualified keywords with content
   - Process special namespaces (asset, link, component)
   - Maintain structure while replacing content

4. **HTML Generation**
   - Convert Hiccup to HTML
   - Wrap in base layout
   - Apply post-processing (image optimization, etc.)

### 7. Example: Landing Page

**Template** (`src/anteo/website/pages/landing.clj`):
```clojure
(defn render []
  [:div
   [:section.hero-headline
    [:div.container
     [:h1 :anteo/hero-headline]]]
   
   [:section.product-section
    [:div.container
     [:h2 :anteo/logistics-title]
     [:p :anteo/logistics-text]
     [:a {:href :anteo.link/logistics} :anteo/logistics-link-text]]]])
```

**Content** (`content/no/index.edn`):
```clojure
{:hero-headline "Internettbasert sanntidssystemer..."
 :logistics-title "Anteo Logistikk"
 :logistics-text "Komplett løsning for..."
 :logistics-link-text "Les mer"
 :logistics "/products/logistics.html"}
```

### 8. Benefits

**For Developers**
- Full control over HTML structure
- Reusable components in Clojure
- Type-safe placeholder system
- REPL-driven development

**For Content Editors**
- Simple EDN/Markdown files
- No HTML knowledge needed
- Clear key-value pairs
- Easy to add translations

**For Maintenance**
- Clear separation of concerns
- Structure changes don't affect translations
- Easy to add new languages
- Validation of missing keys

### 9. Advanced Features

**Dynamic Content Queries**
```clojure
;; Query and render multiple items
[:anteo/for {:type :news-card :limit 3 :order-by [:date :desc]}]

;; With filtering
[:anteo/for {:type :product-card 
             :filter [:= :featured true]
             :limit 2}]

;; All items of a type
[:anteo/for {:type :team-member :order-by [:order :asc]}]
```

The `:anteo/for` keyword triggers:
1. Query content files matching the criteria
2. Sort/filter as specified
3. For each item, call `(render type item)`

**Component Rendering**
```clojure
(defmulti render (fn [type data] type))

(defmethod render :news-card [{:keys [title date excerpt url]}]
  [:article.news-card
   [:time.news-date date]
   [:h3 [:a {:href url} title]]
   [:p.news-excerpt excerpt]
   [:a.read-more {:href url} "Les mer →"]])
```

**Conditional Rendering**
```clojure
[:when :anteo/special-announcement
  [:div.announcement :anteo/special-announcement]]
```

### 10. Migration Path

1. Start with simple pages (about, contact)
2. Move to complex pages (landing, products)
3. Standardize component patterns
4. Add validation for missing keys
5. Implement image optimization
6. Add development helpers (missing key warnings)

## Migration from Node.js

### What Can Be Copied As-Is

**CSS & Static Assets**
- All CSS files from `old/src/assets/css/`
- Images from `old/src/assets/images/`
- Fonts from `old/src/assets/fonts/`
- Any JavaScript files (though we might not need them)

**Content Structure**
- Directory organization (no/en)
- URL patterns
- Image references

### What Needs Porting

**Templates (Major Work)**
- Convert Handlebars templates to Hiccup functions
- `old/src/templates/pages/*.html` → `src/anteo/website/pages/*.clj`
- `old/src/templates/partials/*.html` → Component multimethods
- Base layout → Wrapper function

**Content Files**
- Add `:type` field to all content
- Keep YAML frontmatter for now (add parser)
- Or convert to EDN frontmatter
- Ensure all content has required fields

**Build Configuration**
- URL generation rules
- Language handling
- Image processing settings
- Deployment configuration

### Porting Strategy

1. **Phase 1: Infrastructure**
   - Copy all static assets
   - Set up basic routing
   - Implement content loading
   - Add YAML parser

2. **Phase 2: Simple Pages**
   - Port `about.md`, `contact.md`, etc.
   - Create basic page template
   - Test content resolution

3. **Phase 3: Components**
   - Port news-card, team-member partials
   - Implement render multimethod
   - Test `:anteo/for` queries

4. **Phase 4: Complex Pages**
   - Port landing page with all sections
   - Port product collection pages
   - Implement navigation generation

5. **Phase 5: Dynamic Content**
   - Port news listing page
   - Implement sorting/filtering
   - Add pagination if needed

6. **Phase 6: Polish**
   - Image optimization
   - URL processing
   - Language switching
   - 404 pages

### Content Type Mapping

**From Handlebars to Clojure:**
```handlebars
{{#each latestNews}}
  {{> news-card}}
{{/each}}
```

**Becomes:**
```clojure
[:anteo/for {:type :news-card :limit 3 :order-by [:date :desc]}]
```

**Partial includes:**
```handlebars
{{> team-member this}}
```

**Becomes render call:**
```clojure
(render :team-member member-data)
```

**Custom Markdown Blocks:**
```markdown
::: hero /assets/images/hero.jpg background-color: #003f7e
Sustainable solutions for aquaculture
:::

::: value-block
### Efficiency
Reduce time spent on manual tasks by 80%

### Sustainability  
Lower environmental impact through optimized operations

### Profitability
Increase margins with data-driven decisions
:::
```

**Need to port:**
- Hero block processor
- Value block processor
- Other custom markdown extensions

### Required Tooling

- YAML parser for frontmatter (or convert to EDN)
- Image processor (query params → transformations)
- Markdown processor (already have)
- URL/path utilities for language prefixes

## Summary

This design provides a clean separation between structure (code) and content (data), making it easy for developers to maintain the site structure while allowing non-technical users to manage content. The placeholder system is extensible and type-safe, while keeping the content files simple and readable.