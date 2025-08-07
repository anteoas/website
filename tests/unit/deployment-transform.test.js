const fs = require('fs-extra');
const path = require('path');
const { applyDeploymentConfig } = require('../../scripts/deployment-transform');

describe('Deployment Transform', () => {
  const testDir = path.join(__dirname, '../fixtures/test-deployment');
  
  beforeEach(() => {
    // Create test directory structure
    fs.ensureDirSync(path.join(testDir, 'dist/assets/css'));
    fs.ensureDirSync(path.join(testDir, 'dist/en'));
  });

  afterEach(() => {
    // Clean up
    fs.removeSync(testDir);
  });

  describe('CSS background-image URL transformation', () => {
    it('should transform simple background-image URLs in CSS files', () => {
      const cssContent = `
        .hero {
          background-image: url('/assets/images/hero.jpg');
        }
        .logo {
          background-image: url("/assets/images/logo.png");
        }
        .icon {
          background-image: url(/assets/images/icon.svg);
        }
      `;
      
      const cssFile = path.join(testDir, 'dist/assets/css/style.css');
      fs.writeFileSync(cssFile, cssContent);
      
      // Change working directory to test directory
      const originalCwd = process.cwd();
      process.chdir(testDir);
      
      try {
        applyDeploymentConfig({ basePath: '/website' });
        
        const result = fs.readFileSync(cssFile, 'utf8');
        expect(result).toContain("url('/website/assets/images/hero.jpg')");
        expect(result).toContain('url("/website/assets/images/logo.png")');
        expect(result).toContain('url(/website/assets/images/icon.svg)');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should transform compound background-image with gradients in CSS files', () => {
      const cssContent = `
        .hero {
          background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('/assets/images/hero.jpg');
        }
        .complex {
          background-image: 
            radial-gradient(circle at center, #fff 0%, transparent 70%),
            linear-gradient(90deg, rgba(0,0,0,0.8) 0%, transparent 100%),
            url("/assets/images/background.png");
        }
      `;
      
      const cssFile = path.join(testDir, 'dist/assets/css/style.css');
      fs.writeFileSync(cssFile, cssContent);
      
      // Change working directory to test directory
      const originalCwd = process.cwd();
      process.chdir(testDir);
      
      try {
        applyDeploymentConfig({ basePath: '/website' });
        
        const result = fs.readFileSync(cssFile, 'utf8');
        expect(result).toContain("url('/website/assets/images/hero.jpg')");
        expect(result).toContain('url("/website/assets/images/background.png")');
        // Gradients should remain unchanged
        expect(result).toContain('linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5))');
        expect(result).toContain('radial-gradient(circle at center, #fff 0%, transparent 70%)');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should transform background-image URLs in inline styles', () => {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <body>
          <div style="background-image: url('/assets/images/hero.jpg');">Hero</div>
          <section style="background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('/assets/images/bg.png');">
            Complex background
          </section>
        </body>
        </html>
      `;
      
      const htmlFile = path.join(testDir, 'dist/index.html');
      fs.writeFileSync(htmlFile, htmlContent);
      
      // Change working directory to test directory
      const originalCwd = process.cwd();
      process.chdir(testDir);
      
      try {
        applyDeploymentConfig({ basePath: '/website' });
        
        const result = fs.readFileSync(htmlFile, 'utf8');
        expect(result).toContain("url('/website/assets/images/hero.jpg')");
        expect(result).toContain("url('/website/assets/images/bg.png')");
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should not transform external URLs in CSS', () => {
      const cssContent = `
        .external {
          background-image: url('https://example.com/image.jpg');
        }
        .cdn {
          background-image: url("//cdn.example.com/bg.png");
        }
      `;
      
      const cssFile = path.join(testDir, 'dist/assets/css/style.css');
      fs.writeFileSync(cssFile, cssContent);
      
      const originalCwd = process.cwd();
      process.chdir(testDir);
      
      try {
        applyDeploymentConfig({ basePath: '/website' });
        
        const result = fs.readFileSync(cssFile, 'utf8');
        // External URLs should remain unchanged
        expect(result).toContain("url('https://example.com/image.jpg')");
        expect(result).toContain('url("//cdn.example.com/bg.png")');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle multiple url() occurrences in one line', () => {
      const cssContent = `
        .multiple {
          background: url('/assets/images/icon1.png') left center no-repeat, url("/assets/images/icon2.png") right center no-repeat;
        }
      `;
      
      const cssFile = path.join(testDir, 'dist/assets/css/style.css');
      fs.writeFileSync(cssFile, cssContent);
      
      const originalCwd = process.cwd();
      process.chdir(testDir);
      
      try {
        applyDeploymentConfig({ basePath: '/website' });
        
        const result = fs.readFileSync(cssFile, 'utf8');
        expect(result).toContain("url('/website/assets/images/icon1.png')");
        expect(result).toContain('url("/website/assets/images/icon2.png")');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle hero sections with complex gradients and background-size (real-world case)', () => {
      const cssContent = `
        .hero {
          background-image: linear-gradient(to right, rgba(0, 82, 156, 0.9), rgba(0, 82, 156, 0.7)), url('/assets/images/hero-sustainability.jpg');
          background-size: cover;
          background-position: center;
        }
        
        .news-hero {
          background-image: url('/assets/images/hero-news.png');
          background-size: cover;
        }
      `;
      
      const cssFile = path.join(testDir, 'dist/assets/css/style.css');
      fs.writeFileSync(cssFile, cssContent);
      
      const originalCwd = process.cwd();
      process.chdir(testDir);
      
      try {
        applyDeploymentConfig({ basePath: '/website' });
        
        const result = fs.readFileSync(cssFile, 'utf8');
        expect(result).toContain("url('/website/assets/images/hero-sustainability.jpg')");
        expect(result).toContain("url('/website/assets/images/hero-news.png')");
        // Ensure gradients are preserved
        expect(result).toContain('linear-gradient(to right, rgba(0, 82, 156, 0.9), rgba(0, 82, 156, 0.7))');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
