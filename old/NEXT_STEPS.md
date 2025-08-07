# Next Steps: Website Improvements

## 1. Consolidate JSON Configuration Files

### Current State
- `site.json` - Contains site metadata, contact info, random UI strings
- `navigation.json` - Contains menu structure and labels

### Proposed Change
Merge into single `data.json` per language with clear structure:

```json
{
  "site": {
    "name": "Anteo",
    "tagline": "...",
    "copyright": "..."
  },
  "contact": {
    "phone": "...",
    "email": "...",
    "addresses": {...}
  },
  "navigation": {
    "main": [...],
    "products": [...]
  },
  "strings": {
    "backTo": "Tilbake til",
    "readMore": "Les mer",
    "seeMore": "Se flere artikler",
    // All UI strings in one place
  }
}
```

### Implementation Steps
1. Create new `data.json` files by merging existing JSON files
2. Update `build-site.js`:
   - Change `siteDataPath` to load `data.json`
   - Remove `loadNavigation()` function
   - Update variable references: `siteData` → `data`, `navData` → `data.navigation`
3. Update any template references to navigation
4. Update documentation

### Benefits
- Single source of truth per language
- Clear where to add new strings
- Easier to maintain

## 2. Simplify News Article Template

### Current State
- Separate `news.html` template that adds:
  - Article metadata display (date, author, category)
  - Back link to news listing
  - Otherwise identical to page template

### Proposed Change
- Remove `news.html` template
- Use standard `page` template for all content
- Add automatic back link generation based on path

### Implementation Steps
1. Add breadcrumb support to page template:
   ```handlebars
   {{#if parentSection}}
   <nav class="breadcrumb">
     <a href="{{parentSection.url}}" class="back-link">
       ← {{strings.backTo}} {{parentSection.label}}
     </a>
   </nav>
   {{/if}}
   ```

2. Update build system to detect parent sections:
   ```javascript
   // In processMarkdownFile()
   if (file.includes('/news/') && !file.endsWith('index.md')) {
     pageData.parentSection = {
       url: `${langPrefix}/news.html`,
       label: data.navigation.main.find(item => item.url.includes('news'))?.label || 'Nyheter'
     };
   }
   ```

3. Remove news template references from build system
4. Update news articles to include metadata in content if needed

## 3. Automatic Back Link Generation

### Concept
Derive parent section from file path and navigation structure:

```javascript
function getParentSection(filePath, navigation, langPrefix) {
  // Extract section from path (e.g., '/news/' from '/content/no/news/article.md')
  const pathParts = filePath.split('/');
  const section = pathParts[pathParts.length - 2]; // Parent directory
  
  // Find matching navigation entry
  const navItem = navigation.main.find(item => 
    item.url.includes(`/${section}`)
  );
  
  if (navItem) {
    return {
      url: `${langPrefix}${navItem.url}`,
      label: navItem.label
    };
  }
  
  return null;
}
```

### Benefits
- Works for any section (news, products, etc.)
- Uses existing navigation labels
- Automatically maintains correct URLs
- No hardcoded strings

## 4. Additional Improvements to Consider

### A. Article Metadata Component
Create a reusable partial for article metadata:
```handlebars
{{> article-meta date=date author=author category=category}}
```

### B. Breadcrumb Trail
Extend beyond simple back links:
```
Hjem > Nyheter > Article Title
```

### C. Related Content
Automatically suggest related articles based on:
- Category
- Tags
- Date proximity

### D. SEO Improvements
- Add structured data for articles
- Generate meta descriptions from excerpt
- Add Open Graph tags

## Implementation Order

1. **First**: Consolidate JSON files (easiest, improves everything else)
2. **Second**: Add back link support to page template
3. **Third**: Remove news template
4. **Later**: Additional improvements as needed

## Testing Checklist

- [ ] All pages load correctly with new data.json
- [ ] Navigation works in both languages
- [ ] Back links appear on appropriate pages
- [ ] Back links use correct translated strings
- [ ] No broken links after template removal
- [ ] Mobile navigation still works
- [ ] No missing strings or labels

## Notes

- Keep old JSON files during transition
- Test one language at a time
- Consider keeping news template if article-specific features are added later
- The back link system could be extended to products and other sections