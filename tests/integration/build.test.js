const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { removeSync } = require('fs-extra');

describe('Build Integration Tests', () => {
  const projectRoot = path.join(__dirname, '../../');
  
  // Change to project root for all tests
  beforeAll(() => {
    process.chdir(projectRoot);
  });

  beforeEach(() => {
    // Clean build directories before each test
    removeSync('dist');
    removeSync('.temp');
  });

  describe('Basic Build', () => {
    it('should build successfully', (done) => {
      exec('npm run build', { cwd: projectRoot }, (error, stdout, stderr) => {
        if (error) {
          console.error(stderr);
          return done(error);
        }
        
        // Check that the dist directory exists
        expect(fs.existsSync('dist')).toBe(true);
        expect(fs.existsSync('dist/index.html')).toBe(true);
        expect(fs.existsSync('dist/assets/css/style.css')).toBe(true);
        expect(fs.existsSync('dist/assets/js/bundle.min.js')).toBe(true);
        
        // Check CSS bundling - variables.css should not exist separately
        expect(fs.existsSync('dist/assets/css/variables.css')).toBe(false);
        
        // Check that config was injected
        const indexContent = fs.readFileSync('dist/index.html', 'utf8');
        expect(indexContent).toContain('window.ANTEO_CONFIG');
        
        done();
      });
    }, 30000);
  });

  describe('Configuration Injection', () => {
    it('should inject configuration in all HTML files', (done) => {
      exec('npm run build', { cwd: projectRoot }, (error, stdout, stderr) => {
        if (error) {
          console.error(stderr);
          return done(error);
        }
        
        const indexContent = fs.readFileSync('dist/index.html', 'utf8');
        const aboutContent = fs.readFileSync('dist/about.html', 'utf8');
        
        // Check config exists
        expect(indexContent).toContain('window.ANTEO_CONFIG');
        expect(aboutContent).toContain('window.ANTEO_CONFIG');
        
        // Check config has required fields
        expect(indexContent).toContain('"basePath":');
        expect(indexContent).toContain('"currentLang":');
        expect(indexContent).toContain('"langPrefix":');
        
        done();
      });
    }, 30000);
  });

  describe('Image Processing', () => {
    it('should process images with query parameters', (done) => {
      exec('npm run build', { cwd: projectRoot }, (error, stdout, stderr) => {
        if (error) {
          console.error(stderr);
          return done(error);
        }
        
        // Check if logo was processed
        const aboutContent = fs.readFileSync('dist/about.html', 'utf8');
        expect(aboutContent).toMatch(/anteo-logo-\d+x\d+\.png/);
        
        // Check if processed images exist
        const processedImages = fs.readdirSync('dist/assets/images');
        const logoImages = processedImages.filter(img => img.startsWith('anteo-logo-'));
        expect(logoImages.length).toBeGreaterThan(0);
        
        done();
      });
    }, 30000);
  });

  describe('JavaScript Bundling', () => {
    it('should create development bundle with source map', (done) => {
      exec('npm run build:dev', { cwd: projectRoot }, (error, stdout, stderr) => {
        if (error) {
          console.error(stderr);
          return done(error);
        }
        
        expect(fs.existsSync('dist/assets/js/bundle.js')).toBe(true);
        expect(fs.existsSync('dist/assets/js/bundle.js.map')).toBe(true);
        
        const indexContent = fs.readFileSync('dist/index.html', 'utf8');
        expect(indexContent).toMatch(/src="[^"]*\/assets\/js\/bundle\.js"/);
        
        done();
      });
    }, 30000);

    it('should create production bundle minified', (done) => {
      exec('npm run build', { cwd: projectRoot }, (error, stdout, stderr) => {
        if (error) {
          console.error(stderr);
          return done(error);
        }
        
        expect(fs.existsSync('dist/assets/js/bundle.min.js')).toBe(true);
        
        const indexContent = fs.readFileSync('dist/index.html', 'utf8');
        expect(indexContent).toMatch(/src="[^"]*\/assets\/js\/bundle\.min\.js"/);
        
        done();
      });
    }, 30000);
  });

  describe('Multilingual Support', () => {
    it('should build both language versions', (done) => {
      exec('npm run build', { cwd: projectRoot }, (error, stdout, stderr) => {
        if (error) {
          console.error(stderr);
          return done(error);
        }
        
        // Check Norwegian version
        expect(fs.existsSync('dist/index.html')).toBe(true);
        expect(fs.existsSync('dist/about.html')).toBe(true);
        
        // Check English version
        expect(fs.existsSync('dist/en/index.html')).toBe(true);
        expect(fs.existsSync('dist/en/about.html')).toBe(true);
        
        // Check language config
        const noIndex = fs.readFileSync('dist/index.html', 'utf8');
        const enIndex = fs.readFileSync('dist/en/index.html', 'utf8');
        
        expect(noIndex).toContain('"currentLang": "no"');
        expect(enIndex).toContain('"currentLang": "en"');
        
        done();
      });
    }, 30000);
  });
});
