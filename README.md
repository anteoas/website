# Anteo Website

Simple markdown-based website for Anteo AS.

## For Content Editors

1. Navigate to the `content/` folder
2. Edit `.md` files directly in GitHub
3. Commit your changes
4. Site automatically rebuilds

### Adding News
Create a new file in `content/news/` with format: `YYYY-MM-DD-title.md`

### Editing Pages
Edit files in `content/pages/` or `content/products/`

## For Developers

### Local Development
```bash
npm install
npm run dev
```

### Build
```bash
npm run build
```

## AI Integration

Content is available at `/api/content.json` after build.

### Content Structure

All markdown files use frontmatter:
```yaml
---
title: "Page Title"
description: "SEO description"
category: "category-name"
---
```

Products have additional fields:
```yaml
---
features:
  - "Feature 1"
  - "Feature 2"
---
```
