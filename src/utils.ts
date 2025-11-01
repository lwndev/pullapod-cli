import sanitize from 'sanitize-filename';

/**
 * Sanitizes a string to be filesystem-safe
 */
export function sanitizeForFilesystem(name: string): string {
  // First sanitize using the library
  let sanitized = sanitize(name);

  // Additional cleanup: replace multiple spaces with single space
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Remove trailing periods (Windows compatibility)
  sanitized = sanitized.replace(/\.+$/, '');

  // If the result is empty, provide a fallback
  if (!sanitized) {
    sanitized = 'episode';
  }

  return sanitized;
}

/**
 * Parses a date string in various formats
 * For YYYY-MM-DD format, creates a date in local timezone (not UTC)
 */
export function parseDate(dateStr: string): Date | null {
  // Check for YYYY-MM-DD format
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1; // Month is 0-indexed
    const day = parseInt(isoMatch[3], 10);
    return new Date(year, month, day);
  }

  // Try parsing other formats
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Checks if a date falls within a range (inclusive)
 * Compares only the date portion (ignoring time)
 */
export function isDateInRange(date: Date, startDate?: Date, endDate?: Date): boolean {
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (startDate) {
    const startOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    if (dateOnly < startOnly) {
      return false;
    }
  }

  if (endDate) {
    const endOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    if (dateOnly > endOnly) {
      return false;
    }
  }

  return true;
}

/**
 * Extracts file extension from URL
 */
export function getFileExtension(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : 'mp3';
  } catch {
    return 'mp3';
  }
}

/**
 * Formats bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
