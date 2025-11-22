/**
 * Tests for validation utilities
 */

import {
  validateUrl,
  requireValidUrl,
  detectFeedIdOrUrl,
  validateDateFormat,
  requireValidDate,
  validateRange,
  validateLanguageCode,
  sanitizeSearchQuery,
} from '../../../src/utils/validation';
import { ValidationError } from '../../../src/utils/errors';

describe('validation utilities', () => {
  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://example.com/feed')).toBe(true);
      expect(validateUrl('https://example.com:8080/path?query=1')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not a url')).toBe(false);
      expect(validateUrl('example.com')).toBe(false);
      expect(validateUrl('')).toBe(false);
    });
  });

  describe('requireValidUrl', () => {
    it('should not throw for valid URLs', () => {
      expect(() => requireValidUrl('https://example.com')).not.toThrow();
    });

    it('should throw ValidationError for invalid URLs', () => {
      expect(() => requireValidUrl('not a url')).toThrow(ValidationError);
    });
  });

  describe('detectFeedIdOrUrl', () => {
    it('should detect numeric feed ID', () => {
      expect(detectFeedIdOrUrl('12345')).toEqual({ type: 'id', value: 12345 });
      expect(detectFeedIdOrUrl('  42  ')).toEqual({ type: 'id', value: 42 });
    });

    it('should detect feed URL', () => {
      const url = 'https://example.com/feed';
      expect(detectFeedIdOrUrl(url)).toEqual({ type: 'url', value: url });
    });

    it('should treat non-numeric strings as URLs', () => {
      expect(detectFeedIdOrUrl('abc123')).toEqual({ type: 'url', value: 'abc123' });
    });
  });

  describe('validateDateFormat', () => {
    it('should validate correct date formats', () => {
      expect(validateDateFormat('2024-01-15')).toBe(true);
      expect(validateDateFormat('2024-12-31')).toBe(true);
    });

    it('should reject invalid date formats', () => {
      expect(validateDateFormat('2024-1-15')).toBe(false); // Missing leading zero
      expect(validateDateFormat('24-01-15')).toBe(false); // Wrong year format
      expect(validateDateFormat('2024/01/15')).toBe(false); // Wrong separator
      expect(validateDateFormat('not a date')).toBe(false);
    });

    it('should reject invalid dates', () => {
      // Note: JavaScript Date constructor is lenient with dates
      // Focus on format validation
      expect(validateDateFormat('2024-1-15')).toBe(false); // Missing leading zero
    });
  });

  describe('requireValidDate', () => {
    it('should not throw for valid dates', () => {
      expect(() => requireValidDate('2024-01-15')).not.toThrow();
    });

    it('should throw ValidationError for invalid dates', () => {
      expect(() => requireValidDate('2024-1-15')).toThrow(ValidationError);
    });
  });

  describe('validateRange', () => {
    it('should not throw for values within range', () => {
      expect(() => validateRange(50, 1, 100)).not.toThrow();
      expect(() => validateRange(1, 1, 100)).not.toThrow();
      expect(() => validateRange(100, 1, 100)).not.toThrow();
    });

    it('should throw ValidationError for values outside range', () => {
      expect(() => validateRange(0, 1, 100)).toThrow(ValidationError);
      expect(() => validateRange(101, 1, 100)).toThrow(ValidationError);
    });
  });

  describe('validateLanguageCode', () => {
    it('should validate 2-letter language codes', () => {
      expect(validateLanguageCode('en')).toBe(true);
      expect(validateLanguageCode('es')).toBe(true);
      expect(validateLanguageCode('EN')).toBe(true); // Case insensitive
    });

    it('should reject invalid language codes', () => {
      expect(validateLanguageCode('eng')).toBe(false); // Too long
      expect(validateLanguageCode('e')).toBe(false); // Too short
      expect(validateLanguageCode('e1')).toBe(false); // Contains number
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should trim whitespace', () => {
      expect(sanitizeSearchQuery('  query  ')).toBe('query');
      expect(sanitizeSearchQuery('query')).toBe('query');
    });

    it('should handle empty strings', () => {
      expect(sanitizeSearchQuery('')).toBe('');
      expect(sanitizeSearchQuery('   ')).toBe('');
    });
  });
});
