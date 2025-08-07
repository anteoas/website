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

  it('should inject ANTEO_CONFIG in all HTML files', () => {
    execSync('npm run build', { 
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });
    
    const htmlFiles = fs.readdirSync(path.join(projectRoot, 'dist'))
      .filter(f => f.endsWith('.html'))
      .map(f => ({ 
        name: f, 
        content: fs.readFileSync(path.join(projectRoot, 'dist', f), 'utf8') 
      }));
    
    htmlFiles.forEach(({ name, content }) => {
      expect(content).toContain('window.ANTEO_CONFIG');
      expect(content).toContain('"basePath":');
      expect(content).toContain('"currentLang":');
      expect(content).toContain('"langPrefix":');
    });
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
    
    // Check config has empty base path
    expect(indexHtml).toContain('"basePath": ""');
    
    // Check URLs are root-relative
    expect(indexHtml).toContain('href="/assets/css/style.css"');
    expect(indexHtml).toContain('src="/assets/js/bundle.min.js"');
    expect(indexHtml).not.toContain('/website/');
  });

  it('should apply base path in config and URLs when GitHub environment is set', () => {
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
    
    // Check config has base path
    expect(indexHtml).toContain('"basePath": "/website"');
    expect(indexHtml).toContain('"gitHubActions": true');
    
    // Check URLs have base path applied
    expect(indexHtml).toContain('href="/website/assets/css/style.css"');
    expect(indexHtml).toContain('src="/website/assets/js/bundle.min.js"');
  });

  it('should inject correct language config for each page', () => {
    execSync('npm run build', { 
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });
    
    // Check Norwegian page
    const noIndex = fs.readFileSync(path.join(projectRoot, 'dist/index.html'), 'utf8');
    expect(noIndex).toContain('"currentLang": "no"');
    expect(noIndex).toContain('"langPrefix": ""');
    
    // Check English page
    const enIndex = fs.readFileSync(path.join(projectRoot, 'dist/en/index.html'), 'utf8');
    expect(enIndex).toContain('"currentLang": "en"');
    expect(enIndex).toContain('"langPrefix": "/en"');
  });

  it('should not modify non-HTML files', () => {
    execSync('npm run build', { 
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        GITHUB_ACTIONS: 'true',
        GITHUB_REPOSITORY: 'anteoas/website'
      }
    });
    
    // Non-HTML files should not contain config
    const cssContent = fs.readFileSync(path.join(projectRoot, 'dist/assets/css/style.css'), 'utf8');
    const jsContent = fs.readFileSync(path.join(projectRoot, 'dist/assets/js/bundle.min.js'), 'utf8');
    const jsonContent = fs.readFileSync(path.join(projectRoot, 'dist/api/content.json'), 'utf8');
    
    expect(cssContent).not.toContain('ANTEO_CONFIG');
    expect(jsonContent).not.toContain('ANTEO_CONFIG');
    
    // JS might reference ANTEO_CONFIG in code, but shouldn't have the injected script tag
    expect(jsContent).not.toContain('<script>');
  });
});
