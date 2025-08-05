# Image Placeholder Feature

## ✅ Feature Implemented

The image processing system now automatically generates placeholder images when source images are missing. This ensures the layout remains consistent even when images haven't been added yet.

### How it Works

1. **Automatic Detection**: When a source image is missing, the system detects it during build
2. **Placeholder Generation**: Creates a placeholder image with:
   - Correct dimensions (as specified in the query parameters)
   - Gray background with dashed border
   - Image name converted to readable text (e.g., "svein-vegard-volden" → "Svein Vegard Volden")
   - Size dimensions displayed (e.g., "300×300")
3. **Format Support**: Generates placeholders in the requested format (PNG, JPG, WebP)
4. **Caching**: Placeholders are cached and won't be regenerated unless deleted

### Example Output

```
⚠️  Missing: team/john-doe.png - generating placeholder
✓ Placeholder: team/john-doe.png → john-doe-300x300.jpg
```

### Placeholder Appearance

The placeholders are simple but functional:
- Light gray background (#e0e0e0)
- Dashed border to indicate placeholder status
- Name of the missing person/image
- Dimensions for reference

### Benefits

1. **No Broken Layouts**: Pages render correctly even with missing images
2. **Clear Visual Indicator**: It's obvious which images need to be added
3. **Maintains Performance**: Placeholders are lightweight SVG-based
4. **Easy to Replace**: Just add the real image and rebuild

### Future Enhancements

If needed, we could easily add:
- Custom colors per image type (team vs products)
- Icons or emojis in placeholders
- Different styles for different contexts
- Configuration options in build.config.js

The feature is working perfectly and will help during development when not all images are available yet!
