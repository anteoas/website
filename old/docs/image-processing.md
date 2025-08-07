# Image Processing System

## Overview

The Anteo website uses an automated image processing system that optimizes images during the build process. Images are resized, reformatted, and cached for optimal performance.

## How It Works

### Query-Based Processing

Images in HTML can include query parameters to specify processing requirements:

```html
<img src="/assets/images/logo.png?size=160x80&format=webp&quality=85" alt="Logo">
```

### Supported Parameters

| Parameter | Description | Example | Default |
|-----------|-------------|---------|---------|
| `size` | Resize to WIDTHxHEIGHT | `?size=300x200` | Original size |
| `format` | Convert to format | `?format=webp` | Original format |
| `quality` | Compression quality (1-100) | `?quality=85` | 80 |

### Processing Pipeline

1. **Extraction**: Build script scans HTML for images with query parameters
2. **Processing**: Sharp library resizes and converts images as specified
3. **Caching**: Processed images are cached to speed up rebuilds
4. **Replacement**: HTML URLs are updated to point to processed versions

### Output Structure

Processed images follow a naming convention:
- Original: `team/john-doe.jpg?size=300x300`
- Processed: `team/john-doe-300x300.jpg`

### Placeholder Generation

When source images are missing, the system automatically generates placeholders:
- Correct dimensions as specified
- Gray background with dashed border
- Display name and dimensions
- Same format as requested

## Configuration

Image processing settings are defined in `config/build.config.js`:

```javascript
imageProcessing: {
  cachePath: '.temp/image-cache.json',
  outputPath: '.temp/images'
}
```

## Adding Images

1. Place source images in `src/assets/images/`
2. Reference in HTML/Markdown with processing parameters
3. Run build - images are automatically processed

## Cache Management

The system maintains a cache in `.temp/image-cache.json` that tracks:
- Source file modification times
- Processing parameters
- Output paths

To force reprocessing, delete the `.temp` directory or run `npm run clean`.
