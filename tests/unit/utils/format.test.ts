/**
 * Tests for format utilities
 */

import {
  truncateText,
  stripHtml,
  formatNumber,
  formatUrl,
  capitalize,
  formatBoolean,
  pluralize,
} from '../../../src/utils/format';

describe('format utilities', () => {
  describe('truncateText', () => {
    it('should not truncate text shorter than max length', () => {
      const text = 'Short text';
      expect(truncateText(text, 20)).toBe('Short text');
    });

    it('should truncate text at word boundary', () => {
      const text = 'This is a long text that needs to be truncated';
      const result = truncateText(text, 20);
      expect(result.length).toBeLessThanOrEqual(20);
      expect(result).toContain('...');
      expect(result).not.toContain('trunca'); // Should not cut mid-word
    });

    it('should handle text with no spaces', () => {
      const text = 'Verylongtextwithoutanyspaces';
      const result = truncateText(text, 15);
      expect(result.length).toBe(15);
      expect(result).toContain('...');
    });

    it('should handle empty text', () => {
      expect(truncateText('', 10)).toBe('');
    });
  });

  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      const html = '<p>This is <strong>bold</strong> text</p>';
      expect(stripHtml(html)).toBe('This is bold text');
    });

    it('should decode HTML entities', () => {
      const html = '&amp; &lt; &gt; &quot; &#39;';
      expect(stripHtml(html)).toBe('& < > " \'');
    });

    it('should handle numeric entities', () => {
      const html = '&#65; &#66; &#67;';
      expect(stripHtml(html)).toBe('A B C');
    });

    it('should clean up whitespace', () => {
      const html = '<p>Text   with    multiple    spaces</p>';
      expect(stripHtml(html)).toBe('Text with multiple spaces');
    });

    it('should handle empty string', () => {
      expect(stripHtml('')).toBe('');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with thousands separators', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
    });

    it('should handle small numbers', () => {
      expect(formatNumber(42)).toBe('42');
      expect(formatNumber(999)).toBe('999');
    });
  });

  describe('formatUrl', () => {
    it('should not modify short URLs', () => {
      const url = 'https://example.com/feed';
      expect(formatUrl(url, 100)).toBe(url);
    });

    it('should truncate long URLs', () => {
      const url = 'https://example.com/very/long/path/to/resource';
      const result = formatUrl(url, 30);
      expect(result.length).toBeLessThanOrEqual(30);
      expect(result).toContain('...');
    });

    it('should preserve protocol and domain when truncating', () => {
      const url = 'https://example.com/very/long/path/to/resource';
      const result = formatUrl(url, 30);
      expect(result).toContain('https://');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('world')).toBe('World');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should not affect already capitalized strings', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });
  });

  describe('formatBoolean', () => {
    it('should format boolean as Yes/No', () => {
      expect(formatBoolean(true)).toBe('Yes');
      expect(formatBoolean(false)).toBe('No');
    });
  });

  describe('pluralize', () => {
    it('should return singular for count of 1', () => {
      expect(pluralize(1, 'episode')).toBe('episode');
    });

    it('should return plural for count > 1', () => {
      expect(pluralize(2, 'episode')).toBe('episodes');
      expect(pluralize(0, 'episode')).toBe('episodes');
    });

    it('should use custom plural form', () => {
      expect(pluralize(2, 'category', 'categories')).toBe('categories');
    });
  });
});
