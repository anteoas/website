const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// Mock the bundleCSS function for unit testing
function bundleCSS(mainCssPath, outputPath) {
  // Read the main CSS file
  const mainCSS = fs.readFileSync(mainCssPath, 'utf8');
  
  // Replace @import statements with actual file contents
  const bundled = mainCSS.replace(
    /@import url\(['"]\.\/([^'"]+)['"]\);/g,
    (match, filename) => {
      const importPath = path.join(path.dirname(mainCssPath), filename);
      if (fs.existsSync(importPath)) {
        return fs.readFileSync(importPath, 'utf8') + '\n';
      }
      return match; // Keep original if file not found
    }
  );
  
  // Ensure output directory exists
  fs.ensureDirSync(path.dirname(outputPath));
  
  // Write bundled CSS
  fs.writeFileSync(outputPath, bundled);
  
  return bundled;
}

describe('CSS Bundling Function', () => {
  const testDir = path.join(__dirname, '../../.test-css-bundling');
  const srcDir = path.join(testDir, 'src');
  const distDir = path.join(testDir, 'dist');
  
  beforeEach(() => {
    // Create test directory structure
    fs.ensureDirSync(srcDir);
    fs.ensureDirSync(distDir);
  });
  
  afterEach(() => {
    // Clean up test directory
    fs.removeSync(testDir);
  });
  
  it('should replace local imports with file contents', () => {
    // Create test files
    const variablesContent = ':root { --color: red; }';
    const mainContent = `@import url('./variables.css');\nbody { color: var(--color); }`;
    
    fs.writeFileSync(path.join(srcDir, 'variables.css'), variablesContent);
    fs.writeFileSync(path.join(srcDir, 'main.css'), mainContent);
    
    // Bundle
    const result = bundleCSS(
      path.join(srcDir, 'main.css'),
      path.join(distDir, 'bundled.css')
    );
    
    // Check result
    expect(result).not.toContain("@import url('./variables.css')");
    expect(result).toContain(':root { --color: red; }');
    expect(result).toContain('body { color: var(--color); }');
  });
  
  it('should handle multiple imports', () => {
    // Create test files
    const resetContent = '* { margin: 0; padding: 0; }';
    const variablesContent = ':root { --color: blue; }';
    const mainContent = `@import url('./reset.css');\n@import url('./variables.css');\nbody { color: var(--color); }`;
    
    fs.writeFileSync(path.join(srcDir, 'reset.css'), resetContent);
    fs.writeFileSync(path.join(srcDir, 'variables.css'), variablesContent);
    fs.writeFileSync(path.join(srcDir, 'main.css'), mainContent);
    
    // Bundle
    const result = bundleCSS(
      path.join(srcDir, 'main.css'),
      path.join(distDir, 'bundled.css')
    );
    
    // Check result
    expect(result).not.toContain("@import url('./reset.css')");
    expect(result).not.toContain("@import url('./variables.css')");
    expect(result).toContain('* { margin: 0; padding: 0; }');
    expect(result).toContain(':root { --color: blue; }');
    
    // Check order is preserved
    const resetIndex = result.indexOf('* { margin: 0; padding: 0; }');
    const variablesIndex = result.indexOf(':root { --color: blue; }');
    const bodyIndex = result.indexOf('body { color: var(--color); }');
    
    expect(resetIndex).toBeLessThan(variablesIndex);
    expect(variablesIndex).toBeLessThan(bodyIndex);
  });
  
  it('should preserve non-local imports', () => {
    const mainContent = `@import url('https://fonts.googleapis.com/css2');\n@import url('./local.css');\nbody { font-family: Arial; }`;
    const localContent = '.local { color: green; }';
    
    fs.writeFileSync(path.join(srcDir, 'local.css'), localContent);
    fs.writeFileSync(path.join(srcDir, 'main.css'), mainContent);
    
    // Bundle
    const result = bundleCSS(
      path.join(srcDir, 'main.css'),
      path.join(distDir, 'bundled.css')
    );
    
    // Check result
    expect(result).toContain("@import url('https://fonts.googleapis.com/css2')");
    expect(result).not.toContain("@import url('./local.css')");
    expect(result).toContain('.local { color: green; }');
  });
  
  it('should handle single and double quotes', () => {
    const variablesContent = ':root { --size: 16px; }';
    const mainContent = `@import url("./variables.css");\n@import url('./variables.css');\nbody { font-size: var(--size); }`;
    
    fs.writeFileSync(path.join(srcDir, 'variables.css'), variablesContent);
    fs.writeFileSync(path.join(srcDir, 'main.css'), mainContent);
    
    // Bundle
    const result = bundleCSS(
      path.join(srcDir, 'main.css'),
      path.join(distDir, 'bundled.css')
    );
    
    // Check result - should replace both quote styles
    expect(result).not.toContain('@import url("./variables.css")');
    expect(result).not.toContain("@import url('./variables.css')");
    
    // Should have two instances of the variables content
    const matches = result.match(/:root { --size: 16px; }/g);
    expect(matches).toHaveLength(2);
  });
  
  it('should create output directory if it does not exist', () => {
    const mainContent = 'body { margin: 0; }';
    fs.writeFileSync(path.join(srcDir, 'main.css'), mainContent);
    
    const deepOutputPath = path.join(distDir, 'deep/nested/bundled.css');
    
    // Bundle
    bundleCSS(
      path.join(srcDir, 'main.css'),
      deepOutputPath
    );
    
    // Check file was created
    expect(fs.existsSync(deepOutputPath)).toBe(true);
    expect(fs.readFileSync(deepOutputPath, 'utf8')).toBe(mainContent);
  });
});
