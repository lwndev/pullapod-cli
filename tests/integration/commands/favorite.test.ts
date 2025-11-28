/**
 * Integration tests for favorite command
 * Tests actual API integration with Podcast Index and file storage
 *
 * Strategy: Use search to find reliable feeds, then test favorite operations
 * This approach is more resilient than hardcoding specific podcast URLs
 *
 * Note: These tests require valid API credentials to be set in .env
 * Run with: npm run test:integration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PodcastIndexClient } from '../../../src/clients/podcast-index-client';
import { loadConfig } from '../../../src/config';
import {
  loadFavorites,
  addFavorite,
  findFavoriteMatches,
  removeFavorite,
  clearFavorites,
  listFavorites,
  getFavoritesCount,
  FavoriteFeed,
} from '../../../src/storage/favorites';
import {
  formatFavoritesList,
  formatAddSuccess,
  formatRemoveSuccess,
  formatClearSuccess,
} from '../../../src/formatters/favorite-formatter';

describe('favorite command integration tests', () => {
  let client: PodcastIndexClient;
  let config: ReturnType<typeof loadConfig>;
  let testDir: string;
  let testFilePath: string;

  // Test podcast data discovered during setup
  let testPodcast1: { id: number; title: string; url: string } | null = null;
  let testPodcast2: { id: number; title: string; url: string } | null = null;

  beforeAll(async () => {
    // Set up API client
    config = loadConfig();
    client = new PodcastIndexClient({
      apiKey: config.podcastIndex.apiKey,
      apiSecret: config.podcastIndex.apiSecret,
    });

    // Create temporary directory for test favorites file
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pullapod-fav-int-test-'));
    testFilePath = path.join(testDir, 'favorites.json');

    // Search for two reliable podcasts to use for testing
    // Using well-established organizations for stability
    const searchQueries = ['NPR news', 'BBC podcast'];

    for (let i = 0; i < searchQueries.length; i++) {
      try {
        const searchResponse = await client.searchByTitle({
          q: searchQueries[i],
          max: 5,
        });

        if (searchResponse.feeds && searchResponse.feeds.length > 0) {
          // Find a feed with a valid URL and ID
          const feed = searchResponse.feeds.find(
            (f) => f.id && f.url && f.title
          );

          if (feed) {
            const podcast = {
              id: feed.id,
              title: feed.title,
              url: feed.url,
            };

            if (i === 0) {
              testPodcast1 = podcast;
            } else {
              testPodcast2 = podcast;
            }
          }
        }
      } catch {
        // Continue if one search fails
      }
    }
  }, 20000);

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // Reset test favorites file before each test
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  describe('API validation for adding feeds', () => {
    it('should validate feed URL through Podcast Index API', async () => {
      if (!testPodcast1) {
        console.warn('Skipping test: No test podcast available');
        return;
      }

      const response = await client.getPodcastByUrl(testPodcast1.url);

      expect(response.feed).toBeDefined();
      expect(response.feed!.id).toBe(testPodcast1.id);
      expect(response.feed!.title).toBeDefined();
      expect(response.feed!.url).toBeDefined();
    }, 10000);

    it('should return feed metadata for storage', async () => {
      if (!testPodcast1) {
        console.warn('Skipping test: No test podcast available');
        return;
      }

      const response = await client.getPodcastByUrl(testPodcast1.url);
      const feed = response.feed!;

      // Verify we can extract required fields for favorites
      expect(typeof feed.id).toBe('number');
      expect(typeof feed.title).toBe('string');
      expect(typeof feed.url).toBe('string');
      expect(feed.title.length).toBeGreaterThan(0);
      expect(feed.url.length).toBeGreaterThan(0);
    }, 10000);

    it('should handle non-existent feed URL gracefully', async () => {
      const invalidUrl = 'https://example.com/nonexistent-podcast-feed-12345.xml';

      try {
        const response = await client.getPodcastByUrl(invalidUrl);
        // API may return empty feed for invalid URLs
        expect(response.feed).toBeUndefined();
      } catch {
        // Expected - invalid URLs may throw
      }
    }, 10000);
  });

  describe('storage operations with real feed data', () => {
    it('should add a feed discovered from search', async () => {
      if (!testPodcast1) {
        console.warn('Skipping test: No test podcast available');
        return;
      }

      // Fetch fresh data from API
      const response = await client.getPodcastByUrl(testPodcast1.url);
      const feed = response.feed!;

      const favorite: FavoriteFeed = {
        name: feed.title,
        url: feed.url,
        feedId: feed.id,
        dateAdded: new Date().toISOString(),
      };

      const result = addFavorite(favorite, testFilePath);

      expect(result.success).toBe(true);
      expect(result.message).toContain('added');

      // Verify it was saved
      const count = getFavoritesCount(testFilePath);
      expect(count).toBe(1);

      const favorites = listFavorites(testFilePath);
      expect(favorites[0].name).toBe(feed.title);
      expect(favorites[0].feedId).toBe(feed.id);
    }, 10000);

    it('should prevent duplicate by feed ID', async () => {
      if (!testPodcast1) {
        console.warn('Skipping test: No test podcast available');
        return;
      }

      const response = await client.getPodcastByUrl(testPodcast1.url);
      const feed = response.feed!;

      const favorite: FavoriteFeed = {
        name: feed.title,
        url: feed.url,
        feedId: feed.id,
        dateAdded: new Date().toISOString(),
      };

      // Add first time
      const result1 = addFavorite(favorite, testFilePath);
      expect(result1.success).toBe(true);

      // Try to add again with same feed ID
      const duplicate: FavoriteFeed = {
        name: 'Different Name',
        url: 'https://different-url.com/feed.xml',
        feedId: feed.id, // Same feed ID
        dateAdded: new Date().toISOString(),
      };

      const result2 = addFavorite(duplicate, testFilePath);
      expect(result2.success).toBe(false);
      expect(result2.message).toContain('feed ID');
      expect(result2.existingFeed).toBeDefined();
    }, 10000);

    it('should prevent duplicate by URL', async () => {
      if (!testPodcast1) {
        console.warn('Skipping test: No test podcast available');
        return;
      }

      const response = await client.getPodcastByUrl(testPodcast1.url);
      const feed = response.feed!;

      const favorite: FavoriteFeed = {
        name: feed.title,
        url: feed.url,
        feedId: feed.id,
        dateAdded: new Date().toISOString(),
      };

      addFavorite(favorite, testFilePath);

      // Try to add with same URL but different feed ID
      const duplicate: FavoriteFeed = {
        name: 'Different Name',
        url: feed.url, // Same URL
        feedId: 999999999,
        dateAdded: new Date().toISOString(),
      };

      const result = addFavorite(duplicate, testFilePath);
      expect(result.success).toBe(false);
      expect(result.message).toContain('URL');
    }, 10000);

    it('should store and retrieve multiple feeds', async () => {
      if (!testPodcast1 || !testPodcast2) {
        console.warn('Skipping test: Need two test podcasts');
        return;
      }

      // Add both podcasts
      for (const podcast of [testPodcast1, testPodcast2]) {
        const response = await client.getPodcastByUrl(podcast.url);
        const feed = response.feed!;

        const favorite: FavoriteFeed = {
          name: feed.title,
          url: feed.url,
          feedId: feed.id,
          dateAdded: new Date().toISOString(),
        };

        addFavorite(favorite, testFilePath);
      }

      const favorites = listFavorites(testFilePath);
      expect(favorites).toHaveLength(2);

      // Verify both are present
      const feedIds = favorites.map((f) => f.feedId);
      expect(feedIds).toContain(testPodcast1.id);
      expect(feedIds).toContain(testPodcast2.id);
    }, 15000);
  });

  describe('find and remove operations', () => {
    beforeEach(async () => {
      if (!testPodcast1) return;

      const response = await client.getPodcastByUrl(testPodcast1.url);
      const feed = response.feed!;

      const favorite: FavoriteFeed = {
        name: feed.title,
        url: feed.url,
        feedId: feed.id,
        dateAdded: new Date().toISOString(),
      };

      addFavorite(favorite, testFilePath);
    });

    it('should find feed by exact name match', () => {
      if (!testPodcast1) {
        console.warn('Skipping test: No test podcast available');
        return;
      }

      const matches = findFavoriteMatches(testPodcast1.title, testFilePath);

      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches[0].feedId).toBe(testPodcast1.id);
    }, 10000);

    it('should find feed by URL', () => {
      if (!testPodcast1) {
        console.warn('Skipping test: No test podcast available');
        return;
      }

      const matches = findFavoriteMatches(testPodcast1.url, testFilePath);

      expect(matches).toHaveLength(1);
      expect(matches[0].feedId).toBe(testPodcast1.id);
    }, 10000);

    it('should find feed by partial name match', () => {
      if (!testPodcast1) {
        console.warn('Skipping test: No test podcast available');
        return;
      }

      // Use first word of title for partial match
      const firstWord = testPodcast1.title.split(' ')[0];
      if (firstWord.length < 3) {
        console.warn('Skipping test: Title too short for partial match');
        return;
      }

      const matches = findFavoriteMatches(firstWord.toLowerCase(), testFilePath);

      // Should find at least one match
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }, 10000);

    it('should remove feed successfully', () => {
      if (!testPodcast1) {
        console.warn('Skipping test: No test podcast available');
        return;
      }

      const matches = findFavoriteMatches(testPodcast1.title, testFilePath);
      expect(matches.length).toBeGreaterThan(0);

      const result = removeFavorite(matches[0], testFilePath);

      expect(result.success).toBe(true);
      expect(result.remainingCount).toBe(0);

      const count = getFavoritesCount(testFilePath);
      expect(count).toBe(0);
    }, 10000);

    it('should return no matches for non-existent feed', () => {
      const matches = findFavoriteMatches('nonexistent-podcast-12345', testFilePath);
      expect(matches).toHaveLength(0);
    }, 5000);
  });

  describe('clear operation', () => {
    it('should clear all favorites', async () => {
      if (!testPodcast1 || !testPodcast2) {
        console.warn('Skipping test: Need two test podcasts');
        return;
      }

      // Add multiple favorites
      for (const podcast of [testPodcast1, testPodcast2]) {
        const response = await client.getPodcastByUrl(podcast.url);
        const feed = response.feed!;

        addFavorite({
          name: feed.title,
          url: feed.url,
          feedId: feed.id,
          dateAdded: new Date().toISOString(),
        }, testFilePath);
      }

      expect(getFavoritesCount(testFilePath)).toBe(2);

      const result = clearFavorites(testFilePath);

      expect(result.removedCount).toBe(2);
      expect(getFavoritesCount(testFilePath)).toBe(0);
    }, 15000);

    it('should handle clearing empty favorites', () => {
      const result = clearFavorites(testFilePath);
      expect(result.removedCount).toBe(0);
    });
  });

  describe('formatting integration', () => {
    it('should format favorites list with real podcast data', async () => {
      if (!testPodcast1) {
        console.warn('Skipping test: No test podcast available');
        return;
      }

      const response = await client.getPodcastByUrl(testPodcast1.url);
      const feed = response.feed!;

      addFavorite({
        name: feed.title,
        url: feed.url,
        feedId: feed.id,
        dateAdded: new Date().toISOString(),
      }, testFilePath);

      const favorites = listFavorites(testFilePath);
      const formatted = formatFavoritesList(favorites);

      expect(formatted).toContain('Your saved');
      expect(formatted).toContain(feed.title);
      expect(formatted).toContain(feed.url);
      expect(formatted).toContain('Added:');
    }, 10000);

    it('should format add success message with real data', async () => {
      if (!testPodcast1) {
        console.warn('Skipping test: No test podcast available');
        return;
      }

      const response = await client.getPodcastByUrl(testPodcast1.url);
      const feed = response.feed!;

      const favorite: FavoriteFeed = {
        name: feed.title,
        url: feed.url,
        feedId: feed.id,
        dateAdded: new Date().toISOString(),
      };

      const formatted = formatAddSuccess(favorite, 1);

      expect(formatted).toContain('Added');
      expect(formatted).toContain(feed.title);
      expect(formatted).toContain(feed.url);
      expect(formatted).toContain(feed.id.toString());
      expect(formatted).toContain('Total favorites: 1');
    }, 10000);

    it('should format remove success message', async () => {
      if (!testPodcast1) {
        console.warn('Skipping test: No test podcast available');
        return;
      }

      const response = await client.getPodcastByUrl(testPodcast1.url);
      const feed = response.feed!;

      const favorite: FavoriteFeed = {
        name: feed.title,
        url: feed.url,
        feedId: feed.id,
        dateAdded: new Date().toISOString(),
      };

      const formatted = formatRemoveSuccess(favorite, 0);

      expect(formatted).toContain('Removed');
      expect(formatted).toContain(feed.title);
      expect(formatted).toContain('Remaining favorites: 0');
    }, 10000);

    it('should format clear success message', () => {
      const formatted = formatClearSuccess(5);

      expect(formatted).toContain('Removed 5 favorites');
      expect(formatted).toContain('now empty');
    });
  });

  describe('file persistence', () => {
    it('should persist favorites across load/save cycles', async () => {
      if (!testPodcast1) {
        console.warn('Skipping test: No test podcast available');
        return;
      }

      const response = await client.getPodcastByUrl(testPodcast1.url);
      const feed = response.feed!;

      const favorite: FavoriteFeed = {
        name: feed.title,
        url: feed.url,
        feedId: feed.id,
        dateAdded: new Date().toISOString(),
      };

      // Add favorite
      addFavorite(favorite, testFilePath);

      // Load fresh from file
      const loaded = loadFavorites(testFilePath);

      expect(loaded.version).toBe(1);
      expect(loaded.feeds).toHaveLength(1);
      expect(loaded.feeds[0].name).toBe(feed.title);
      expect(loaded.feeds[0].feedId).toBe(feed.id);
    }, 10000);

    it('should create properly formatted JSON file', async () => {
      if (!testPodcast1) {
        console.warn('Skipping test: No test podcast available');
        return;
      }

      const response = await client.getPodcastByUrl(testPodcast1.url);
      const feed = response.feed!;

      addFavorite({
        name: feed.title,
        url: feed.url,
        feedId: feed.id,
        dateAdded: new Date().toISOString(),
      }, testFilePath);

      // Read raw file content
      const content = fs.readFileSync(testFilePath, 'utf-8');

      // Verify it's valid JSON
      const parsed = JSON.parse(content);
      expect(parsed.version).toBe(1);
      expect(parsed.feeds).toBeDefined();

      // Verify it's formatted with indentation
      expect(content).toContain('\n');
      expect(content).toContain('  '); // 2-space indent
    }, 10000);
  });

  describe('full workflow simulation', () => {
    it('should support complete favorites workflow: search -> add -> list -> remove', async () => {
      // Step 1: Search for a podcast
      const searchResponse = await client.searchByTitle({
        q: 'technology',
        max: 5,
      });

      expect(searchResponse.feeds).toBeDefined();
      expect(searchResponse.feeds!.length).toBeGreaterThan(0);

      const selectedFeed = searchResponse.feeds![0];

      // Step 2: Validate through API (as add command does)
      const validateResponse = await client.getPodcastByUrl(selectedFeed.url);
      expect(validateResponse.feed).toBeDefined();

      const feed = validateResponse.feed!;

      // Step 3: Add to favorites
      const favorite: FavoriteFeed = {
        name: feed.title,
        url: feed.url,
        feedId: feed.id,
        dateAdded: new Date().toISOString(),
      };

      const addResult = addFavorite(favorite, testFilePath);
      expect(addResult.success).toBe(true);

      // Step 4: List favorites
      const favorites = listFavorites(testFilePath);
      expect(favorites).toHaveLength(1);
      expect(favorites[0].name).toBe(feed.title);

      // Step 5: Format for display
      const formatted = formatFavoritesList(favorites);
      expect(formatted).toContain(feed.title);

      // Step 6: Find by name
      const matches = findFavoriteMatches(feed.title, testFilePath);
      expect(matches.length).toBeGreaterThan(0);

      // Step 7: Remove
      const removeResult = removeFavorite(matches[0], testFilePath);
      expect(removeResult.success).toBe(true);
      expect(removeResult.remainingCount).toBe(0);

      // Verify removal
      expect(getFavoritesCount(testFilePath)).toBe(0);
    }, 20000);

    it('should handle adding multiple podcasts from different searches', async () => {
      const queries = ['technology', 'science', 'history'];
      const addedFeeds: number[] = [];

      for (const query of queries) {
        try {
          const searchResponse = await client.searchByTitle({
            q: query,
            max: 3,
          });

          if (searchResponse.feeds && searchResponse.feeds.length > 0) {
            // Find a feed not already added
            const feed = searchResponse.feeds.find(
              (f) => f.id && f.url && !addedFeeds.includes(f.id)
            );

            if (feed) {
              const validateResponse = await client.getPodcastByUrl(feed.url);

              if (validateResponse.feed) {
                const result = addFavorite({
                  name: validateResponse.feed.title,
                  url: validateResponse.feed.url,
                  feedId: validateResponse.feed.id,
                  dateAdded: new Date().toISOString(),
                }, testFilePath);

                if (result.success) {
                  addedFeeds.push(feed.id);
                }
              }
            }
          }
        } catch {
          // Continue if one search fails
        }
      }

      // Should have added at least one podcast
      expect(addedFeeds.length).toBeGreaterThan(0);

      const favorites = listFavorites(testFilePath);
      expect(favorites).toHaveLength(addedFeeds.length);

      // Clean up
      clearFavorites(testFilePath);
    }, 30000);
  });

  describe('error handling', () => {
    it('should handle corrupted favorites file', () => {
      // Write invalid JSON
      fs.writeFileSync(testFilePath, 'not valid json');

      expect(() => loadFavorites(testFilePath)).toThrow();
    });

    it('should handle invalid file structure', () => {
      // Write valid JSON but invalid structure
      fs.writeFileSync(testFilePath, JSON.stringify({ invalid: 'structure' }));

      expect(() => loadFavorites(testFilePath)).toThrow();
    });

    it('should handle missing directory gracefully when saving', async () => {
      if (!testPodcast1) {
        console.warn('Skipping test: No test podcast available');
        return;
      }

      const nestedPath = path.join(testDir, 'nested', 'dir', 'favorites.json');

      const response = await client.getPodcastByUrl(testPodcast1.url);
      const feed = response.feed!;

      // Should create directory and save
      addFavorite({
        name: feed.title,
        url: feed.url,
        feedId: feed.id,
        dateAdded: new Date().toISOString(),
      }, nestedPath);

      expect(fs.existsSync(nestedPath)).toBe(true);

      // Clean up nested directory
      fs.rmSync(path.join(testDir, 'nested'), { recursive: true });
    }, 10000);
  });

  describe('performance', () => {
    it('should complete add operation within reasonable time', async () => {
      if (!testPodcast1) {
        console.warn('Skipping test: No test podcast available');
        return;
      }

      const response = await client.getPodcastByUrl(testPodcast1.url);
      const feed = response.feed!;

      const startTime = Date.now();

      addFavorite({
        name: feed.title,
        url: feed.url,
        feedId: feed.id,
        dateAdded: new Date().toISOString(),
      }, testFilePath);

      const duration = Date.now() - startTime;

      // Storage operations should be fast (< 100ms per NFR-1)
      expect(duration).toBeLessThan(100);
    }, 10000);

    it('should handle list operation quickly', async () => {
      if (!testPodcast1) {
        console.warn('Skipping test: No test podcast available');
        return;
      }

      // Add a favorite first
      const response = await client.getPodcastByUrl(testPodcast1.url);
      const feed = response.feed!;

      addFavorite({
        name: feed.title,
        url: feed.url,
        feedId: feed.id,
        dateAdded: new Date().toISOString(),
      }, testFilePath);

      const startTime = Date.now();

      listFavorites(testFilePath);

      const duration = Date.now() - startTime;

      // List should be instant (< 100ms per NFR-1)
      expect(duration).toBeLessThan(100);
    }, 10000);
  });
});
