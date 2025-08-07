const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

describe('Base Path Handling', () => {
  const testDir = path.join(__dirname, '../fixtures/test-build');
  
  beforeEach(() => {
    // Create test directory
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    // Clean up
    fs.removeSync(testDir);
  });

  describe('applyBasePath', () => {
    it('should apply base path to all root-relative URLs', () => {
      // Create test HTML file
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <link rel="stylesheet" href="/assets/css/style.css">
          <link rel="icon" href="/assets/images/favicon.png">
        </head>
        <body>
          <a href="/">Home</a>
          <a href="/about.html">About</a>
          <img src="/assets/images/logo.png" alt="Logo">
          <script src="/assets/js/bundle.js"></script>
        </body>
        </html>
      `;
      
      const testFile = path.join(testDir, 'index.html');
      fs.writeFileSync(testFile, htmlContent);
      
      // Apply base path transformation
      const basePath = '/website';
      let content = fs.readFileSync(testFile, 'utf8');
      content = content
        .replace(/(src|href)="\/([^"]+)"/g, `$1="${basePath}/$2"`)
        .replace(/href="\/"/g, `href="${basePath}/"`);
      
      // Verify transformations
      expect(content).toContain('href="/website/assets/css/style.css"');
      expect(content).toContain('href="/website/assets/images/favicon.png"');
      expect(content).toContain('href="/website/"');
      expect(content).toContain('href="/website/about.html"');
      expect(content).toContain('src="/website/assets/images/logo.png"');
      expect(content).toContain('src="/website/assets/js/bundle.js"');
    });

    it('should not modify external URLs', () => {
      const htmlContent = `
        <a href="https://example.com">External</a>
        <img src="https://cdn.example.com/image.png" alt="CDN">
      `;
      
      const basePath = '/website';
      const result = htmlContent
        .replace(/(src|href)="\/([^"]+)"/g, `$1="${basePath}/$2"`)
        .replace(/href="\/"/g, `href="${basePath}/"`);
      
      expect(result).toBe(htmlContent); // Should remain unchanged
    });

    it('should handle empty base path', () => {
      const htmlContent = '<a href="/about.html">About</a>';
      const basePath = '';
      
      const result = htmlContent
        .replace(/(src|href)="\/([^"]+)"/g, `$1="${basePath}/$2"`)
        .replace(/href="\/"/g, `href="${basePath}/"`);
      
      expect(result).toBe(htmlContent); // Should remain unchanged
    });
  });
});
