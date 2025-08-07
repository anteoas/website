const { readFileSync, outputFileSync } = require('fs-extra');
const path = require('path');

function bundleCSS() {
  console.log('Bundling CSS...');
  
  // Read the main CSS file
  const mainCSS = readFileSync('src/assets/css/style.css', 'utf8');
  
  // Replace @import statements with actual file contents
  const bundled = mainCSS.replace(
    /@import url\(['"]\.\/([^'"]+)['"]\);/g,
    (match, filename) => {
      const importPath = path.join('src/assets/css', filename);
      try {
        const content = readFileSync(importPath, 'utf8');
        return `/* --- ${filename} --- */\n${content}\n`;
      } catch (err) {
        console.warn(`Warning: Could not import ${filename}`);
        return match;
      }
    }
  );
  
  // Write bundled CSS
  outputFileSync('dist/assets/css/style.css', bundled);
  console.log('✓ CSS bundled successfully');
  
  // Return a map of CSS files for reference
  return {
    'style.css': 'dist/assets/css/style.css'
  };
}

module.exports = { bundleCSS };
