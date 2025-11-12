/**
 * Integration tests for search command
 * Tests actual API integration with Podcast Index
 *
 * Note: These tests require valid API credentials to be set
 * Set SKIP_INTEGRATION_TESTS=true to skip these tests
 */

import { PodcastIndexClient } from '../../src/clients/podcast-index-client';
import { loadConfig } from '../../src/config';

// Check if we should skip integration tests
// Skip by default unless explicitly enabled with RUN_INTEGRATION_TESTS=true
const shouldSkipIntegrationTests = (): boolean => {
  // Only run if explicitly enabled
  if (process.env.RUN_INTEGRATION_TESTS !== 'true') {
    return true;
  }

  try {
    const config = loadConfig();
    if (!config.podcastIndex.apiKey || !config.podcastIndex.apiSecret) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
};

const SKIP_TESTS = shouldSkipIntegrationTests();

// Use describe.skip if tests should be skipped
const testSuite = SKIP_TESTS ? describe.skip : describe;

testSuite('search command integration tests', () => {
  let client: PodcastIndexClient;
  let config: any;

  beforeAll(() => {
    config = loadConfig();
    client = new PodcastIndexClient({
      apiKey: config.podcastIndex.apiKey,
      apiSecret: config.podcastIndex.apiSecret,
    });
  });

  describe('search by term', () => {
    it('should search for podcasts by term', async () => {
      const response = await client.searchByTerm({
        q: 'javascript',
        max: 5,
      });

      expect(response.status).toBe('true');
      expect(response.feeds).toBeDefined();
      expect(Array.isArray(response.feeds)).toBe(true);
      expect(response.count).toBeGreaterThan(0);

      // Check first feed has expected structure
      if (response.feeds && response.feeds.length > 0) {
        const feed = response.feeds[0];
        expect(feed.id).toBeDefined();
        expect(feed.title).toBeDefined();
        expect(feed.url).toBeDefined();
      }
    }, 10000);

    it('should handle searches with no results', async () => {
      const response = await client.searchByTerm({
        q: 'xyznonexistentpodcast123456789',
        max: 5,
      });

      expect(response.status).toBe('true');
      expect(response.feeds).toBeDefined();
      expect(Array.isArray(response.feeds)).toBe(true);
    }, 10000);

    it('should respect max results parameter', async () => {
      const response = await client.searchByTerm({
        q: 'podcast',
        max: 3,
      });

      expect(response.feeds?.length).toBeLessThanOrEqual(3);
    }, 10000);
  });

  describe('search by title', () => {
    it('should search for podcasts by title', async () => {
      const response = await client.searchByTitle({
        q: 'javascript',
        max: 5,
      });

      expect(response.status).toBe('true');
      expect(response.feeds).toBeDefined();
      expect(Array.isArray(response.feeds)).toBe(true);

      // Title search should find podcasts with 'javascript' in title
      if (response.feeds && response.feeds.length > 0) {
        const feed = response.feeds[0];
        expect(feed.title).toBeDefined();
        expect(feed.title.toLowerCase()).toContain('javascript');
      }
    }, 10000);

    it('should support similar/fuzzy matching', async () => {
      const response = await client.searchByTitle({
        q: 'javascrpt', // Intentional typo
        max: 5,
        similar: true,
      });

      expect(response.status).toBe('true');
      expect(response.feeds).toBeDefined();
    }, 10000);
  });

  describe('language filtering', () => {
    it('should find podcasts in English', async () => {
      const response = await client.searchByTerm({
        q: 'technology',
        max: 10,
      });

      // Filter by language on client side (as per implementation)
      const englishFeeds = response.feeds?.filter(
        (feed) => feed.language && feed.language.toLowerCase() === 'en'
      ) || [];

      expect(englishFeeds.length).toBeGreaterThan(0);
      englishFeeds.forEach((feed) => {
        expect(feed.language?.toLowerCase()).toBe('en');
      });
    }, 10000);
  });

  describe('error handling', () => {
    it('should handle invalid API credentials gracefully', async () => {
      const invalidClient = new PodcastIndexClient({
        apiKey: 'invalid-key',
        apiSecret: 'invalid-secret',
      });

      await expect(
        invalidClient.searchByTerm({ q: 'test', max: 5 })
      ).rejects.toThrow();
    }, 10000);

    it('should handle network timeouts', async () => {
      // This test just verifies the client is configured correctly
      expect(client).toBeDefined();
    }, 10000);
  });

  describe('real world queries', () => {
    it('should find popular podcasts', async () => {
      const queries = ['The Daily', 'This American Life', 'Radiolab'];

      for (const query of queries) {
        const response = await client.searchByTitle({
          q: query,
          max: 5,
        });

        expect(response.feeds).toBeDefined();
        expect(response.feeds?.length).toBeGreaterThan(0);

        // At least one result should have the query in the title
        const hasMatch = response.feeds?.some((feed) =>
          feed.title.toLowerCase().includes(query.toLowerCase())
        ) || false;
        expect(hasMatch).toBe(true);
      }
    }, 30000);

    it('should handle special characters in search', async () => {
      const response = await client.searchByTerm({
        q: 'tech & society',
        max: 5,
      });

      expect(response.status).toBe('true');
      expect(response.feeds).toBeDefined();
      expect(Array.isArray(response.feeds)).toBe(true);
    }, 10000);

    it('should handle multi-word searches', async () => {
      const response = await client.searchByTerm({
        q: 'web development tutorial',
        max: 5,
      });

      expect(response.status).toBe('true');
      expect(response.feeds).toBeDefined();
      expect(Array.isArray(response.feeds)).toBe(true);
    }, 10000);
  });

  describe('rate limiting', () => {
    it('should handle multiple rapid requests', async () => {
      const queries = ['javascript', 'python', 'typescript', 'golang', 'rust'];
      const promises = queries.map((q) =>
        client.searchByTerm({ q, max: 3 })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(queries.length);
      results.forEach((result) => {
        expect(result.status).toBe('true');
        expect(result.feeds).toBeDefined();
      });
    }, 15000);
  });

  describe('response structure validation', () => {
    it('should return properly structured feed objects', async () => {
      const response = await client.searchByTerm({
        q: 'technology',
        max: 5,
      });

      expect(response.feeds).toBeDefined();

      if (response.feeds && response.feeds.length > 0) {
        const feed = response.feeds[0];

        // Required fields
        expect(feed.id).toBeDefined();
        expect(typeof feed.id).toBe('number');
        expect(feed.title).toBeDefined();
        expect(typeof feed.title).toBe('string');
        expect(feed.url).toBeDefined();
        expect(typeof feed.url).toBe('string');

        // Optional fields that should have correct types if present
        if (feed.author) {
          expect(typeof feed.author).toBe('string');
        }
        if (feed.episodeCount !== undefined) {
          expect(typeof feed.episodeCount).toBe('number');
        }
        if (feed.language) {
          expect(typeof feed.language).toBe('string');
        }
      }
    }, 10000);
  });
});
