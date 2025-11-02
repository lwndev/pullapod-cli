/**
 * Environment configuration management
 * Handles loading and validating environment variables
 *
 * Supports loading from .env files using dotenv.
 * Call loadEnvFile() before accessing configuration if using .env files.
 */

import { config as dotenvConfig } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Load environment variables from .env file
 * This is optional - environment variables can also be set directly
 *
 * @param path Optional path to .env file (defaults to .env in current directory)
 * @returns true if .env file was loaded, false if not found
 */
export function loadEnvFile(path?: string): boolean {
  const envPath = path || resolve(process.cwd(), '.env');

  if (!existsSync(envPath)) {
    return false;
  }

  const result = dotenvConfig({ path: envPath });

  if (result.error) {
    throw new ConfigurationError(`Failed to load .env file: ${result.error.message}`);
  }

  return true;
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
