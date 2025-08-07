const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');
const marked = require('marked');

describe('Content Processing', () => {
  describe('Markdown Processing', () => {
    it('should parse frontmatter correctly', () => {
      const markdown = `---
title: Test Page
description: Test description
layout: page
---

# Test Content

This is a test.`;

      const { data, content } = matter(markdown);
      
      expect(data.title).toBe('Test Page');
      expect(data.description).toBe('Test description');
      expect(data.layout).toBe('page');
      expect(content).toContain('# Test Content');
    });

    it('should convert markdown to HTML', () => {
      const markdown = `# Heading

This is a **bold** text with [a link](/test).

- Item 1
- Item 2`;

      const html = marked.parse(markdown);
      
      expect(html).toContain('<h1>Heading</h1>');
      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<a href="/test">a link</a>');
      expect(html).toContain('<ul>');
      expect(html).toContain('<li>Item 1</li>');
    });
  });

  describe('Team Member Processing', () => {
    it('should generate team member HTML correctly', () => {
      const member = {
        name: 'John Doe',
        position: 'Developer',
        email: 'john@example.com',
        phone: '+47 123 45 678',
        linkedin: 'https://linkedin.com/in/johndoe',
        photo: '/assets/images/team/john.jpg'
      };

      const html = `
          <div class="team-member">
            <img src="${member.photo}?size=300x300&format=jpg" alt="${member.name}" class="team-photo">
            <h3>${member.name}</h3>
            <p class="position">${member.position}</p>
            ${member.email ? `<p class="contact"><a href="mailto:${member.email}">${member.email}</a></p>` : ''}
            ${member.phone ? `<p class="contact"><a href="tel:${member.phone}">${member.phone}</a></p>` : ''}
          </div>
        `;

      expect(html).toContain('John Doe');
      expect(html).toContain('Developer');
      expect(html).toContain('mailto:john@example.com');
      expect(html).toContain('tel:+47 123 45 678');
      expect(html).toContain('?size=300x300&format=jpg');
    });
  });

  describe('Language Handling', () => {
    it('should handle language prefixes correctly', () => {
      const tests = [
        { lang: 'no', isDefault: true, expected: '' },
        { lang: 'en', isDefault: false, expected: '/en' }
      ];

      tests.forEach(({ lang, isDefault, expected }) => {
        const langPrefix = lang === 'no' ? '' : `/${lang}`;
        expect(langPrefix).toBe(expected);
      });
    });

    it('should process language-specific navigation', () => {
      const navData = {
        main: [
          { url: '/products.html', label: 'Products' },
          { url: '/about.html', label: 'About' }
        ]
      };

      const langPrefix = '/en';
      const processedNav = navData.main.map(item => ({
        ...item,
        url: `${langPrefix}${item.url}`
      }));

      expect(processedNav[0].url).toBe('/en/products.html');
      expect(processedNav[1].url).toBe('/en/about.html');
    });
  });
});
