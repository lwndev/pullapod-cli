/**
 * Tests for favorites storage module
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getFavoritesPath,
  loadFavorites,
  saveFavorites,
  addFavorite,
  findFavoriteMatches,
  removeFavorite,
  clearFavorites,
  listFavorites,
  getFavoritesCount,
  resetFavorites,
  FavoriteFeed,
  FavoritesData,
} from '../../../src/storage/favorites';

describe('favorites storage', () => {
  let testDir: string;
  let testFilePath: string;

  const mockFeed1: FavoriteFeed = {
    name: 'JavaScript Jabber',
    url: 'https://feeds.fireside.fm/javascriptjabber/rss',
    feedId: 920666,
    dateAdded: '2024-01-10T12:00:00Z',
  };

  const mockFeed2: FavoriteFeed = {
    name: 'Syntax FM',
    url: 'https://feed.syntax.fm/rss',
    feedId: 123456,
    dateAdded: '2024-01-09T12:00:00Z',
  };

  const mockFeed3: FavoriteFeed = {
    name: 'ShopTalk Show',
    url: 'https://shoptalkshow.com/feed/podcast',
    feedId: 789012,
    dateAdded: '2024-01-08T12:00:00Z',
  };

  beforeEach(() => {
    // Create a temporary directory for test files
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pullapod-test-'));
    testFilePath = path.join(testDir, 'favorites.json');
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('getFavoritesPath', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use XDG_CONFIG_HOME when set', () => {
      process.env = { ...originalEnv, XDG_CONFIG_HOME: '/custom/config' };
      const result = getFavoritesPath();
      expect(result).toBe('/custom/config/pullapod/favorites.json');
    });

    it('should return a path containing pullapod and favorites.json', () => {
      process.env = { ...originalEnv };
      delete process.env.XDG_CONFIG_HOME;
      const result = getFavoritesPath();
      expect(result).toContain('pullapod');
      expect(result).toContain('favorites.json');
    });
  });

  describe('loadFavorites', () => {
    it('should return empty favorites when file does not exist', () => {
      const result = loadFavorites(testFilePath);
      expect(result).toEqual({
        version: 1,
        feeds: [],
      });
    });

    it('should load valid favorites file', () => {
      const data: FavoritesData = {
        version: 1,
        feeds: [mockFeed1],
      };
      fs.writeFileSync(testFilePath, JSON.stringify(data));

      const result = loadFavorites(testFilePath);
      expect(result).toEqual(data);
    });

    it('should throw error for invalid JSON', () => {
      fs.writeFileSync(testFilePath, 'not valid json');

      expect(() => loadFavorites(testFilePath)).toThrow('Invalid JSON format');
    });

    it('should throw error for corrupted structure', () => {
      fs.writeFileSync(testFilePath, JSON.stringify({ invalid: 'structure' }));

      expect(() => loadFavorites(testFilePath)).toThrow('file structure is invalid');
    });

    it('should throw error for missing required fields in feed', () => {
      const data = {
        version: 1,
        feeds: [{ name: 'Test' }], // Missing url, feedId, dateAdded
      };
      fs.writeFileSync(testFilePath, JSON.stringify(data));

      expect(() => loadFavorites(testFilePath)).toThrow('file structure is invalid');
    });
  });

  describe('saveFavorites', () => {
    it('should create directory and save file', () => {
      const nestedPath = path.join(testDir, 'nested', 'dir', 'favorites.json');
      const data: FavoritesData = {
        version: 1,
        feeds: [mockFeed1],
      };

      saveFavorites(data, nestedPath);

      expect(fs.existsSync(nestedPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(nestedPath, 'utf-8'));
      expect(content).toEqual(data);
    });

    it('should format JSON with 2-space indentation', () => {
      const data: FavoritesData = {
        version: 1,
        feeds: [mockFeed1],
      };

      saveFavorites(data, testFilePath);

      const content = fs.readFileSync(testFilePath, 'utf-8');
      expect(content).toContain('  '); // 2-space indentation
    });

    it('should overwrite existing file', () => {
      const data1: FavoritesData = { version: 1, feeds: [mockFeed1] };
      const data2: FavoritesData = { version: 1, feeds: [mockFeed2] };

      saveFavorites(data1, testFilePath);
      saveFavorites(data2, testFilePath);

      const content = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'));
      expect(content.feeds[0].name).toBe('Syntax FM');
    });
  });

  describe('addFavorite', () => {
    it('should add new feed to empty favorites', () => {
      const result = addFavorite(mockFeed1, testFilePath);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Feed added to favorites');

      const data = loadFavorites(testFilePath);
      expect(data.feeds).toHaveLength(1);
      expect(data.feeds[0]).toEqual(mockFeed1);
    });

    it('should add new feed to existing favorites', () => {
      saveFavorites({ version: 1, feeds: [mockFeed1] }, testFilePath);

      const result = addFavorite(mockFeed2, testFilePath);

      expect(result.success).toBe(true);

      const data = loadFavorites(testFilePath);
      expect(data.feeds).toHaveLength(2);
    });

    it('should prevent duplicate by URL', () => {
      saveFavorites({ version: 1, feeds: [mockFeed1] }, testFilePath);

      const duplicate = { ...mockFeed2, url: mockFeed1.url };
      const result = addFavorite(duplicate, testFilePath);

      expect(result.success).toBe(false);
      expect(result.message).toContain('URL already exists');
      expect(result.existingFeed).toEqual(mockFeed1);
    });

    it('should prevent duplicate by feed ID', () => {
      saveFavorites({ version: 1, feeds: [mockFeed1] }, testFilePath);

      const duplicate = { ...mockFeed2, feedId: mockFeed1.feedId };
      const result = addFavorite(duplicate, testFilePath);

      expect(result.success).toBe(false);
      expect(result.message).toContain('same feed ID');
      expect(result.existingFeed).toEqual(mockFeed1);
    });

    it('should handle case-insensitive URL comparison', () => {
      saveFavorites({ version: 1, feeds: [mockFeed1] }, testFilePath);

      const duplicate = {
        ...mockFeed2,
        url: mockFeed1.url.toUpperCase(),
      };
      const result = addFavorite(duplicate, testFilePath);

      expect(result.success).toBe(false);
    });
  });

  describe('findFavoriteMatches', () => {
    beforeEach(() => {
      saveFavorites({ version: 1, feeds: [mockFeed1, mockFeed2, mockFeed3] }, testFilePath);
    });

    it('should find exact URL match', () => {
      const matches = findFavoriteMatches(mockFeed1.url, testFilePath);
      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual(mockFeed1);
    });

    it('should find exact name match (case-insensitive)', () => {
      const matches = findFavoriteMatches('javascript jabber', testFilePath);
      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual(mockFeed1);
    });

    it('should find partial name matches', () => {
      const matches = findFavoriteMatches('show', testFilePath);
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe('ShopTalk Show');
    });

    it('should return empty array when no matches', () => {
      const matches = findFavoriteMatches('nonexistent', testFilePath);
      expect(matches).toHaveLength(0);
    });

    it('should prefer exact name match over partial matches', () => {
      const matches = findFavoriteMatches('Syntax FM', testFilePath);
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe('Syntax FM');
    });
  });

  describe('removeFavorite', () => {
    beforeEach(() => {
      saveFavorites({ version: 1, feeds: [mockFeed1, mockFeed2] }, testFilePath);
    });

    it('should remove feed by feedId', () => {
      const result = removeFavorite(mockFeed1, testFilePath);

      expect(result.success).toBe(true);
      expect(result.remainingCount).toBe(1);

      const data = loadFavorites(testFilePath);
      expect(data.feeds).toHaveLength(1);
      expect(data.feeds[0].feedId).toBe(mockFeed2.feedId);
    });

    it('should return false if feed not found', () => {
      const result = removeFavorite(mockFeed3, testFilePath);

      expect(result.success).toBe(false);
      expect(result.remainingCount).toBe(2);
    });
  });

  describe('clearFavorites', () => {
    it('should clear all favorites', () => {
      saveFavorites({ version: 1, feeds: [mockFeed1, mockFeed2, mockFeed3] }, testFilePath);

      const result = clearFavorites(testFilePath);

      expect(result.removedCount).toBe(3);

      const data = loadFavorites(testFilePath);
      expect(data.feeds).toHaveLength(0);
    });

    it('should return 0 for empty favorites', () => {
      saveFavorites({ version: 1, feeds: [] }, testFilePath);

      const result = clearFavorites(testFilePath);

      expect(result.removedCount).toBe(0);
    });
  });

  describe('listFavorites', () => {
    it('should return favorites sorted by date (newest first)', () => {
      saveFavorites({ version: 1, feeds: [mockFeed3, mockFeed1, mockFeed2] }, testFilePath);

      const result = listFavorites(testFilePath);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('JavaScript Jabber'); // Jan 10
      expect(result[1].name).toBe('Syntax FM'); // Jan 9
      expect(result[2].name).toBe('ShopTalk Show'); // Jan 8
    });

    it('should return empty array for empty favorites', () => {
      const result = listFavorites(testFilePath);
      expect(result).toHaveLength(0);
    });
  });

  describe('getFavoritesCount', () => {
    it('should return correct count', () => {
      saveFavorites({ version: 1, feeds: [mockFeed1, mockFeed2] }, testFilePath);

      const count = getFavoritesCount(testFilePath);
      expect(count).toBe(2);
    });

    it('should return 0 for empty favorites', () => {
      const count = getFavoritesCount(testFilePath);
      expect(count).toBe(0);
    });
  });

  describe('resetFavorites', () => {
    it('should reset favorites to empty', () => {
      saveFavorites({ version: 1, feeds: [mockFeed1, mockFeed2] }, testFilePath);

      resetFavorites(testFilePath);

      const data = loadFavorites(testFilePath);
      expect(data.feeds).toHaveLength(0);
      expect(data.version).toBe(1);
    });
  });
});
