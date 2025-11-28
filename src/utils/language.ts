/**
 * Language code utilities
 * Converts ISO 639-1 language codes to full language names
 */

/**
 * Map of ISO 639-1 language codes to full language names
 * Based on common languages used in podcasts
 */
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  ru: 'Russian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  pl: 'Polish',
  tr: 'Turkish',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish',
  cs: 'Czech',
  el: 'Greek',
  he: 'Hebrew',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
  ms: 'Malay',
  uk: 'Ukrainian',
  ro: 'Romanian',
  hu: 'Hungarian',
  sk: 'Slovak',
  bg: 'Bulgarian',
  hr: 'Croatian',
  sr: 'Serbian',
  sl: 'Slovenian',
  lt: 'Lithuanian',
  lv: 'Latvian',
  et: 'Estonian',
  ca: 'Catalan',
  eu: 'Basque',
  gl: 'Galician',
  af: 'Afrikaans',
  sw: 'Swahili',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  mr: 'Marathi',
  gu: 'Gujarati',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
  ur: 'Urdu',
  fa: 'Persian',
};

/**
 * Get full language name from ISO 639-1 code
 * @param code - Two-letter ISO 639-1 language code
 * @returns Full language name or the code itself if not found
 */
export function getLanguageName(code: string): string {
  if (!code) {
    return 'Unknown';
  }

  // Extract the base language code (handle codes like "en-US" or "en_US")
  const baseCode = code.toLowerCase().split(/[-_]/)[0];

  return LANGUAGE_NAMES[baseCode] || code;
}

/**
 * Format language code with full name
 * Example: "en" -> "English (en)"
 * @param code - Language code
 * @returns Formatted language string
 */
export function formatLanguage(code: string): string {
  if (!code) {
    return 'Unknown';
  }

  const name = getLanguageName(code);

  // If we have a proper name, format as "Name (code)"
  // Otherwise, just return the code
  if (name !== code) {
    return `${name} (${code.toLowerCase()})`;
  }

  return code;
}
