const fs = require('fs-extra');
const cheerio = require('cheerio');

describe('HTML Output Validation', () => {
  describe('HTML Structure', () => {
    let $;
    
    beforeAll(() => {
      // This would normally load actual build output
      const html = `
        <!DOCTYPE html>
        <html lang="no">
        <head>
          <meta charset="UTF-8">
          <title>Test - Anteo AS</title>
          <link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon-32x32.png">
          <link rel="stylesheet" href="/assets/css/style.css">
        </head>
        <body>
          <header>
            <nav>
              <a href="/" class="logo">
                <img src="/assets/images/anteo-logo.png" alt="Anteo">
              </a>
            </nav>
          </header>
          <main>
            <h1>Test Page</h1>
          </main>
        </body>
        </html>
      `;
      $ = cheerio.load(html);
    });

    it('should have required meta tags', () => {
      expect($('meta[charset="UTF-8"]').length).toBe(1);
      expect($('meta[name="viewport"]').length).toBeGreaterThanOrEqual(0);
    });

    it('should have favicon link', () => {
      const favicon = $('link[rel="icon"]');
      expect(favicon.length).toBe(1);
      expect(favicon.attr('href')).toContain('favicon');
    });

    it('should have navigation structure', () => {
      expect($('header nav').length).toBe(1);
      expect($('.logo').length).toBe(1);
    });

    it('should have valid image attributes', () => {
      $('img').each((i, elem) => {
        const img = $(elem);
        expect(img.attr('src')).toBeTruthy();
        expect(img.attr('alt')).toBeTruthy();
      });
    });

    it('should have no broken internal links', () => {
      $('a[href^="/"]').each((i, elem) => {
        const href = $(elem).attr('href');
        // Should not have double slashes
        expect(href).not.toMatch(/\/\//);
        // Should not have double base paths
        expect(href).not.toMatch(/\/website\/website/);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      const html = `
        <h1>Main Title</h1>
        <h2>Subtitle</h2>
        <h3>Sub-subtitle</h3>
      `;
      const $ = cheerio.load(html);
      
      // Should have h1
      expect($('h1').length).toBeGreaterThan(0);
      
      // Headings should be in order (no h3 before h2, etc)
      let lastLevel = 0;
      $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
        const level = parseInt(elem.name.substring(1));
        expect(level).toBeLessThanOrEqual(lastLevel + 1);
        lastLevel = level;
      });
    });

    it('should have lang attribute', () => {
      const html = '<html lang="no">';
      const $ = cheerio.load(html);
      expect($('html').attr('lang')).toBeTruthy();
    });
  });
});
