# Landing Page Implementation Plan

This document outlines the changes needed to implement the new landing page design for the Anteo website.

## Overview

Implement a new landing page with:
- Two hero sections
- Product group sections (Anteo Logistikk, Anteo Fiskehelse)
- Latest news feed
- Updated footer with company information

**Key Principle**: Keep content (Markdown) separate from structure (JSON). Content files should be editable by non-developers.

## File Structure Changes

### 1. Rename Content Files to English

Move and rename files to use English filenames while keeping Norwegian content:

```
content/no/pages/
  index.md          # Update existing
  products.md       # Rename from produkter.md if exists
  news.md          # Rename from aktuelt.md if exists
  
content/no/product-groups/
  logistics.md      # Create new (was logistikk.md)
  fish-health.md    # Create new (was fiskehelse.md)
  
content/no/products/
  logistics/        # Rename from logistikk/
    map-tools.md    # Rename from kartverktoy.md
    boatcheck.md    # Keep as is
    logifish.md     # Keep as is
    anteo-re.md     # Keep as is
  fish-health/      # Rename from fiskehelse/
    fishctrl.md     # Keep as is
    fishjrnl.md     # Keep as is
```

### 2. Create Structure Files

Create new JSON files in src/:

```
src/
  navigation.json   # Navigation structure (new)
  site-config.json  # Company data (new)
```

## Content File Specifications

### `content/no/pages/index.md`
```markdown
---
layout: landing
title: "Anteo - Bærekraftige løsninger for havbruk"
description: "Beslutningsstøttesystemer for en bærekraftig havbruksnæring"
hero1: "Internettbasert sanntidssystemer for planlegging, overvåking og varsling"
aboutTeaser:
  title: "Beslutningstøttesystemer for bærekraftig havnæring."
  text: "Anteo er et selskap som utvikler beslutningsstøttesystemer som skal bidra til en bærekraftig utvikling av norsk havbruksnæringen. Vi leverer sann tids løsninger for overvåkning og varsling av aktiviteter som kan være i strid med biosikkerhetsprinsippet, samtidig som løsningene skal bidra til forslag til risikoreduserende tiltak."
  linkText: "Les mer"
  image: "/assets/images/hero-about.jpg"
---
```

### `content/no/product-groups/logistics.md`
```markdown
---
title: "Anteo Logistikk"
landingDescription: "Anteos verktøy for logistikk gir tilgang på fartøy, sensorer, data og rapporter som øker beslutningsstøtten og effektiviserer informasjonsinnhenting og deling. Det gir en unik mulighet til å sammenligne data for lokalitet eller fartøy, som igjen kan brukes til å utvikle produksjonen og gjøre logistikken rundt last og dokumentasjon knyttet til transport av biologisk materiale enklere."
linkText: "Les mer"
image: "/assets/images/logistikk-hero.jpg"
---

# Full page content here...
```

### `content/no/product-groups/fish-health.md`
```markdown
---
title: "Anteo Fiskehelse"
landingDescription: "Våre verktøy for fiskehelse sørger for rask og presis registrering av fiskevelferdsindikatorer samt myndighetspålagt lusetelling og en enkel, presis og sikker journalføring av fiskehelsedata."
linkText: "Les mer"
image: "/assets/images/fiskehelse-hero.jpg"
---

# Full page content here...
```

## Structure File Specifications

### `src/navigation.json`
```json
{
  "main": [
    { "contentPath": "pages/products" },
    { "contentPath": "pages/news" },
    { "contentPath": "pages/sustainability" },
    { "contentPath": "pages/about" },
    { "contentPath": "pages/contact" }
  ],
  "productGroups": [
    { "contentPath": "product-groups/logistics" },
    { "contentPath": "product-groups/fish-health" }
  ]
}
```

### `src/site-config.json`
```json
{
  "orgNumber": "999 168 817",
  "email": "post@anteo.no",
  "phone": "+47 952 84 007",
  "addresses": [
    {
      "street": "Vågsallmenningen 6",
      "postalCode": "5040",
      "city": "Bergen"
    },
    {
      "street": "Industrivegen 12",
      "postalCode": "7900",
      "city": "Rørvik"
    },
    {
      "street": "Krambugata 2 (Digs)",
      "postalCode": "7011",
      "city": "Trondheim"
    },
    {
      "street": "Fugleskjærgata 16",
      "postalCode": "6905",
      "city": "Florø"
    }
  ],
  "social": [
    {
      "platform": "facebook",
      "url": "https://www.facebook.com/anteoas",
      "icon": "/assets/images/facebook-icon.svg"
    },
    {
      "platform": "instagram",
      "url": "https://www.instagram.com/anteo_softwaresolutions/",
      "icon": "/assets/images/instagram-icon.svg"
    }
  ]
}
```

