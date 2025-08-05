const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

describe('CSS Bundling', () => {
  const projectRoot = path.join(__dirname, '../../');
  const distCssPath = path.join(projectRoot, 'dist/assets/css');
  const srcCssPath = path.join(projectRoot, 'src/assets/css');
  
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

  describe('CSS Bundle Generation', () => {
    it('should create a single bundled CSS file', () => {
      execSync('npm run build', { cwd: projectRoot });
      
      // Check that style.css exists
      expect(fs.existsSync(path.join(distCssPath, 'style.css'))).toBe(true);
      
      // Check that variables.css does NOT exist in dist
      expect(fs.existsSync(path.join(distCssPath, 'variables.css'))).toBe(false);
    });

    it('should inline local CSS imports', () => {
      execSync('npm run build', { cwd: projectRoot });
      
      const bundledCss = fs.readFileSync(path.join(distCssPath, 'style.css'), 'utf8');
      const variablesCss = fs.readFileSync(path.join(srcCssPath, 'variables.css'), 'utf8');
      
      // Check that the import statement is gone
      expect(bundledCss).not.toContain("@import url('./variables.css')");
      
      // Check that variables content is included
      expect(bundledCss).toContain(':root {');
      
      // Extract CSS custom properties from variables.css
      const variableMatches = variablesCss.match(/--[\w-]+:\s*[^;]+/g);
      
      // Verify each variable from source appears in bundled output
      if (variableMatches) {
        variableMatches.forEach(variable => {
          expect(bundledCss).toContain(variable);
        });
      }
    });

    it('should preserve external CSS imports', () => {
      execSync('npm run build', { cwd: projectRoot });
      
      const bundledCss = fs.readFileSync(path.join(distCssPath, 'style.css'), 'utf8');
      
      // Check that external imports are preserved
      expect(bundledCss).toContain("@import url('https://fonts.googleapis.com");
    });

    it('should maintain CSS order during bundling', () => {
      execSync('npm run build', { cwd: projectRoot });
      
      const bundledCss = fs.readFileSync(path.join(distCssPath, 'style.css'), 'utf8');
      
      // Variables should come before the rest of the styles
      const rootIndex = bundledCss.indexOf(':root {');
      const bodyIndex = bundledCss.indexOf('body {');
      
      expect(rootIndex).toBeGreaterThan(-1);
      expect(bodyIndex).toBeGreaterThan(-1);
      expect(rootIndex).toBeLessThan(bodyIndex);
    });
  });

  describe('HTML References', () => {
    it('should reference only the bundled CSS file in HTML', () => {
      execSync('npm run build', { cwd: projectRoot });
      
      const indexHtml = fs.readFileSync(path.join(projectRoot, 'dist/index.html'), 'utf8');
      
      // Should have style.css reference (build phase creates root-relative paths)
      // The deployment phase might add base paths, so we just check the file is referenced
      expect(indexHtml).toMatch(/href="[^"]*\/assets\/css\/style\.css"/);
      
      // Should NOT have variables.css reference
      expect(indexHtml).not.toContain('variables.css');
    });
  });

  describe('Development vs Production', () => {
    it('should bundle CSS in development mode', () => {
      execSync('npm run build:dev', { cwd: projectRoot });
      
      // Check that bundling still works in dev
      expect(fs.existsSync(path.join(distCssPath, 'style.css'))).toBe(true);
      expect(fs.existsSync(path.join(distCssPath, 'variables.css'))).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing import files gracefully', () => {
      // Create a temporary CSS file with a non-existent import
      const tempCssPath = path.join(srcCssPath, 'temp-test.css');
      const originalContent = fs.readFileSync(path.join(srcCssPath, 'style.css'), 'utf8');
      
      try {
        // Add a non-existent import
        const testContent = `@import url('./non-existent.css');\n${originalContent}`;
        fs.writeFileSync(path.join(srcCssPath, 'style.css'), testContent);
        
        // Build should not throw
        expect(() => {
          execSync('npm run build', { cwd: projectRoot });
        }).not.toThrow();
        
        // The import should remain unchanged in output
        const bundledCss = fs.readFileSync(path.join(distCssPath, 'style.css'), 'utf8');
        expect(bundledCss).toContain("@import url('./non-existent.css')");
        
      } finally {
        // Restore original content
        fs.writeFileSync(path.join(srcCssPath, 'style.css'), originalContent);
      }
    });
  });
});
