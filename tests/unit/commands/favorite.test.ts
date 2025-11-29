/**
 * Tests for favorite command
 */

import { addCommand, listCommand, removeCommand, clearCommand } from '../../../src/commands/favorite';
import { PodcastIndexClient } from '../../../src/clients/podcast-index-client';
import { loadConfig } from '../../../src/config';
import { FavoriteFeed } from '../../../src/storage/favorites';

// Mock dependencies
jest.mock('../../../src/clients/podcast-index-client');
jest.mock('../../../src/config');

// Mock readline for confirmation prompts
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: jest.fn((prompt, callback) => {
      callback('y');
    }),
    close: jest.fn(),
  })),
}));

// Mock the storage module
const mockFavorites: { feeds: FavoriteFeed[] } = { feeds: [] };

jest.mock('../../../src/storage/favorites', () => ({
  loadFavorites: jest.fn(() => ({ version: 1, feeds: mockFavorites.feeds })),
  saveFavorites: jest.fn((data) => { mockFavorites.feeds = data.feeds; }),
  addFavorite: jest.fn((feed) => {
    const exists = mockFavorites.feeds.some(f => f.feedId === feed.feedId || f.url === feed.url);
    if (exists) {
      const existing = mockFavorites.feeds.find(f => f.feedId === feed.feedId || f.url === feed.url);
      return { success: false, message: 'Feed already exists', existingFeed: existing };
    }
    mockFavorites.feeds.push(feed);
    return { success: true, message: 'Feed added' };
  }),
  findFavoriteMatches: jest.fn((query) => {
    return mockFavorites.feeds.filter(f =>
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      f.url.toLowerCase() === query.toLowerCase()
    );
  }),
  removeFavorite: jest.fn((feed) => {
    const initialLength = mockFavorites.feeds.length;
    mockFavorites.feeds = mockFavorites.feeds.filter(f => f.feedId !== feed.feedId);
    return { success: initialLength > mockFavorites.feeds.length, remainingCount: mockFavorites.feeds.length };
  }),
  clearFavorites: jest.fn(() => {
    const count = mockFavorites.feeds.length;
    mockFavorites.feeds = [];
    return { removedCount: count };
  }),
  listFavorites: jest.fn(() => [...mockFavorites.feeds]),
  getFavoritesCount: jest.fn(() => mockFavorites.feeds.length),
  getFavoritesPath: jest.fn(() => '/tmp/test-favorites.json'),
}));

