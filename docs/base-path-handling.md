# Base Path Handling

## Overview

The build system handles base paths (required for GitHub Pages deployment) through a post-processing step that modifies URLs after the main build completes.

## Architecture

### Build Phase
- All URLs are generated as root-relative paths (`/assets/...`, `/about.html`)
- Templates use standard HTML without path variables
- No base path logic during content processing

### Post-Processing Phase
- Detects deployment target from environment variables
- Applies base path to all URLs if needed
- Single-pass transformation of HTML files

## Implementation

### Environment Detection
```javascript
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
const basePath = process.env.CUSTOM_DOMAIN ? '' : (isGitHubActions && repoName ? `/${repoName}` : '');
```

### URL Transformation
The `applyBasePath()` function modifies all root-relative URLs in HTML files:

```javascript
content = content
  .replace(/(src|href)="\/([^"]+)"/g, `$1="${basePath}/$2"`)
  .replace(/href="\/"/g, `href="${basePath}/"`);
```

## URL Patterns

| Original URL | With Base Path `/website` |
|-------------|---------------------------|
| `/assets/css/style.css` | `/website/assets/css/style.css` |
| `/about.html` | `/website/about.html` |
| `/` | `/website/` |
| `/assets/images/logo.png` | `/website/assets/images/logo.png` |

## Configuration

Base path is determined automatically:
- **GitHub Pages**: Uses repository name (e.g., `/website`)
- **Custom Domain**: No base path (empty string)
- **Local Development**: No base path

Set `CUSTOM_DOMAIN` environment variable to deploy without base path:
```bash
CUSTOM_DOMAIN=anteo.no npm run build
```

## Extending

### Adding CDN Support
Modify the post-processing step to replace asset URLs:
```javascript
if (useCDN) {
  content = content.replace(
    /src="\/assets\//g,
    'src="https://cdn.example.com/assets/'
  );
}
```

### Multiple Deployment Targets
Add additional transformations based on deployment target:
```javascript
switch (deployTarget) {
  case 'staging':
    applyBasePath('/staging');
    break;
  case 'production':
    applyCDN();
    break;
}
```
