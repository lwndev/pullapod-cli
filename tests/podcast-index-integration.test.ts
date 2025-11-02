/**
 * Integration tests for Podcast Index API Client
 * These tests make real API calls using credentials from .env
 *
 * IMPORTANT: These tests only perform READ operations - no modifications
 *
 * To run: npm test -- podcast-index-integration.test.ts
 */

import fetchMock from 'jest-fetch-mock';
import nock from 'nock';
import { PodcastIndexClient } from '../src/clients/podcast-index-client';
import { loadEnvFile, loadPodcastIndexConfig, ConfigurationError } from '../src/config/env-config';

// IMPORTANT: Disable fetch mocking for integration tests
// We want to make REAL HTTP calls to the API
fetchMock.dontMock();

// Allow network connections to Podcast Index API
nock.enableNetConnect('api.podcastindex.org');

// Load .env file before tests
loadEnvFile();

// Skip these tests if API credentials are not configured
const hasCredentials = process.env.PODCAST_INDEX_API_KEY && process.env.PODCAST_INDEX_API_SECRET;

// Use describe.skip if credentials aren't available
const describeIntegration = hasCredentials ? describe : describe.skip;

describeIntegration('Podcast Index API - Integration Tests', () => {
  let client: PodcastIndexClient;

  beforeAll(() => {
    try {
      const config = loadPodcastIndexConfig();
      client = new PodcastIndexClient(config);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        console.warn('Skipping integration tests: API credentials not configured');
        console.warn('Set PODCAST_INDEX_API_KEY and PODCAST_INDEX_API_SECRET in .env to run these tests');
      }
      throw error;
    }
  });

  describe('Search Operations (Read-Only)', () => {
    it('should search podcasts by term', async () => {
      const result = await client.searchByTerm({
        q: 'javascript',
        max: 5,
      });

      expect(result.status).toBe('true');
      expect(result.feeds).toBeDefined();
      expect(Array.isArray(result.feeds)).toBe(true);
      expect(result.count).toBeGreaterThan(0);

      if (result.feeds && result.feeds.length > 0) {
        const podcast = result.feeds[0];
        expect(podcast.id).toBeDefined();
        expect(podcast.title).toBeDefined();
        expect(podcast.url).toBeDefined();
      }
    }, 10000); // 10 second timeout for API call

    it('should search podcasts by title', async () => {
      const result = await client.searchByTitle({
        q: 'syntax',
        max: 3,
      });

      expect(result.status).toBe('true');
      expect(result.feeds).toBeDefined();
      expect(Array.isArray(result.feeds)).toBe(true);

      if (result.feeds && result.feeds.length > 0) {
        const podcast = result.feeds[0];
        expect(podcast.title).toBeDefined();
        expect(typeof podcast.title).toBe('string');
      }
    }, 10000);

    it('should handle search with no results gracefully', async () => {
      const result = await client.searchByTerm({
        q: 'xyzabc123nonexistentpodcast9999',
        max: 1,
      });

      expect(result.status).toBe('true');
      expect(result.feeds).toBeDefined();
      expect(result.count).toBe(0);
    }, 10000);
  });

  describe('Podcast Lookup Operations (Read-Only)', () => {
    it('should get podcast by known feed ID', async () => {
      // Using a well-known podcast ID (The Changelog)
      const feedId = 23;

      const result = await client.getPodcastById(feedId);

      expect(result.status).toBe('true');
      expect(result.feed).toBeDefined();
      expect(result.feed?.id).toBe(feedId);
      expect(result.feed?.title).toBeDefined();
      expect(result.feed?.url).toBeDefined();
      expect(result.feed?.description).toBeDefined();
    }, 10000);

    it('should get podcast by feed URL', async () => {
      // Using a well-known podcast feed URL
      const feedUrl = 'https://changelog.com/podcast/feed';

      const result = await client.getPodcastByUrl(feedUrl);

      expect(result.status).toBe('true');
      expect(result.feed).toBeDefined();
      expect(result.feed?.url).toContain('changelog.com');
    }, 10000);

    it('should handle non-existent podcast ID gracefully', async () => {
      const result = await client.getPodcastById(999999999);

      // API should return successfully but with no feed (or empty array)
      expect(result.status).toBe('true');
      // API may return undefined or empty array for non-existent podcast
      if (result.feed !== undefined) {
        expect(Array.isArray(result.feed) ? result.feed.length : 0).toBe(0);
      }
    }, 10000);
  });

  describe('Episode Operations (Read-Only)', () => {
    it('should get episodes by feed ID', async () => {
      // Using a known active podcast
      const feedId = 23; // The Changelog

      const result = await client.getEpisodesByFeedId({
        id: feedId,
        max: 5,
      });

      expect(result.status).toBe('true');
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);

      if (result.items && result.items.length > 0) {
        const episode = result.items[0];
        expect(episode.id).toBeDefined();
        expect(episode.title).toBeDefined();
        expect(episode.enclosureUrl).toBeDefined();
        expect(episode.datePublished).toBeDefined();
        expect(episode.feedId).toBe(feedId);
      }
    }, 10000);

    it('should get episodes with since parameter', async () => {
      const feedId = 23;
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

      const result = await client.getEpisodesByFeedId({
        id: feedId,
        since: thirtyDaysAgo,
        max: 10,
      });

      expect(result.status).toBe('true');
      expect(result.items).toBeDefined();

      // All episodes should be newer than 30 days ago
      if (result.items && result.items.length > 0) {
        result.items.forEach(episode => {
          expect(episode.datePublished).toBeGreaterThanOrEqual(thirtyDaysAgo);
        });
      }
    }, 10000);

    it('should get random episodes', async () => {
      const result = await client.getRandomEpisodes(3);

      expect(result.status).toBe('true');
      expect(result.episodes).toBeDefined();
      expect(Array.isArray(result.episodes)).toBe(true);

      if (result.episodes && result.episodes.length > 0) {
        const episode = result.episodes[0];
        expect(episode.title).toBeDefined();
        expect(episode.feedTitle).toBeDefined();
      }
    }, 10000);
  });

  describe('Trending & Recent Operations (Read-Only)', () => {
    it('should get trending podcasts', async () => {
      const result = await client.getTrending({
        max: 5,
        lang: 'en',
      });

      expect(result.status).toBe('true');
      expect(result.feeds).toBeDefined();
      expect(Array.isArray(result.feeds)).toBe(true);
      expect(result.feeds!.length).toBeGreaterThan(0);

      const podcast = result.feeds![0];
      expect(podcast.id).toBeDefined();
      expect(podcast.title).toBeDefined();
    }, 10000);

    it('should get recent episodes', async () => {
      const result = await client.getRecentEpisodes({
        max: 10,
      });

      expect(result.status).toBe('true');
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.count).toBeGreaterThan(0);

      if (result.items && result.items.length > 0) {
        const episode = result.items[0];
        expect(episode.title).toBeDefined();
        expect(episode.feedTitle).toBeDefined();
        expect(episode.datePublished).toBeDefined();

        // Episodes should be recent (within last 7 days)
        const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
        expect(episode.datePublished).toBeGreaterThan(sevenDaysAgo);
      }
    }, 10000);

    it('should get recent feeds', async () => {
      const result = await client.getRecentFeeds({
        max: 5,
        lang: 'en',
      });

      expect(result.status).toBe('true');
      expect(result.feeds).toBeDefined();
      expect(Array.isArray(result.feeds)).toBe(true);

      if (result.feeds && result.feeds.length > 0) {
        const feed = result.feeds[0];
        expect(feed.id).toBeDefined();
        expect(feed.title).toBeDefined();
        expect(feed.url).toBeDefined();
      }
    }, 10000);
  });

  describe('Statistics & Categories (Read-Only)', () => {
    it('should get Podcast Index statistics', async () => {
      const stats = await client.getStats();

      expect(stats).toBeDefined();
      expect(stats.feedCountTotal).toBeGreaterThan(0);
      expect(stats.episodeCountTotal).toBeGreaterThan(0);
      expect(stats.feedsWithNewEpisodes3days).toBeGreaterThan(0);
      expect(stats.feedsWithNewEpisodes30days).toBeGreaterThan(0);

      // Sanity checks - these numbers should be reasonable
      expect(stats.feedCountTotal).toBeGreaterThan(1000000); // Over 1M podcasts
      expect(stats.episodeCountTotal).toBeGreaterThan(10000000); // Over 10M episodes
    }, 10000);

    it('should get categories list', async () => {
      const result = await client.getCategories();

      expect(result.feeds).toBeDefined();
      expect(Array.isArray(result.feeds)).toBe(true);
      expect(result.feeds.length).toBeGreaterThan(0);

      const category = result.feeds[0];
      expect(category.id).toBeDefined();
      expect(category.name).toBeDefined();
      expect(typeof category.name).toBe('string');

      // Check for some common categories
      const categoryNames = result.feeds.map(c => c.name.toLowerCase());
      expect(categoryNames).toContain('technology');
    }, 10000);
  });

  describe('Authentication & Error Handling', () => {
    it('should properly authenticate requests', async () => {
      // This test verifies that authentication headers are working
      // by making a successful API call
      const result = await client.searchByTerm({ q: 'test', max: 1 });

      expect(result.status).toBe('true');
      // If we get here without errors, authentication worked
    }, 10000);

    it('should handle API rate limiting gracefully', async () => {
      // Make multiple rapid requests to test rate limiting behavior
      const promises = Array(5).fill(null).map((_, i) =>
        client.searchByTerm({ q: `test${i}`, max: 1 })
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.status).toBe('true');
      });
    }, 15000);
  });

  describe('Data Validation', () => {
    it('should return properly formatted podcast data', async () => {
      const result = await client.searchByTerm({ q: 'programming', max: 1 });

      expect(result.feeds).toBeDefined();
      if (result.feeds && result.feeds.length > 0) {
        const podcast = result.feeds[0];

        // Required fields
        expect(typeof podcast.id).toBe('number');
        expect(typeof podcast.title).toBe('string');
        expect(typeof podcast.url).toBe('string');
        expect(podcast.url).toMatch(/^https?:\/\//);

        // URL should be a valid URL
        expect(() => new URL(podcast.url)).not.toThrow();
      }
    }, 10000);

    it('should return properly formatted episode data', async () => {
      const result = await client.getRecentEpisodes({ max: 1 });

      expect(result.items).toBeDefined();
      if (result.items && result.items.length > 0) {
        const episode = result.items[0];

        // Required fields
        expect(typeof episode.id).toBe('number');
        expect(typeof episode.title).toBe('string');
        expect(typeof episode.enclosureUrl).toBe('string');
        expect(typeof episode.datePublished).toBe('number');
        expect(typeof episode.feedId).toBe('number');

        // Date should be reasonable (not in future, not too old)
        const now = Math.floor(Date.now() / 1000);
        const oneYearAgo = now - (365 * 24 * 60 * 60);
        expect(episode.datePublished).toBeLessThanOrEqual(now);
        expect(episode.datePublished).toBeGreaterThan(oneYearAgo);

        // URL should be valid
        expect(episode.enclosureUrl).toMatch(/^https?:\/\//);
      }
    }, 10000);
  });

  describe('Query Parameters', () => {
    it('should respect max parameter', async () => {
      const maxResults = 3;
      const result = await client.searchByTerm({
        q: 'javascript',
        max: maxResults,
      });

      expect(result.feeds).toBeDefined();
      if (result.feeds) {
        expect(result.feeds.length).toBeLessThanOrEqual(maxResults);
      }
    }, 10000);

    it('should filter by language', async () => {
      const result = await client.getTrending({
        max: 5,
        lang: 'en',
      });

      expect(result.feeds).toBeDefined();
      if (result.feeds && result.feeds.length > 0) {
        result.feeds.forEach(feed => {
          // Language field should exist
          expect(feed.language).toBeDefined();
        });
      }
    }, 10000);

    it('should return full text when requested', async () => {
      const withoutFulltext = await client.searchByTerm({
        q: 'javascript',
        max: 1,
        fulltext: false,
      });

      const withFulltext = await client.searchByTerm({
        q: 'javascript',
        max: 1,
        fulltext: true,
      });

      if (withoutFulltext.feeds?.[0] && withFulltext.feeds?.[0]) {
        // Fulltext version should have longer description
        const shortDesc = withoutFulltext.feeds[0].description || '';
        const fullDesc = withFulltext.feeds[0].description || '';

        expect(fullDesc.length).toBeGreaterThanOrEqual(shortDesc.length);
      }
    }, 10000);
  });
});

// Show helpful message if credentials aren't configured
if (!hasCredentials) {
  console.log('\n⚠️  Integration tests skipped - API credentials not configured');
  console.log('To run integration tests:');
  console.log('  1. Copy .env.example to .env');
  console.log('  2. Add your Podcast Index API credentials');
  console.log('  3. Run: npm test -- podcast-index-integration.test.ts\n');
}