describe('favorite command', () => {
  let mockClient: jest.Mocked<PodcastIndexClient>;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  const mockFeed = {
    id: 920666,
    title: 'JavaScript Jabber',
    url: 'https://feeds.fireside.fm/javascriptjabber/rss',
    originalUrl: 'https://feeds.fireside.fm/javascriptjabber/rss',
    link: 'https://javascriptjabber.com',
    description: 'Weekly panel discussion about JavaScript',
    author: 'Devchat.tv',
    ownerName: 'Devchat.tv',
    image: 'https://cdn.fireside.fm/images/podcasts/artwork.jpg',
    artwork: 'https://cdn.fireside.fm/images/podcasts/artwork.jpg',
    lastUpdateTime: 1705276800,
    lastCrawlTime: 1705276800,
    lastParseTime: 1705276800,
    lastGoodHttpStatusTime: 1705276800,
    lastHttpStatus: 200,
    contentType: 'application/rss+xml',
    language: 'en',
    type: 0,
    dead: 0,
    crawlErrors: 0,
    parseErrors: 0,
    categories: { '1': 'Technology' },
    locked: 0,
    explicit: false,
  };

  const mockFavorite: FavoriteFeed = {
    name: 'JavaScript Jabber',
    url: 'https://feeds.fireside.fm/javascriptjabber/rss',
    feedId: 920666,
    dateAdded: '2024-01-10T12:00:00Z',
  };

  beforeEach(() => {
    // Reset mock favorites
    mockFavorites.feeds = [];

    // Setup mocks
    mockClient = {
      getPodcastByUrl: jest.fn(),
    } as any;

    (PodcastIndexClient as jest.MockedClass<typeof PodcastIndexClient>).mockImplementation(
      () => mockClient
    );

    (loadConfig as jest.Mock).mockReturnValue({
      podcastIndex: {
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      },
    });

    // Spy on console methods
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('add subcommand', () => {
    it('should add feed to favorites', async () => {
      mockClient.getPodcastByUrl.mockResolvedValue({
        status: 'true',
        feed: mockFeed,
      });

      await expect(
        addCommand('https://feeds.fireside.fm/javascriptjabber/rss', {})
      ).rejects.toThrow('process.exit called');

      expect(mockClient.getPodcastByUrl).toHaveBeenCalledWith(
        'https://feeds.fireside.fm/javascriptjabber/rss'
      );
      const allLogCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(allLogCalls).toContain('Added');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should use custom name when provided', async () => {
      const customFeed = { ...mockFeed, id: 999999, url: 'https://example.com/custom.rss' };
      mockClient.getPodcastByUrl.mockResolvedValue({
        status: 'true',
        feed: customFeed,
      });

      await expect(
        addCommand('https://example.com/custom.rss', { name: 'My Custom Name' })
      ).rejects.toThrow('process.exit called');

      const allLogCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(allLogCalls).toContain('My Custom Name');
    });

    it('should reject invalid URL format', async () => {
      await expect(
        addCommand('not-a-valid-url', {})
      ).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Invalid feed URL format');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle feed not found', async () => {
      mockClient.getPodcastByUrl.mockResolvedValue({
        status: 'true',
        feed: undefined,
      });

      await expect(
        addCommand('https://example.com/notfound.xml', {})
      ).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Feed not found in Podcast Index');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should reject duplicate feed', async () => {
      // Add feed to mock favorites first
      mockFavorites.feeds.push(mockFavorite);

      mockClient.getPodcastByUrl.mockResolvedValue({
        status: 'true',
        feed: mockFeed,
      });

      await expect(
        addCommand('https://feeds.fireside.fm/javascriptjabber/rss', {})
      ).rejects.toThrow('process.exit called');

      const allErrorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(allErrorCalls).toContain('already exists');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle missing API credentials', async () => {
      (loadConfig as jest.Mock).mockReturnValue({
        podcastIndex: {
          apiKey: '',
          apiSecret: '',
        },
      });

      await expect(
        addCommand('https://feeds.fireside.fm/javascriptjabber/rss', {})
      ).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: Podcast Index API credentials not configured.'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('list subcommand', () => {
    it('should list favorites', async () => {
      mockFavorites.feeds.push(mockFavorite);

      await expect(listCommand()).rejects.toThrow('process.exit called');

      const allLogCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(allLogCalls).toContain('JavaScript Jabber');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should handle empty favorites', async () => {
      // Ensure mock favorites is empty
      mockFavorites.feeds = [];

      await expect(listCommand()).rejects.toThrow('process.exit called');

      const allLogCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(allLogCalls).toContain('No saved podcasts');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('remove subcommand', () => {
    beforeEach(() => {
      mockFavorites.feeds.push({ ...mockFavorite });
    });

    it('should remove feed by name', async () => {
      await expect(removeCommand('JavaScript Jabber')).rejects.toThrow('process.exit called');

      const allLogCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(allLogCalls).toContain('Removed');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should handle no matches', async () => {
      await expect(removeCommand('nonexistent')).rejects.toThrow('process.exit called');

      const allErrorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(allErrorCalls).toContain('No favorite found');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('clear subcommand', () => {
    beforeEach(() => {
      mockFavorites.feeds.push({ ...mockFavorite });
    });

    it('should clear all favorites with force flag', async () => {
      await expect(clearCommand({ force: true })).rejects.toThrow('process.exit called');

      const allLogCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(allLogCalls).toContain('Removed');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should handle empty favorites', async () => {
      mockFavorites.feeds = [];

      await expect(clearCommand({ force: true })).rejects.toThrow('process.exit called');

      const allLogCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(allLogCalls).toContain('already empty');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });
});
