const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

describe('Build Integration Tests', () => {
  const originalCwd = process.cwd();
  const projectRoot = path.join(__dirname, '../../');
  
  beforeAll(() => {
    process.chdir(projectRoot);
  });

  afterAll(() => {
    process.chdir(originalCwd);
  });

  beforeEach(() => {
    // Clean build directories
    fs.removeSync('dist');
    fs.removeSync('.temp');
  });

  describe('Basic Build', () => {
    it('should build without base path', (done) => {
      execSync('npm run build', { 
        env: { ...process.env, NODE_ENV: 'production' }
      });
      
      // Check output exists
      expect(fs.existsSync('dist/index.html')).toBe(true);
      expect(fs.existsSync('dist/assets/css/style.css')).toBe(true);
      expect(fs.existsSync('dist/assets/js/bundle.min.js')).toBe(true);
      
      // Check CSS bundling - variables.css should not exist separately
      expect(fs.existsSync('dist/assets/css/variables.css')).toBe(false);
      
      // Check URLs don't have base path
      const indexContent = fs.readFileSync('dist/index.html', 'utf8');
      expect(indexContent).toContain('href="/assets/css/style.css"');
      expect(indexContent).toContain('src="/assets/js/bundle.min.js"');
      
      done();
    }, 30000); // 30 second timeout for build
  });

  describe('GitHub Pages Build', () => {
    it('should build with base path for GitHub Pages', (done) => {
      execSync('npm run build', { 
        env: { 
          ...process.env, 
          NODE_ENV: 'production',
          GITHUB_ACTIONS: 'true',
          GITHUB_REPOSITORY: 'anteoas/website'
        }
      });
      
      // Check URLs have base path
      const indexContent = fs.readFileSync('dist/index.html', 'utf8');
      expect(indexContent).toContain('href="/website/assets/css/style.css"');
      expect(indexContent).toContain('src="/website/assets/js/bundle.min.js"');
      expect(indexContent).toContain('href="/website/"'); // Home link
      
      done();
    }, 30000);
  });

  describe('Image Processing', () => {
    it('should process images with query parameters', (done) => {
      execSync('npm run build', { 
        env: { ...process.env, NODE_ENV: 'production' }
      });
      
      // Check if logo was processed
      const aboutContent = fs.readFileSync('dist/about.html', 'utf8');
      expect(aboutContent).toMatch(/src="\/assets\/images\/anteo-logo-\d+x\d+\.png"/);
      
      // Check if processed images exist
      const processedImages = fs.readdirSync('dist/assets/images');
      const logoProcessed = processedImages.some(img => img.match(/anteo-logo-\d+x\d+\.png/));
      expect(logoProcessed).toBe(true);
      
      done();
    }, 30000);
  });

  describe('JavaScript Bundling', () => {
    it('should create development bundle with source map', (done) => {
      execSync('npm run build:dev', { 
        env: { ...process.env, NODE_ENV: 'development' }
      });
      
      expect(fs.existsSync('dist/assets/js/bundle.js')).toBe(true);
      expect(fs.existsSync('dist/assets/js/bundle.js.map')).toBe(true);
      
      const indexContent = fs.readFileSync('dist/index.html', 'utf8');
      expect(indexContent).toContain('src="/assets/js/bundle.js"');
      
      done();
    }, 30000);

    it('should create production bundle minified', (done) => {
      execSync('npm run build', { 
        env: { ...process.env, NODE_ENV: 'production' }
      });
      
      expect(fs.existsSync('dist/assets/js/bundle.min.js')).toBe(true);
      expect(fs.existsSync('dist/assets/js/bundle.min.js.map')).toBe(false);
      
      const indexContent = fs.readFileSync('dist/index.html', 'utf8');
      expect(indexContent).toContain('src="/assets/js/bundle.min.js"');
      
      done();
    }, 30000);
  });

  describe('Multilingual Support', () => {
    it('should build both language versions', (done) => {
      execSync('npm run build', { 
        env: { ...process.env, NODE_ENV: 'production' }
      });
      
      // Norwegian (default)
      expect(fs.existsSync('dist/index.html')).toBe(true);
      expect(fs.existsSync('dist/about.html')).toBe(true);
      
      // English
      expect(fs.existsSync('dist/en/index.html')).toBe(true);
      expect(fs.existsSync('dist/en/about.html')).toBe(true);
      
      done();
    }, 30000);
  });
});
