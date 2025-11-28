/**
 * Tests for language utilities
 */

import { getLanguageName, formatLanguage } from '../../../src/utils/language';

describe('language utilities', () => {
  describe('getLanguageName', () => {
    it('should return full language name for common codes', () => {
      expect(getLanguageName('en')).toBe('English');
      expect(getLanguageName('es')).toBe('Spanish');
      expect(getLanguageName('fr')).toBe('French');
      expect(getLanguageName('de')).toBe('German');
      expect(getLanguageName('ja')).toBe('Japanese');
      expect(getLanguageName('zh')).toBe('Chinese');
      expect(getLanguageName('pt')).toBe('Portuguese');
    });

    it('should handle uppercase codes', () => {
      expect(getLanguageName('EN')).toBe('English');
      expect(getLanguageName('ES')).toBe('Spanish');
    });

    it('should handle extended codes like en-US', () => {
      expect(getLanguageName('en-US')).toBe('English');
      expect(getLanguageName('en-GB')).toBe('English');
      expect(getLanguageName('pt-BR')).toBe('Portuguese');
    });

    it('should handle underscore-separated codes like en_US', () => {
      expect(getLanguageName('en_US')).toBe('English');
      expect(getLanguageName('pt_BR')).toBe('Portuguese');
    });

    it('should return the code itself for unknown languages', () => {
      expect(getLanguageName('xyz')).toBe('xyz');
      expect(getLanguageName('unknown')).toBe('unknown');
    });

    it('should return "Unknown" for empty or null codes', () => {
      expect(getLanguageName('')).toBe('Unknown');
      expect(getLanguageName(null as any)).toBe('Unknown');
      expect(getLanguageName(undefined as any)).toBe('Unknown');
    });
  });

  describe('formatLanguage', () => {
    it('should format known languages as "Name (code)"', () => {
      expect(formatLanguage('en')).toBe('English (en)');
      expect(formatLanguage('es')).toBe('Spanish (es)');
      expect(formatLanguage('fr')).toBe('French (fr)');
      expect(formatLanguage('de')).toBe('German (de)');
    });

    it('should handle extended codes', () => {
      expect(formatLanguage('en-US')).toBe('English (en-us)');
      expect(formatLanguage('pt-BR')).toBe('Portuguese (pt-br)');
    });

    it('should return just the code for unknown languages', () => {
      expect(formatLanguage('xyz')).toBe('xyz');
    });

    it('should return "Unknown" for empty codes', () => {
      expect(formatLanguage('')).toBe('Unknown');
      expect(formatLanguage(null as any)).toBe('Unknown');
    });

    it('should lowercase the code in the output', () => {
      expect(formatLanguage('EN')).toBe('English (en)');
      expect(formatLanguage('EN-US')).toBe('English (en-us)');
    });
  });
});
