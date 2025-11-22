import {
  sanitizeForFilesystem,
  parseDate,
  isDateInRange,
  getFileExtension,
  formatBytes,
} from '../../src/utils';

describe('sanitizeForFilesystem', () => {
  it('should sanitize filenames with special characters', () => {
    expect(sanitizeForFilesystem('Episode: The Beginning')).toBe('Episode The Beginning');
    expect(sanitizeForFilesystem('File/with\\slashes')).toBe('Filewithslashes');
  });

  it('should handle multiple spaces', () => {
    expect(sanitizeForFilesystem('Episode    with    spaces')).toBe('Episode with spaces');
  });

  it('should remove trailing periods (Windows compatibility)', () => {
    expect(sanitizeForFilesystem('Episode...')).toBe('Episode');
    expect(sanitizeForFilesystem('Episode 1.')).toBe('Episode 1');
  });

  it('should handle empty or invalid strings', () => {
    expect(sanitizeForFilesystem('')).toBe('episode');
    expect(sanitizeForFilesystem('...')).toBe('episode');
  });

  it('should preserve valid characters', () => {
    expect(sanitizeForFilesystem('Episode 42 - The Answer')).toBe('Episode 42 - The Answer');
  });
});

describe('parseDate', () => {
  it('should parse YYYY-MM-DD format correctly', () => {
    const date = parseDate('2014-04-25');
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2014);
    expect(date!.getMonth()).toBe(3); // April (0-indexed)
    expect(date!.getDate()).toBe(25);
  });

  it('should parse single-digit months and days', () => {
    const date = parseDate('2024-01-05');
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2024);
    expect(date!.getMonth()).toBe(0); // January
    expect(date!.getDate()).toBe(5);
  });

  it('should handle RFC 2822 date format', () => {
    const date = parseDate('Fri, 25 Apr 2014 09:00:00 +0000');
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2014);
  });

  it('should return null for invalid dates', () => {
    expect(parseDate('not-a-date')).toBeNull();
    // Note: JavaScript Date is very lenient and parses many unexpected formats
    // Testing with formats that consistently fail
    expect(parseDate('')).toBeNull();
    expect(parseDate('   ')).toBeNull();
  });

  it('should handle timezone correctly for YYYY-MM-DD format', () => {
    // YYYY-MM-DD should be parsed as local time, not UTC
    const date = parseDate('2014-04-25');
    expect(date).not.toBeNull();
    expect(date!.getDate()).toBe(25);
  });
});

describe('isDateInRange', () => {
  const date = new Date(2024, 3, 15); // April 15, 2024

  it('should return true when date is within range', () => {
    const start = new Date(2024, 3, 1);
    const end = new Date(2024, 3, 30);
    expect(isDateInRange(date, start, end)).toBe(true);
  });

  it('should return true when date equals start date', () => {
    const start = new Date(2024, 3, 15);
    const end = new Date(2024, 3, 30);
    expect(isDateInRange(date, start, end)).toBe(true);
  });

  it('should return true when date equals end date', () => {
    const start = new Date(2024, 3, 1);
    const end = new Date(2024, 3, 15);
    expect(isDateInRange(date, start, end)).toBe(true);
  });

  it('should return false when date is before start', () => {
    const start = new Date(2024, 3, 20);
    const end = new Date(2024, 3, 30);
    expect(isDateInRange(date, start, end)).toBe(false);
  });

  it('should return false when date is after end', () => {
    const start = new Date(2024, 3, 1);
    const end = new Date(2024, 3, 10);
    expect(isDateInRange(date, start, end)).toBe(false);
  });

  it('should handle undefined start date', () => {
    const end = new Date(2024, 3, 30);
    expect(isDateInRange(date, undefined, end)).toBe(true);
  });

  it('should handle undefined end date', () => {
    const start = new Date(2024, 3, 1);
    expect(isDateInRange(date, start, undefined)).toBe(true);
  });

  it('should handle both dates undefined', () => {
    expect(isDateInRange(date, undefined, undefined)).toBe(true);
  });

  it('should ignore time component when comparing dates', () => {
    const dateWithTime = new Date(2024, 3, 15, 23, 59, 59);
    const start = new Date(2024, 3, 15, 0, 0, 0);
    const end = new Date(2024, 3, 15, 1, 0, 0);
    expect(isDateInRange(dateWithTime, start, end)).toBe(true);
  });
});

describe('getFileExtension', () => {
  it('should extract file extension from URL', () => {
    expect(getFileExtension('https://example.com/file.mp3')).toBe('mp3');
    expect(getFileExtension('https://example.com/file.m4a')).toBe('m4a');
  });

  it('should handle uppercase extensions', () => {
    expect(getFileExtension('https://example.com/file.MP3')).toBe('mp3');
  });

  it('should handle URLs with query parameters', () => {
    expect(getFileExtension('https://example.com/file.mp3?token=abc123')).toBe('mp3');
  });

  it('should default to mp3 for URLs without extension', () => {
    expect(getFileExtension('https://example.com/audio')).toBe('mp3');
  });

  it('should default to mp3 for invalid URLs', () => {
    expect(getFileExtension('not-a-url')).toBe('mp3');
  });

  it('should handle complex paths', () => {
    expect(getFileExtension('https://example.com/path/to/audio/file.m4a')).toBe('m4a');
  });
});

describe('formatBytes', () => {
  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 Bytes');
    expect(formatBytes(1023)).toBe('1023 Bytes');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(83968480)).toBe('80.08 MB');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
    expect(formatBytes(2147483648)).toBe('2 GB');
  });
});