## Build Script Modifications

### `scripts/build-site.js`

1. **Add landing template** (line ~20):
```javascript
const templates = {
  page: ...,
  product: ...,
  news: ...,
  landing: Handlebars.compile(readFileSync(path.join(__dirname, '../src/templates/pages/landing.html'), 'utf8'))
};
```

2. **Load site config from src/** (new function):
```javascript
function loadSiteConfig() {
  const configPath = path.join(__dirname, '../src/site-config.json');
  return JSON.parse(readFileSync(configPath, 'utf8'));
}
```

3. **Load and resolve navigation** (new function):
```javascript
function loadNavigation(lang) {
  const navStructure = JSON.parse(readFileSync(path.join(__dirname, '../src/navigation.json'), 'utf8'));
  // Resolve labels from content files
  const resolved = {
    main: navStructure.main.map(item => {
      const contentFile = `content/${lang}/${item.contentPath}.md`;
      const { data } = matter(readFileSync(contentFile, 'utf8'));
      return {
        label: data.title,
        url: `/${item.contentPath.replace('pages/', '')}.html`
      };
    })
  };
  return resolved;
}
```

4. **Update processMarkdownFile** to check layout (line ~90):
```javascript
let template = 'page';
if (data.layout) {
  template = data.layout;
} else {
  if (file.includes('/products/')) template = 'product';
  if (file.includes('/news/')) template = 'news';
}
```

5. **Add landing page data loading**:
- Load product groups when processing index.md
- Get 3 latest news articles
- Pass site config data

6. **Update data structure** passed to templates:
```javascript
const pageData = {
  ...siteData,
  ...data,
  siteConfig: loadSiteConfig(),  // Add this
  // For landing page:
  productGroups: {
    logistics: loadProductGroup('logistics', lang),
    fishHealth: loadProductGroup('fish-health', lang)
  },
  latestNews: getLatestNews(lang, 3)
};
```

## Template Updates

### Footer in `src/templates/layouts/base.html`

Update to use new data structure:
```handlebars
<footer>
  <div class="container">
    <div class="footer-content">
      <div class="footer-left">
        <img src="/assets/images/anteo-logo-white.svg" alt="Anteo" width="130">
        <p>
          {{#each siteConfig.addresses}}
          {{this.street}}, {{this.postalCode}} {{this.city}}<br>
          {{/each}}
        </p>
        <p style="color: var(--light-blue);">Org. nr. {{siteConfig.orgNumber}}</p>
        <p><a href="mailto:{{siteConfig.email}}">{{siteConfig.email}}</a></p>
        <p><a href="tel:{{siteConfig.phone}}">{{siteConfig.phone}}</a></p>
      </div>
      <!-- Rest of footer... -->
    </div>
  </div>
</footer>
```

## CSS Updates (Already Complete)

✅ Added to `src/assets/css/variables.css`:
- `--light-blue: #3caeef;`

✅ Added to `src/assets/css/style.css`:
- Landing page styles
- Updated footer styles

## Images (Already Added)

✅ Required images in `src/assets/images/`:
- hero-about.jpg
- logistikk-hero.jpg  
- fiskehelse-hero.jpg
- facebook-icon.svg
- instagram-icon.svg
- anteo-logo-white.svg

## Cleanup Tasks

1. Delete temporary files:
   - `content/no/site-info.md`
   - `content/no/landing.yaml`

2. Remove old product files after reorganization:
   - `content/no/products/logistics-tools.md`
   - `content/no/products/monitoring.md`

## Testing

1. Run `npm run dev` to test locally
2. Verify landing page loads with all sections
3. Check navigation labels are pulled from content
4. Verify footer shows company information
5. Test language switching still works

## Notes

- All user-facing text remains in Markdown files
- JSON files only contain structure and non-translatable data
- Navigation labels are derived from page titles
- Product navigation can be auto-generated from folder structure
