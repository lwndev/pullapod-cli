/**
 * Environment configuration management
 * Handles loading and validating environment variables
 */

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Get required environment variable or throw error
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new ConfigurationError(
      `Missing required environment variable: ${key}`
    );
  }
  return value;
}

/**
 * Get optional environment variable with default value
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Check if environment variable exists
 */
export function hasEnv(key: string): boolean {
  return !!process.env[key];
}

/**
 * Podcast Index API configuration
 */
export interface PodcastIndexConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

/**
 * Load Podcast Index API configuration from environment
 */
export function loadPodcastIndexConfig(): PodcastIndexConfig {
  return {
    apiKey: getRequiredEnv('PODCAST_INDEX_API_KEY'),
    apiSecret: getRequiredEnv('PODCAST_INDEX_API_SECRET'),
    baseUrl: getOptionalEnv(
      'PODCAST_INDEX_BASE_URL',
      'https://api.podcastindex.org/api/1.0'
    ),
  };
}
