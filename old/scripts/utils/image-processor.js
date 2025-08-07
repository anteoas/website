const sharp = require('sharp');
const path = require('path');
const crypto = require('crypto');
const { existsSync, readFileSync, outputFileSync, ensureDirSync, statSync } = require('fs-extra');

class ImageProcessor {
  constructor() {
    this.requirements = new Map();
    this.sourcePath = 'src/assets/images';
    this.outputPath = '.temp/images';
    this.errors = [];
    this.warnings = [];
    this.placeholders = [];
    this.cache = this.loadCache();
  }

  loadCache() {
    const cachePath = path.join('.temp', 'image-cache.json');
    if (existsSync(cachePath)) {
      try {
        return JSON.parse(readFileSync(cachePath, 'utf8'));
      } catch (e) {
        console.warn('Failed to load image cache, starting fresh');
      }
    }
    return {};
  }

  saveCache() {
    const cachePath = path.join('.temp', 'image-cache.json');
    ensureDirSync(path.dirname(cachePath));
    outputFileSync(cachePath, JSON.stringify(this.cache, null, 2));
  }

  // Extract image requirements from HTML
  extractFromHtml(html, sourceFile = '') {
    // Match images with query parameters in src attributes
    const srcRegex = /src="([^"]+\.(jpg|jpeg|png|gif|webp|svg)\?[^"]*)"/gi;
    // Match images with query parameters in background-image styles
    // Updated to handle compound background-image values (e.g., with gradients)
    const bgRegex = /url\(['"]?([^'"]+\.(jpg|jpeg|png|gif|webp|svg)\?[^'")]+)['"]?\)/gi;
    
    const patterns = [srcRegex, bgRegex];
    
    patterns.forEach(regex => {
      let match;
      while ((match = regex.exec(html)) !== null) {
        const fullUrl = match[1];
        const [cleanPath, queryString] = fullUrl.split('?');
        
        // Skip external URLs
        if (cleanPath.startsWith('http')) continue;
        
        // Parse query parameters
        const params = new URLSearchParams(queryString);
        const size = params.get('size');
        
        if (size) {
          const [width, height] = size.split('x').map(Number);
          const format = params.get('format');
          const quality = parseInt(params.get('quality') || '80');
          
          // Remove base path and /assets/images/ prefix
          let imagePath = cleanPath;
          imagePath = imagePath.replace(/^\//, '');
          imagePath = imagePath.replace(/^assets\/images\//, '');
          
          const key = `${imagePath}@${width}x${height}${format ? `.${format}` : ''}`;
          
          this.requirements.set(key, {
            sourcePath: imagePath,
            width,
            height,
            format,
            quality,
            originalUrl: fullUrl,
            usedIn: sourceFile
          });
        }
      }
    });
  }

  // Process all collected images
  async processAll() {
    console.log(`\n🖼️  Processing ${this.requirements.size} image requirements...\n`);
    
    for (const [key, req] of this.requirements) {
      await this.processImage(req);
    }
    
    this.saveCache();
    
    // Report results
    if (this.placeholders.length > 0) {
      console.log(`\n🖼️  Generated placeholders: ${this.placeholders.length}`);
      this.placeholders.forEach(ph => console.log(`   ${ph}`));
    }
    
    if (this.errors.length > 0) {
      console.log(`\n❌ Image processing errors: ${this.errors.length}`);
      this.errors.forEach(err => console.log(`   ${err}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Image processing warnings: ${this.warnings.length}`);
      this.warnings.forEach(warn => console.log(`   ${warn}`));
    }
  }

  async processImage(requirements) {
    const sourcePath = path.join(this.sourcePath, requirements.sourcePath);
    const outputPath = this.getOutputPath(requirements);
    
    // Check if source exists
    if (!existsSync(sourcePath)) {
      console.log(`⚠️  Missing: ${requirements.sourcePath} - generating placeholder`);
      this.placeholders.push(`${requirements.sourcePath} (used in ${requirements.usedIn})`);
      await this.generatePlaceholder(requirements, outputPath);
      return;
    }
    
    // Check if already processed and unchanged
    if (await this.isCached(sourcePath, outputPath, requirements)) {
      console.log(`✓ Cached: ${requirements.sourcePath} → ${path.basename(outputPath)}`);
      return;
    }
    
    try {
      // Get source metadata
      const metadata = await sharp(sourcePath).metadata();
      
      // Check if source is large enough
      if (metadata.width < requirements.width || metadata.height < requirements.height) {
        this.warnings.push(
          `Image too small: ${requirements.sourcePath} ` +
          `(${metadata.width}x${metadata.height}) < requested (${requirements.width}x${requirements.height})`
        );
      }
      
      // Ensure output directory exists
      ensureDirSync(path.dirname(outputPath));
      
      // Process the image
      let pipeline = sharp(sourcePath)
        .resize(requirements.width, requirements.height, {
          fit: 'cover',
          position: 'center'
        });
      
      // Handle format conversion
      const outputFormat = requirements.format || path.extname(sourcePath).slice(1);
      
      switch (outputFormat) {
        case 'webp':
          pipeline = pipeline.webp({ quality: requirements.quality });
          break;
        case 'jpg':
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality: requirements.quality });
          break;
        case 'png':
          pipeline = pipeline.png({ quality: requirements.quality });
          break;
      }
      
      await pipeline.toFile(outputPath);
      
      console.log(`✓ Processed: ${requirements.sourcePath} → ${path.basename(outputPath)}`);
      
      // Update cache
      this.updateCache(sourcePath, outputPath, requirements);
      
    } catch (error) {
      this.errors.push(`Failed to process ${sourcePath}: ${error.message}`);
    }
  }

  async isCached(sourcePath, outputPath, requirements) {
    if (!existsSync(outputPath)) return false;
    
    const cacheKey = this.getCacheKey(sourcePath, requirements);
    const cached = this.cache[cacheKey];
    
    if (!cached) return false;
    
    // For placeholders, check if output still exists
    if (cached.isPlaceholder) {
      return existsSync(outputPath);
    }
    
    // For real images, check source modification time
    if (!existsSync(sourcePath)) return false;
    
    const sourceStats = statSync(sourcePath);
    return cached.sourceMtime === sourceStats.mtime.toISOString() &&
           cached.outputPath === outputPath;
  }

  updateCache(sourcePath, outputPath, requirements) {
    const cacheKey = this.getCacheKey(sourcePath, requirements);
    
    if (existsSync(sourcePath)) {
      const sourceStats = statSync(sourcePath);
      this.cache[cacheKey] = {
        sourceMtime: sourceStats.mtime.toISOString(),
        outputPath: outputPath,
        requirements: requirements,
        isPlaceholder: false
      };
    } else {
      // Cache placeholder
      this.cache[cacheKey] = {
        sourceMtime: null,
        outputPath: outputPath,
        requirements: requirements,
        isPlaceholder: true
      };
    }
  }

  getCacheKey(sourcePath, requirements) {
    return `${sourcePath}@${requirements.width}x${requirements.height}${requirements.format || ''}`;
  }

  getOutputPath(requirements) {
    const { sourcePath, width, height, format } = requirements;
    const ext = format ? `.${format}` : path.extname(sourcePath);
    const name = path.basename(sourcePath, path.extname(sourcePath));
    const dir = path.dirname(sourcePath);
    
    return path.join(this.outputPath, dir, `${name}-${width}x${height}${ext}`);
  }

  async generatePlaceholder(requirements, outputPath) {
    const { width, height, format, sourcePath } = requirements;
    
    // Ensure output directory exists
    ensureDirSync(path.dirname(outputPath));
    
    // Determine output format
    const outputFormat = format || 'png';
    
    // Create a placeholder with text
    const name = path.basename(sourcePath, path.extname(sourcePath));
    const placeholderText = name.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    // Create SVG with text
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#e0e0e0"/>
        <rect x="10%" y="10%" width="80%" height="80%" fill="none" stroke="#999" stroke-width="2" stroke-dasharray="10,5"/>
        <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="${Math.min(width, height) * 0.1}" fill="#666" text-anchor="middle">
          ${placeholderText}
        </text>
        <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="${Math.min(width, height) * 0.08}" fill="#999" text-anchor="middle">
          ${width}×${height}
        </text>
      </svg>
    `;
    
    try {
      // Convert SVG to the requested format
      let pipeline = sharp(Buffer.from(svg));
      
      switch (outputFormat) {
        case 'webp':
          pipeline = pipeline.webp({ quality: 90 });
          break;
        case 'jpg':
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality: 90, background: { r: 255, g: 255, b: 255 } });
          break;
        case 'png':
          pipeline = pipeline.png();
          break;
      }
      
      await pipeline.toFile(outputPath);
      console.log(`✓ Placeholder: ${requirements.sourcePath} → ${path.basename(outputPath)}`);
      
      // Update cache
      this.updateCache(sourcePath, outputPath, requirements);
      
    } catch (error) {
      this.errors.push(`Failed to generate placeholder for ${sourcePath}: ${error.message}`);
    }
  }

  // Get the processed image path for HTML replacement
  getProcessedUrl(originalUrl) {
    const [cleanPath, queryString] = originalUrl.split('?');
    const params = new URLSearchParams(queryString);
    const size = params.get('size');
    
    if (!size) return originalUrl;
    
    const [width, height] = size.split('x');
    const format = params.get('format');
    
    // Extract just the image path
    let imagePath = cleanPath;
    imagePath = imagePath.replace(/^\//, '');
    imagePath = imagePath.replace(/^assets\/images\//, '');
    
    const ext = format ? `.${format}` : path.extname(imagePath);
    const name = path.basename(imagePath, path.extname(imagePath));
    const dir = path.dirname(imagePath);
    
    const processedPath = dir === '.' 
      ? `${name}-${width}x${height}${ext}`
      : path.join(dir, `${name}-${width}x${height}${ext}`);
    
    return `/assets/images/${processedPath}`;
  }

  // Replace image URLs in HTML with processed versions
  replaceUrlsInHtml(html) {
    // Replace src attributes
    html = html.replace(/src="([^"]+\.(jpg|jpeg|png|gif|webp|svg)\?[^"]*)"/gi, (match, url) => {
      const processedUrl = this.getProcessedUrl(url);
      return `src="${processedUrl}"`;
    });
    
    // Replace background-image in style attributes
    // Updated to handle compound background-image values (e.g., with gradients)
    html = html.replace(/url\(['"]?([^'"]+\.(jpg|jpeg|png|gif|webp|svg)\?[^'")]+)['"]?\)/gi, (match, url) => {
      // Only process if it has query parameters
      if (url.includes('?')) {
        const processedUrl = this.getProcessedUrl(url);
        console.log(`Replacing background-image: ${url} -> ${processedUrl}`);
        return `url('${processedUrl}')`;
      }
      return match;
    });
    
    return html;
  }
}

module.exports = ImageProcessor;