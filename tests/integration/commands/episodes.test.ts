/**
 * Integration tests for episodes command
 * Tests actual API integration with Podcast Index
 *
 * Strategy: Use search to find a reliable feed, then test episodes command
 * This approach is more resilient than hardcoding specific podcast URLs
 *
 * Note: These tests require valid API credentials to be set in .env
 * Run with: npm run test:integration
 */

import { PodcastIndexClient } from '../../../src/clients/podcast-index-client';
import { loadConfig } from '../../../src/config';
import { formatEpisodesList } from '../../../src/formatters/episodes-formatter';

describe('episodes command integration tests', () => {
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

  describe('fetching episodes by feed ID', () => {
    it('should fetch episodes using feed ID from search results', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getEpisodesByFeedId({
        id: testFeedId,
        max: 10,
        fulltext: true,
      });

      expect(response.items).toBeDefined();
      expect(Array.isArray(response.items)).toBe(true);
      expect(response.items!.length).toBeGreaterThan(0);
      expect(response.items!.length).toBeLessThanOrEqual(10);

      // Verify episode structure
      const episode = response.items![0];
      expect(episode.id).toBeDefined();
      expect(episode.title).toBeDefined();
      expect(episode.enclosureUrl).toBeDefined();
      expect(episode.datePublished).toBeDefined();
      expect(episode.feedId).toBeDefined();
    }, 10000);

    it('should fetch episodes with max results limit', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getEpisodesByFeedId({
        id: testFeedId,
        max: 5,
        fulltext: true,
      });

      expect(response.items).toBeDefined();
      expect(response.items!.length).toBeLessThanOrEqual(5);
    }, 10000);

    it('should fetch episodes sorted by newest first', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getEpisodesByFeedId({
        id: testFeedId,
        max: 10,
        fulltext: true,
      });

      expect(response.items).toBeDefined();
      expect(response.items!.length).toBeGreaterThan(1);

      // Check that episodes are sorted by date (newest first)
      for (let i = 0; i < response.items!.length - 1; i++) {
        expect(response.items![i].datePublished).toBeGreaterThanOrEqual(
          response.items![i + 1].datePublished
        );
      }
    }, 10000);
  });

  describe('fetching episodes by feed URL', () => {
    it('should fetch episodes using feed URL from search results', async () => {
      if (!testFeedUrl) {
        console.warn('Skipping test: No test feed URL available');
        return;
      }

      const response = await client.getEpisodesByFeedUrl({
        url: testFeedUrl,
        max: 10,
        fulltext: true,
      });

      expect(response.items).toBeDefined();
      expect(Array.isArray(response.items)).toBe(true);
      expect(response.items!.length).toBeGreaterThan(0);

      // Verify episode structure
      const episode = response.items![0];
      expect(episode.id).toBeDefined();
      expect(episode.title).toBeDefined();
      expect(episode.enclosureUrl).toBeDefined();
      expect(episode.datePublished).toBeDefined();
    }, 10000);
  });

  describe('date filtering with --since option', () => {
    it('should fetch episodes after a specific date', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      // Get episodes from the last 30 days
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

      const response = await client.getEpisodesByFeedId({
        id: testFeedId,
        max: 20,
        since: thirtyDaysAgo,
        fulltext: true,
      });

      expect(response.items).toBeDefined();

      // All episodes should be after the specified date
      response.items!.forEach((episode) => {
        expect(episode.datePublished).toBeGreaterThanOrEqual(thirtyDaysAgo);
      });
    }, 10000);

    it('should return empty results for future dates', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      // Date in the future
      const futureDate = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);

      const response = await client.getEpisodesByFeedId({
        id: testFeedId,
        max: 10,
        since: futureDate,
        fulltext: true,
      });

      expect(response.items).toBeDefined();
      expect(response.items!.length).toBe(0);
    }, 10000);
  });

  describe('episode data validation', () => {
    it('should return episodes with all required fields', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getEpisodesByFeedId({
        id: testFeedId,
        max: 5,
        fulltext: true,
      });

      expect(response.items).toBeDefined();
      expect(response.items!.length).toBeGreaterThan(0);

      response.items!.forEach((episode) => {
        // Required fields
        expect(episode.id).toBeDefined();
        expect(typeof episode.id).toBe('number');
        expect(episode.title).toBeDefined();
        expect(typeof episode.title).toBe('string');
        expect(episode.enclosureUrl).toBeDefined();
        expect(typeof episode.enclosureUrl).toBe('string');
        expect(episode.datePublished).toBeDefined();
        expect(typeof episode.datePublished).toBe('number');
        expect(episode.feedId).toBeDefined();
        expect(typeof episode.feedId).toBe('number');

        // Optional fields that should have correct types if present
        if (episode.duration !== undefined) {
          expect(typeof episode.duration).toBe('number');
        }
        if (episode.description) {
          expect(typeof episode.description).toBe('string');
        }
      });
    }, 10000);

    it('should return episodes with valid enclosure URLs', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getEpisodesByFeedId({
        id: testFeedId,
        max: 5,
        fulltext: true,
      });

      expect(response.items).toBeDefined();
      expect(response.items!.length).toBeGreaterThan(0);

      response.items!.forEach((episode) => {
        // Verify URL format
        expect(episode.enclosureUrl).toMatch(/^https?:\/\//);
      });
    }, 10000);
  });

  describe('formatting integration', () => {
    it('should format episodes list correctly', async () => {
      if (!testFeedId || !testPodcastTitle) {
        console.warn('Skipping test: No test feed data available');
        return;
      }

      const response = await client.getEpisodesByFeedId({
        id: testFeedId,
        max: 5,
        fulltext: true,
      });

      expect(response.items).toBeDefined();
      expect(response.items!.length).toBeGreaterThan(0);

      const formatted = formatEpisodesList(response.items!, testPodcastTitle, false);

      // Check formatting contains expected elements
      expect(formatted).toContain(`Recent episodes from "${testPodcastTitle}"`);
      expect(formatted).toContain('Published:');
      expect(formatted).toContain('Duration:');
      expect(formatted).toContain('URL:');
      expect(formatted).toContain('---');
      expect(formatted).toContain('Showing');
      expect(formatted).toContain('Download with:');
    }, 10000);

    it('should format episodes with full descriptions', async () => {
      if (!testFeedId || !testPodcastTitle) {
        console.warn('Skipping test: No test feed data available');
        return;
      }

      const response = await client.getEpisodesByFeedId({
        id: testFeedId,
        max: 3,
        fulltext: true,
      });

      expect(response.items).toBeDefined();
      expect(response.items!.length).toBeGreaterThan(0);

      const truncated = formatEpisodesList(response.items!, testPodcastTitle, false);
      const full = formatEpisodesList(response.items!, testPodcastTitle, true);

      // Full version should be longer or equal (if descriptions are short)
      expect(full.length).toBeGreaterThanOrEqual(truncated.length);
    }, 10000);
  });

  describe('error handling', () => {
    it('should handle non-existent feed ID gracefully', async () => {
      const nonExistentId = 999999999;

      // API returns empty results for non-existent feeds, not an error
      const response = await client.getEpisodesByFeedId({
        id: nonExistentId,
        max: 10,
        fulltext: true,
      });

      expect(response.items).toBeDefined();
      expect(response.items!.length).toBe(0);
    }, 10000);

    it('should handle invalid feed URL gracefully', async () => {
      const invalidUrl = 'https://example.com/nonexistent-feed.xml';

      // API throws an error for invalid URLs
      await expect(
        client.getEpisodesByFeedUrl({
          url: invalidUrl,
          max: 10,
          fulltext: true,
        })
      ).rejects.toThrow();
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
        invalidClient.getEpisodesByFeedId({
          id: testFeedId,
          max: 10,
          fulltext: true,
        })
      ).rejects.toThrow();
    }, 10000);
  });

  describe('real world scenarios', () => {
    it('should handle podcasts with many episodes', async () => {
      // Search for a podcast likely to have many episodes
      const searchResponse = await client.searchByTitle({
        q: 'daily news',
        max: 5,
      });

      expect(searchResponse.feeds).toBeDefined();
      expect(searchResponse.feeds!.length).toBeGreaterThan(0);

      const feed = searchResponse.feeds!.find(
        (f) => f.episodeCount && f.episodeCount > 100
      );

      if (feed) {
        const response = await client.getEpisodesByFeedId({
          id: feed.id,
          max: 50,
          fulltext: true,
        });

        expect(response.items).toBeDefined();
        expect(response.items!.length).toBeGreaterThan(0);
        expect(response.items!.length).toBeLessThanOrEqual(50);
      }
    }, 15000);

    it('should handle podcasts with few episodes', async () => {
      // Search for potentially newer or limited-series podcasts
      const searchResponse = await client.searchByTerm({
        q: 'limited series',
        max: 10,
      });

      expect(searchResponse.feeds).toBeDefined();

      if (searchResponse.feeds && searchResponse.feeds.length > 0) {
        const feed = searchResponse.feeds[0];
        const response = await client.getEpisodesByFeedId({
          id: feed.id,
          max: 20,
          fulltext: true,
        });

        expect(response.items).toBeDefined();
        // Should return episodes even if fewer than max
        expect(Array.isArray(response.items)).toBe(true);
      }
    }, 15000);

    it('should handle episodes with special characters in titles', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getEpisodesByFeedId({
        id: testFeedId,
        max: 10,
        fulltext: true,
      });

      expect(response.items).toBeDefined();
      expect(response.items!.length).toBeGreaterThan(0);

      // Just verify we can process titles with various characters
      response.items!.forEach((episode) => {
        expect(episode.title).toBeDefined();
        expect(episode.title.length).toBeGreaterThan(0);
      });
    }, 10000);

    it('should handle episodes with HTML in descriptions', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getEpisodesByFeedId({
        id: testFeedId,
        max: 10,
        fulltext: true,
      });

      expect(response.items).toBeDefined();

      // Find an episode with HTML in description
      const episodeWithHtml = response.items!.find(
        (ep) => ep.description && (ep.description.includes('<') || ep.description.includes('&'))
      );

      if (episodeWithHtml) {
        const formatted = formatEpisodesList(
          [episodeWithHtml],
          testPodcastTitle || 'Test Podcast',
          false
        );

        // Formatted output should not contain HTML tags
        expect(formatted).not.toContain('<p>');
        expect(formatted).not.toContain('<strong>');
        expect(formatted).not.toContain('<br>');
      }
    }, 10000);
  });

  describe('performance and limits', () => {
    it('should handle maximum episode limit (100)', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const response = await client.getEpisodesByFeedId({
        id: testFeedId,
        max: 100,
        fulltext: true,
      });

      expect(response.items).toBeDefined();
      expect(response.items!.length).toBeLessThanOrEqual(100);
    }, 15000);

    it('should complete requests within reasonable time', async () => {
      if (!testFeedId) {
        console.warn('Skipping test: No test feed ID available');
        return;
      }

      const startTime = Date.now();

      await client.getEpisodesByFeedId({
        id: testFeedId,
        max: 20,
        fulltext: true,
      });

      const duration = Date.now() - startTime;

      // Should complete within 5 seconds (per NFR-1)
      expect(duration).toBeLessThan(5000);
    }, 10000);
  });

  describe('combined search and episodes workflow', () => {
    it('should support full discovery workflow: search -> episodes', async () => {
      // Step 1: Search for a podcast
      const searchResponse = await client.searchByTitle({
        q: 'technology',
        max: 5,
      });

      expect(searchResponse.feeds).toBeDefined();
      expect(searchResponse.feeds!.length).toBeGreaterThan(0);

      // Step 2: Get the first result's feed ID
      const selectedFeed = searchResponse.feeds![0];
      expect(selectedFeed.id).toBeDefined();

      // Step 3: Fetch episodes from that feed
      const episodesResponse = await client.getEpisodesByFeedId({
        id: selectedFeed.id,
        max: 10,
        fulltext: true,
      });

      expect(episodesResponse.items).toBeDefined();
      expect(episodesResponse.items!.length).toBeGreaterThan(0);

      // Step 4: Verify episodes belong to the selected podcast
      episodesResponse.items!.forEach((episode) => {
        expect(episode.feedId).toBe(selectedFeed.id);
      });
    }, 15000);

    it('should support search by URL workflow', async () => {
      // Step 1: Search for a podcast
      const searchResponse = await client.searchByTitle({
        q: 'news',
        max: 3,
      });

      expect(searchResponse.feeds).toBeDefined();
      expect(searchResponse.feeds!.length).toBeGreaterThan(0);

      // Step 2: Get the first result's feed URL
      const selectedFeed = searchResponse.feeds![0];
      expect(selectedFeed.url).toBeDefined();

      // Step 3: Fetch episodes using the feed URL
      const episodesResponse = await client.getEpisodesByFeedUrl({
        url: selectedFeed.url,
        max: 10,
        fulltext: true,
      });

      expect(episodesResponse.items).toBeDefined();
      expect(episodesResponse.items!.length).toBeGreaterThan(0);

      // Verify episodes have the expected feed URL structure
      episodesResponse.items!.forEach((episode) => {
        expect(episode.feedId).toBeDefined();
      });
    }, 15000);
  });
});
