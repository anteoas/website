const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

describe('Build Architecture Separation', () => {
  const projectRoot = path.join(__dirname, '../../');
  
  beforeEach(() => {
    // Clean build directory
    fs.removeSync(path.join(projectRoot, 'dist'));
    fs.removeSync(path.join(projectRoot, '.temp'));
  });

  afterEach(() => {
    // Clean up after tests
    fs.removeSync(path.join(projectRoot, 'dist'));
    fs.removeSync(path.join(projectRoot, '.temp'));
  });

  it('should build without base path when no GitHub environment is set', () => {
    execSync('npm run build', { 
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        GITHUB_ACTIONS: '',
        GITHUB_REPOSITORY: ''
      }
    });
    
    const indexHtml = fs.readFileSync(path.join(projectRoot, 'dist/index.html'), 'utf8');
    
    // Should have root-relative paths
    expect(indexHtml).toContain('href="/assets/css/style.css"');
    expect(indexHtml).toContain('src="/assets/js/bundle.min.js"');
    expect(indexHtml).not.toContain('/website/');
  });

  it('should apply base path only in post-processing phase', () => {
    execSync('npm run build', { 
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        GITHUB_ACTIONS: 'true',
        GITHUB_REPOSITORY: 'anteoas/website'
      }
    });
    
    const indexHtml = fs.readFileSync(path.join(projectRoot, 'dist/index.html'), 'utf8');
    
    // Should have base path applied
    expect(indexHtml).toContain('href="/website/assets/css/style.css"');
    expect(indexHtml).toContain('src="/website/assets/js/bundle.min.js"');
    
    // Non-HTML files should not be modified
    const cssContent = fs.readFileSync(path.join(projectRoot, 'dist/assets/css/style.css'), 'utf8');
    const jsContent = fs.readFileSync(path.join(projectRoot, 'dist/assets/js/bundle.min.js'), 'utf8');
    const jsonContent = fs.readFileSync(path.join(projectRoot, 'dist/api/content.json'), 'utf8');
    
    // CSS and JSON should not contain base paths added by the build
    expect(cssContent).not.toContain('"href":"/website/');
    expect(jsonContent).not.toContain('"href":"/website/');
  });
});
