/**
 * Tests for environment configuration
 */

import {
  getRequiredEnv,
  getOptionalEnv,
  hasEnv,
  loadPodcastIndexConfig,
  ConfigurationError,
} from '../src/config/env-config';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getRequiredEnv', () => {
    it('should return environment variable value when set', () => {
      process.env.TEST_VAR = 'test-value';
      expect(getRequiredEnv('TEST_VAR')).toBe('test-value');
    });

    it('should throw ConfigurationError when variable is not set', () => {
      delete process.env.TEST_VAR;
      expect(() => getRequiredEnv('TEST_VAR')).toThrow(ConfigurationError);
      expect(() => getRequiredEnv('TEST_VAR')).toThrow(
        'Missing required environment variable: TEST_VAR'
      );
    });

    it('should throw ConfigurationError when variable is empty string', () => {
      process.env.TEST_VAR = '';
      expect(() => getRequiredEnv('TEST_VAR')).toThrow(ConfigurationError);
    });
  });

  describe('getOptionalEnv', () => {
    it('should return environment variable value when set', () => {
      process.env.TEST_VAR = 'test-value';
      expect(getOptionalEnv('TEST_VAR', 'default')).toBe('test-value');
    });

    it('should return default value when variable is not set', () => {
      delete process.env.TEST_VAR;
      expect(getOptionalEnv('TEST_VAR', 'default-value')).toBe(
        'default-value'
      );
    });

    it('should return default value when variable is empty string', () => {
      process.env.TEST_VAR = '';
      expect(getOptionalEnv('TEST_VAR', 'default-value')).toBe(
        'default-value'
      );
    });
  });

  describe('hasEnv', () => {
    it('should return true when variable is set', () => {
      process.env.TEST_VAR = 'value';
      expect(hasEnv('TEST_VAR')).toBe(true);
    });

    it('should return false when variable is not set', () => {
      delete process.env.TEST_VAR;
      expect(hasEnv('TEST_VAR')).toBe(false);
    });

    it('should return false when variable is empty string', () => {
      process.env.TEST_VAR = '';
      expect(hasEnv('TEST_VAR')).toBe(false);
    });
  });

  describe('loadPodcastIndexConfig', () => {
    it('should load configuration from environment variables', () => {
      process.env.PODCAST_INDEX_API_KEY = 'test-key';
      process.env.PODCAST_INDEX_API_SECRET = 'test-secret';
      process.env.PODCAST_INDEX_BASE_URL = 'https://custom.api.com';

      const config = loadPodcastIndexConfig();

      expect(config.apiKey).toBe('test-key');
      expect(config.apiSecret).toBe('test-secret');
      expect(config.baseUrl).toBe('https://custom.api.com');
    });

    it('should use default base URL when not set', () => {
      process.env.PODCAST_INDEX_API_KEY = 'test-key';
      process.env.PODCAST_INDEX_API_SECRET = 'test-secret';
      delete process.env.PODCAST_INDEX_BASE_URL;

      const config = loadPodcastIndexConfig();

      expect(config.baseUrl).toBe('https://api.podcastindex.org/api/1.0');
    });

    it('should throw ConfigurationError when API key is missing', () => {
      delete process.env.PODCAST_INDEX_API_KEY;
      process.env.PODCAST_INDEX_API_SECRET = 'test-secret';

      expect(() => loadPodcastIndexConfig()).toThrow(ConfigurationError);
      expect(() => loadPodcastIndexConfig()).toThrow(
        'Missing required environment variable: PODCAST_INDEX_API_KEY'
      );
    });

    it('should throw ConfigurationError when API secret is missing', () => {
      process.env.PODCAST_INDEX_API_KEY = 'test-key';
      delete process.env.PODCAST_INDEX_API_SECRET;

      expect(() => loadPodcastIndexConfig()).toThrow(ConfigurationError);
      expect(() => loadPodcastIndexConfig()).toThrow(
        'Missing required environment variable: PODCAST_INDEX_API_SECRET'
      );
    });

    it('should throw ConfigurationError when both key and secret are missing', () => {
      delete process.env.PODCAST_INDEX_API_KEY;
      delete process.env.PODCAST_INDEX_API_SECRET;

      expect(() => loadPodcastIndexConfig()).toThrow(ConfigurationError);
    });
  });
});
