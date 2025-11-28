/**
 * Integration tests for info command
 * Tests actual API integration with Podcast Index
 *
 * Strategy: Use search to find a reliable feed, then test info command
 * This approach is more resilient than hardcoding specific podcast URLs
 *
 * Note: These tests require valid API credentials to be set in .env
 * Run with: npm run test:integration
 */

import { PodcastIndexClient } from '../../../src/clients/podcast-index-client';
import { loadConfig } from '../../../src/config';
import {
  formatPodcastInfo,
  determineFeedStatus,
  formatRelativeTime,
  formatCategories,
} from '../../../src/formatters/info-formatter';
import { formatLanguage } from '../../../src/utils/language';

describe('info command integration tests', () => {
  let client: PodcastIndexClient;
  let config: any;
  let testFeedId: number | null = null;
  let testFeedUrl: string | null = null;
  let testPodcastTitle: string | null = null;

  beforeAll(async () => {
    config = loadConfig();
    client = new PodcastIndexClient({
      apiKey: config.podcastIndex.apiKey,
      apiSecret: config.podcastIndex.apiSecret,
    });

    // Search for a popular, stable podcast to use for testing
    // Using "NPR" as it's a well-established organization with stable feeds
    const searchResponse = await client.searchByTitle({
      q: 'NPR',
      max: 5,
    });

    if (searchResponse.feeds && searchResponse.feeds.length > 0) {
      // Find a feed with a reasonable number of episodes
      const feed = searchResponse.feeds.find(
        (f) => f.episodeCount && f.episodeCount > 10
      ) || searchResponse.feeds[0];

      testFeedId = feed.id;
      testFeedUrl = feed.url;
      testPodcastTitle = feed.title;
    }
  }, 15000);

  describe('fetching podcast info by feed ID', () => {
    it('should fetch podcast info using feed ID from search results', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getPodcastById(testFeedId);

      expect(response.feed).toBeDefined();

      const feed = response.feed!;
      expect(feed.id).toBe(testFeedId);
      expect(feed.title).toBeDefined();
      expect(feed.url).toBeDefined();
    }, 10000);

    it('should return all required feed fields', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getPodcastById(testFeedId);
      const feed = response.feed!;

      // Required fields
      expect(feed.id).toBeDefined();
      expect(typeof feed.id).toBe('number');
      expect(feed.title).toBeDefined();
      expect(typeof feed.title).toBe('string');
      expect(feed.url).toBeDefined();
      expect(typeof feed.url).toBe('string');

      // Status-related fields
      expect(typeof feed.dead).toBe('number');
      expect(feed.lastUpdateTime).toBeDefined();
      expect(typeof feed.lastUpdateTime).toBe('number');
    }, 10000);
  });

  describe('fetching podcast info by feed URL', () => {
    it('should fetch podcast info using feed URL from search results', async () => {
      if (!testFeedUrl) {
        console.warn('Skipping test: No test feed URL available');
        return;
      }

      const response = await client.getPodcastByUrl(testFeedUrl);

      expect(response.feed).toBeDefined();

      const feed = response.feed!;
      expect(feed.url).toBeDefined();
      expect(feed.title).toBeDefined();
    }, 10000);

    it('should return consistent data between ID and URL queries', async () => {
      if (!testFeedId || !testFeedUrl) {
        console.warn('Skipping test: No test feed data available');
        return;
      }

      const [byIdResponse, byUrlResponse] = await Promise.all([
        client.getPodcastById(testFeedId),
        client.getPodcastByUrl(testFeedUrl),
      ]);

      expect(byIdResponse.feed).toBeDefined();
      expect(byUrlResponse.feed).toBeDefined();

      // Core fields should match
      expect(byIdResponse.feed!.id).toBe(byUrlResponse.feed!.id);
      expect(byIdResponse.feed!.title).toBe(byUrlResponse.feed!.title);
    }, 15000);
  });

  describe('feed status determination', () => {
    it('should correctly determine active feed status', async () => {
      // Search for a recently active podcast
      const searchResponse = await client.searchByTitle({
        q: 'daily news',
        max: 10,
      });

      expect(searchResponse.feeds).toBeDefined();

      // Find a feed that's likely active (has recent updates)
      const activeFeed = searchResponse.feeds!.find((f) => {
        const now = Math.floor(Date.now() / 1000);
        const ninetyDaysAgo = now - (90 * 24 * 60 * 60);
        return f.lastUpdateTime && f.lastUpdateTime > ninetyDaysAgo && f.dead === 0;
      });

      if (activeFeed) {
        const response = await client.getPodcastById(activeFeed.id);
        const feed = response.feed!;

        const status = determineFeedStatus(feed);
        expect(['active', 'inactive']).toContain(status);

        // Active feeds should have dead = 0
        expect(feed.dead).toBe(0);
      }
    }, 15000);

    it('should handle feeds with varying activity levels', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getPodcastById(testFeedId);
      const feed = response.feed!;

      const status = determineFeedStatus(feed);

      // Status should be one of the valid values
      expect(['active', 'inactive', 'dead']).toContain(status);

      // Verify status logic is consistent
      if (feed.dead === 1) {
        expect(status).toBe('dead');
      } else if (status === 'active') {
        expect(feed.dead).toBe(0);
      }
    }, 10000);
  });

  describe('feed metadata validation', () => {
    it('should return episodes count', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getPodcastById(testFeedId);
      const feed = response.feed!;

      // Episode count may or may not be present
      if (feed.episodeCount !== undefined) {
        expect(typeof feed.episodeCount).toBe('number');
        expect(feed.episodeCount).toBeGreaterThanOrEqual(0);
      }
    }, 10000);

    it('should return language code', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getPodcastById(testFeedId);
      const feed = response.feed!;

      if (feed.language) {
        expect(typeof feed.language).toBe('string');
        // Language code should be non-empty
        expect(feed.language.length).toBeGreaterThan(0);

        // Verify formatLanguage handles it
        const formatted = formatLanguage(feed.language);
        expect(formatted).toBeDefined();
        expect(formatted.length).toBeGreaterThan(0);
      }
    }, 10000);

    it('should return categories', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getPodcastById(testFeedId);
      const feed = response.feed!;

      // Categories may be empty but should be an object
      expect(typeof feed.categories).toBe('object');

      const formattedCategories = formatCategories(feed.categories);
      expect(Array.isArray(formattedCategories)).toBe(true);
      expect(formattedCategories.length).toBeGreaterThan(0);
    }, 10000);

    it('should return author or owner name', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getPodcastById(testFeedId);
      const feed = response.feed!;

      // At least one of author or ownerName should be present for most feeds
      const hasAuthor = feed.author || feed.ownerName;
      if (hasAuthor) {
        expect(typeof (feed.author || feed.ownerName)).toBe('string');
      }
    }, 10000);

    it('should return artwork URL', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getPodcastById(testFeedId);
      const feed = response.feed!;

      // Most feeds have artwork
      const artworkUrl = feed.artwork || feed.image;
      if (artworkUrl) {
        expect(typeof artworkUrl).toBe('string');
        expect(artworkUrl).toMatch(/^https?:\/\//);
      }
    }, 10000);
  });

  describe('formatting integration', () => {
    it('should format podcast info correctly', async () => {
      if (!testFeedId || !testPodcastTitle) {
        console.warn('Skipping test: No test feed data available');
        return;
      }

      const response = await client.getPodcastById(testFeedId);
      const feed = response.feed!;

      const formatted = formatPodcastInfo(feed);

      // Check formatting contains expected sections
      expect(formatted).toContain('Podcast Information:');
      expect(formatted).toContain('Title:');
      expect(formatted).toContain('Feed ID:');
      expect(formatted).toContain('Feed URL:');
      expect(formatted).toContain('Status:');
      expect(formatted).toContain('Description:');
      expect(formatted).toContain('Categories:');
      expect(formatted).toContain('Download episodes:');
      expect(formatted).toContain('Preview episodes:');

      // Verify the actual podcast title appears in the formatted output
      expect(formatted).toContain(testPodcastTitle);
    }, 10000);

    it('should format last update time with relative date', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getPodcastById(testFeedId);
      const feed = response.feed!;

      if (feed.lastUpdateTime) {
        const relativeTime = formatRelativeTime(feed.lastUpdateTime);
        expect(relativeTime).toBeDefined();
        // Should contain time reference
        expect(relativeTime).toMatch(/ago|just now|in the future|unknown/);
      }
    }, 10000);

    it('should handle feeds with HTML in descriptions', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getPodcastById(testFeedId);
      const feed = response.feed!;

      const formatted = formatPodcastInfo(feed);

      // Formatted output should not contain common HTML tags
      expect(formatted).not.toContain('<p>');
      expect(formatted).not.toContain('</p>');
      expect(formatted).not.toContain('<br>');
      expect(formatted).not.toContain('<a href');
    }, 10000);
  });

  describe('error handling', () => {
    it('should handle non-existent feed ID gracefully', async () => {
      const nonExistentId = 999999999;

      const response = await client.getPodcastById(nonExistentId);

      // API may return empty or undefined feed
      // The important thing is it doesn't throw
      expect(response).toBeDefined();
    }, 10000);

    it('should handle invalid feed URL gracefully', async () => {
      const invalidUrl = 'https://example.com/nonexistent-feed.xml';

      // API may throw or return empty result for invalid URLs
      try {
        const response = await client.getPodcastByUrl(invalidUrl);
        // If it doesn't throw, feed should be undefined/empty
        expect(response.feed).toBeUndefined();
      } catch (error) {
        // Expected behavior - invalid URLs may throw
        expect(error).toBeDefined();
      }
    }, 10000);

    it('should handle invalid API credentials', async () => {
      const invalidClient = new PodcastIndexClient({
        apiKey: 'invalid-key',
        apiSecret: 'invalid-secret',
      });

      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      await expect(
        invalidClient.getPodcastById(testFeedId)
      ).rejects.toThrow();
    }, 10000);
  });

  describe('real world scenarios', () => {
    it('should handle popular podcasts', async () => {
      const queries = ['The Daily', 'Serial', 'Radiolab'];

      for (const query of queries) {
        const searchResponse = await client.searchByTitle({
          q: query,
          max: 1,
        });

        if (searchResponse.feeds && searchResponse.feeds.length > 0) {
          const feedId = searchResponse.feeds[0].id;
          const response = await client.getPodcastById(feedId);

          expect(response.feed).toBeDefined();
          expect(response.feed!.title).toBeDefined();

          // Should be able to format without errors
          const formatted = formatPodcastInfo(response.feed!);
          expect(formatted.length).toBeGreaterThan(0);
        }
      }
    }, 30000);

    it('should handle podcasts with varying amounts of metadata', async () => {
      // Search for different types of podcasts
      const searchResponse = await client.searchByTerm({
        q: 'indie podcast',
        max: 5,
      });

      expect(searchResponse.feeds).toBeDefined();

      if (searchResponse.feeds && searchResponse.feeds.length > 0) {
        for (const searchFeed of searchResponse.feeds.slice(0, 3)) {
          const response = await client.getPodcastById(searchFeed.id);

          if (response.feed) {
            // Should format without errors regardless of missing fields
            const formatted = formatPodcastInfo(response.feed);
            expect(formatted).toContain('Podcast Information:');
            expect(formatted).toContain('Title:');
          }
        }
      }
    }, 20000);

    it('should handle podcasts with special characters', async () => {
      const searchResponse = await client.searchByTerm({
        q: 'español',
        max: 3,
      });

      if (searchResponse.feeds && searchResponse.feeds.length > 0) {
        const response = await client.getPodcastById(searchResponse.feeds[0].id);

        if (response.feed) {
          const formatted = formatPodcastInfo(response.feed);
          expect(formatted.length).toBeGreaterThan(0);
        }
      }
    }, 15000);

    it('should handle podcasts in different languages', async () => {
      // Search for non-English podcast
      const searchResponse = await client.searchByTerm({
        q: 'noticias',
        max: 5,
      });

      if (searchResponse.feeds && searchResponse.feeds.length > 0) {
        const nonEnglishFeed = searchResponse.feeds.find(
          (f) => f.language && f.language !== 'en'
        );

        if (nonEnglishFeed) {
          const response = await client.getPodcastById(nonEnglishFeed.id);

          if (response.feed) {
            const formatted = formatPodcastInfo(response.feed);
            expect(formatted).toContain('Language:');

            // Language should be formatted
            const langFormatted = formatLanguage(response.feed.language);
            expect(langFormatted.length).toBeGreaterThan(0);
          }
        }
      }
    }, 15000);
  });

  describe('performance and limits', () => {
    it('should complete info requests within reasonable time', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const startTime = Date.now();

      await client.getPodcastById(testFeedId);

      const duration = Date.now() - startTime;

      // Should complete within 5 seconds (per NFR-1)
      expect(duration).toBeLessThan(5000);
    }, 10000);

    it('should handle multiple concurrent info requests', async () => {
      // Search for multiple podcasts
      const searchResponse = await client.searchByTerm({
        q: 'technology',
        max: 5,
      });

      if (searchResponse.feeds && searchResponse.feeds.length >= 3) {
        const feedIds = searchResponse.feeds.slice(0, 3).map((f) => f.id);

        const promises = feedIds.map((id) => client.getPodcastById(id));
        const results = await Promise.all(promises);

        expect(results).toHaveLength(3);
        results.forEach((result) => {
          expect(result.feed).toBeDefined();
        });
      }
    }, 15000);
  });

  describe('combined search and info workflow', () => {
    it('should support full discovery workflow: search -> info -> episodes', async () => {
      // Step 1: Search for a podcast
      const searchResponse = await client.searchByTitle({
        q: 'technology',
        max: 5,
      });

      expect(searchResponse.feeds).toBeDefined();
      expect(searchResponse.feeds!.length).toBeGreaterThan(0);

      // Step 2: Get info for the first result
      const selectedFeed = searchResponse.feeds![0];
      const infoResponse = await client.getPodcastById(selectedFeed.id);

      expect(infoResponse.feed).toBeDefined();
      expect(infoResponse.feed!.id).toBe(selectedFeed.id);

      // Step 3: Format the info
      const formatted = formatPodcastInfo(infoResponse.feed!);
      expect(formatted).toContain(selectedFeed.title);

      // Step 4: Could then fetch episodes (verified in episodes tests)
    }, 15000);

    it('should provide consistent data between search preview and full info', async () => {
      // Search provides preview data
      const searchResponse = await client.searchByTitle({
        q: 'podcast',
        max: 3,
      });

      if (searchResponse.feeds && searchResponse.feeds.length > 0) {
        const searchFeed = searchResponse.feeds[0];

        // Full info query
        const infoResponse = await client.getPodcastById(searchFeed.id);

        if (infoResponse.feed) {
          // Core fields should match
          expect(infoResponse.feed.id).toBe(searchFeed.id);
          expect(infoResponse.feed.title).toBe(searchFeed.title);
          expect(infoResponse.feed.url).toBe(searchFeed.url);
        }
      }
    }, 15000);
  });

  describe('iTunes ID support', () => {
    it('should return iTunes ID when available', async () => {
      // Search for a well-known podcast likely to have iTunes ID
      const searchResponse = await client.searchByTitle({
        q: 'NPR',
        max: 5,
      });

      if (searchResponse.feeds && searchResponse.feeds.length > 0) {
        const feedWithItunes = searchResponse.feeds.find((f) => f.itunesId);

        if (feedWithItunes) {
          const response = await client.getPodcastById(feedWithItunes.id);

          expect(response.feed).toBeDefined();
          expect(response.feed!.itunesId).toBeDefined();
          expect(typeof response.feed!.itunesId).toBe('number');

          // Formatted output should include iTunes ID
          const formatted = formatPodcastInfo(response.feed!);
          expect(formatted).toContain('iTunes ID:');
        }
      }
    }, 15000);
  });
});
