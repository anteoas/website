const ImageProcessor = require('../../scripts/utils/image-processor');
const path = require('path');
const fs = require('fs-extra');

// Mock fs-extra
jest.mock('fs-extra');

describe('ImageProcessor', () => {
  let imageProcessor;

  beforeEach(() => {
    imageProcessor = new ImageProcessor();
    fs.existsSync.mockClear();
    fs.readFileSync.mockClear();
  });

  describe('extractFromHtml', () => {
    it('should extract images with query parameters', () => {
      const html = `
        <img src="/assets/images/logo.png?size=200x100&format=webp" alt="Logo">
        <img src="/assets/images/team/john.jpg?size=300x300" alt="John">
      `;
      
      imageProcessor.extractFromHtml(html, 'test.html');
      
      expect(imageProcessor.requirements.size).toBe(2);
      expect(imageProcessor.requirements.has('logo.png@200x100.webp')).toBe(true);
      expect(imageProcessor.requirements.has('team/john.jpg@300x300')).toBe(true);
    });

    it('should ignore external URLs', () => {
      const html = `
        <img src="https://example.com/image.png?size=200x100" alt="External">
        <img src="/assets/images/local.png?size=200x100" alt="Local">
      `;
      
      imageProcessor.extractFromHtml(html);
      
      expect(imageProcessor.requirements.size).toBe(1);
      expect(imageProcessor.requirements.has('local.png@200x100')).toBe(true);
    });

    it('should extract images from background-image styles', () => {
      const html = `
        <div style="background-image: url('/assets/images/hero.jpg?size=1920x1080&format=jpg')"></div>
      `;
      
      imageProcessor.extractFromHtml(html);
      
      expect(imageProcessor.requirements.size).toBe(1);
      expect(imageProcessor.requirements.has('hero.jpg@1920x1080.jpg')).toBe(true);
    });

    it('should extract images from compound background-image with gradients', () => {
      const html = `
        <section style="background-image: linear-gradient(130deg, #003f7e4d, #3fb4984d), url('/assets/images/hero-about2.png?size=1920x1080&format=jpg&quality=85')"></section>
      `;
      
      imageProcessor.extractFromHtml(html);
      
      expect(imageProcessor.requirements.size).toBe(1);
      expect(imageProcessor.requirements.has('hero-about2.png@1920x1080.jpg')).toBe(true);
    });

    it('should ignore images without query parameters', () => {
      const html = `
        <img src="/assets/images/logo.png" alt="Logo">
        <img src="/assets/images/team/john.jpg?size=300x300" alt="John">
      `;
      
      imageProcessor.extractFromHtml(html);
      
      expect(imageProcessor.requirements.size).toBe(1);
    });
  });

  describe('getProcessedUrl', () => {
    it('should return processed URL for images with size parameter', () => {
      const url = '/assets/images/logo.png?size=200x100&format=webp';
      const result = imageProcessor.getProcessedUrl(url);
      
      expect(result).toBe('/assets/images/logo-200x100.webp');
    });

    it('should handle nested paths correctly', () => {
      const url = '/assets/images/team/john.jpg?size=300x300';
      const result = imageProcessor.getProcessedUrl(url);
      
      expect(result).toBe('/assets/images/team/john-300x300.jpg');
    });

    it('should return original URL if no size parameter', () => {
      const url = '/assets/images/logo.png';
      const result = imageProcessor.getProcessedUrl(url);
      
      expect(result).toBe('/assets/images/logo.png');
    });

    it('should use original format if format parameter not specified', () => {
      const url = '/assets/images/logo.png?size=200x100';
      const result = imageProcessor.getProcessedUrl(url);
      
      expect(result).toBe('/assets/images/logo-200x100.png');
    });
  });

  describe('replaceUrlsInHtml', () => {
    it('should replace image URLs with processed versions', () => {
      const html = `
        <img src="/assets/images/logo.png?size=200x100" alt="Logo">
        <img src="/assets/images/team/john.jpg?size=300x300&format=webp" alt="John">
      `;
      
      const result = imageProcessor.replaceUrlsInHtml(html);
      
      expect(result).toContain('src="/assets/images/logo-200x100.png"');
      expect(result).toContain('src="/assets/images/team/john-300x300.webp"');
    });

    it('should not modify URLs without query parameters', () => {
      const html = '<img src="/assets/images/logo.png" alt="Logo">';
      const result = imageProcessor.replaceUrlsInHtml(html);
      
      expect(result).toBe(html);
    });

    it('should replace URLs in background-image styles', () => {
      const html = `<div style="background-image: url('/assets/images/hero.jpg?size=1920x1080')"></div>`;
      const result = imageProcessor.replaceUrlsInHtml(html);
      
      expect(result).toContain("url('/assets/images/hero-1920x1080.jpg')");
    });

    it('should replace URLs in compound background-image with gradients', () => {
      const html = `<section style="background-image: linear-gradient(130deg, #003f7e4d, #3fb4984d), url('/assets/images/hero-about2.png?size=1920x1080&format=jpg&quality=85'); text-align: right"></section>`;
      const result = imageProcessor.replaceUrlsInHtml(html);
      
      expect(result).toContain("linear-gradient(130deg, #003f7e4d, #3fb4984d)");
      expect(result).toContain("url('/assets/images/hero-about2-1920x1080.jpg')");
      expect(result).toContain("text-align: right");
    });

    it('should not replace URLs without query parameters in background-image', () => {
      const html = `<div style="background-image: url('/assets/images/pattern.svg')"></div>`;
      const result = imageProcessor.replaceUrlsInHtml(html);
      
      expect(result).toBe(html);
    });
  });
});
