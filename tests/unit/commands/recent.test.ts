/**
 * Tests for recent command
 */

import { recentCommand } from '../../../src/commands/recent';
import { PodcastIndexClient } from '../../../src/clients/podcast-index-client';
import { loadConfig } from '../../../src/config';
import { FavoriteFeed } from '../../../src/storage/favorites';
import { PodcastEpisode } from '../../../src/clients/podcast-index-types';

// Mock dependencies
jest.mock('../../../src/clients/podcast-index-client');
jest.mock('../../../src/config');

// Mock the storage module
const mockFavorites: { feeds: FavoriteFeed[] } = { feeds: [] };

jest.mock('../../../src/storage/favorites', () => ({
  listFavorites: jest.fn(() => [...mockFavorites.feeds]),
  getFavoritesPath: jest.fn(() => '/tmp/test-favorites.json'),
}));

describe('recent command', () => {
  let mockClient: jest.Mocked<PodcastIndexClient>;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

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

  const mockEpisode1: PodcastEpisode = {
    id: 1001,
    title: 'JSJ 547: Modern React Patterns',
    link: 'https://example.com/ep1',
    description: 'Discussion about React',
    guid: 'guid-1',
    datePublished: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
    datePublishedPretty: 'Yesterday',
    dateCrawled: Math.floor(Date.now() / 1000),
    enclosureUrl: 'https://example.com/ep1.mp3',
    enclosureType: 'audio/mpeg',
    enclosureLength: 50000000,
    duration: 3600,
    explicit: 0,
    image: '',
    feedImage: '',
    feedId: 920666,
    feedTitle: 'JavaScript Jabber',
    feedLanguage: 'en',
  };

  const mockEpisode2: PodcastEpisode = {
    id: 2001,
    title: 'Syntax 700: CSS Container Queries',
    link: 'https://example.com/ep2',
    description: 'CSS discussion',
    guid: 'guid-2',
    datePublished: Math.floor(Date.now() / 1000) - 172800, // 2 days ago
    datePublishedPretty: '2 days ago',
    dateCrawled: Math.floor(Date.now() / 1000),
    enclosureUrl: 'https://example.com/ep2.mp3',
    enclosureType: 'audio/mpeg',
    enclosureLength: 30000000,
    duration: 1800,
    explicit: 0,
    image: '',
    feedImage: '',
    feedId: 123456,
    feedTitle: 'Syntax FM',
    feedLanguage: 'en',
  };

  beforeEach(() => {
    // Reset mock favorites
    mockFavorites.feeds = [];

    // Setup mocks
    mockClient = {
      getEpisodesByFeedId: jest.fn(),
    } as jest.Mocked<Pick<PodcastIndexClient, 'getEpisodesByFeedId'>> as jest.Mocked<PodcastIndexClient>;

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

  describe('no favorites', () => {
    it('should show error when no favorites exist', async () => {
      mockFavorites.feeds = [];

      await expect(recentCommand({})).rejects.toThrow('process.exit called');

      const allLogCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(allLogCalls).toContain('No saved podcasts found');
      expect(allLogCalls).toContain('pullapod favorite add');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('successful fetch', () => {
    beforeEach(() => {
      mockFavorites.feeds = [mockFeed1, mockFeed2];
    });

    it('should fetch and display recent episodes', async () => {
      mockClient.getEpisodesByFeedId
        .mockResolvedValueOnce({
          status: 'true',
          items: [mockEpisode1],
        })
        .mockResolvedValueOnce({
          status: 'true',
          items: [mockEpisode2],
        });

      await expect(recentCommand({})).rejects.toThrow('process.exit called');

      expect(mockClient.getEpisodesByFeedId).toHaveBeenCalledTimes(2);
      const allLogCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(allLogCalls).toContain('Recent episodes from your saved podcasts');
      expect(allLogCalls).toContain('JavaScript Jabber');
      expect(allLogCalls).toContain('Syntax FM');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should respect --max option', async () => {
      mockClient.getEpisodesByFeedId.mockResolvedValue({
        status: 'true',
        items: [mockEpisode1],
      });

      await expect(recentCommand({ max: '10' })).rejects.toThrow('process.exit called');

      expect(mockClient.getEpisodesByFeedId).toHaveBeenCalledWith(
        expect.objectContaining({ max: 10 })
      );
    });

    it('should respect --days option', async () => {
      mockClient.getEpisodesByFeedId.mockResolvedValue({
        status: 'true',
        items: [],
      });

      await expect(recentCommand({ days: '14' })).rejects.toThrow('process.exit called');

      // Calculate expected since timestamp (14 days ago)
      const expectedSince = Math.floor(Date.now() / 1000) - 14 * 86400;

      expect(mockClient.getEpisodesByFeedId).toHaveBeenCalledWith(
        expect.objectContaining({
          since: expect.any(Number),
        })
      );

      // Verify since is approximately 14 days ago (within a few seconds)
      const actualSince = mockClient.getEpisodesByFeedId.mock.calls[0][0].since as number;
      expect(actualSince).toBeDefined();
      expect(Math.abs(actualSince - expectedSince)).toBeLessThan(10);
    });
  });

  describe('--feed filter', () => {
    beforeEach(() => {
      mockFavorites.feeds = [mockFeed1, mockFeed2];
    });

    it('should filter by feed name (exact match)', async () => {
      mockClient.getEpisodesByFeedId.mockResolvedValue({
        status: 'true',
        items: [mockEpisode1],
      });

      await expect(recentCommand({ feed: 'JavaScript Jabber' })).rejects.toThrow('process.exit called');

      expect(mockClient.getEpisodesByFeedId).toHaveBeenCalledTimes(1);
      expect(mockClient.getEpisodesByFeedId).toHaveBeenCalledWith(
        expect.objectContaining({ id: 920666 })
      );
    });

    it('should filter by feed name (partial match)', async () => {
      mockClient.getEpisodesByFeedId.mockResolvedValue({
        status: 'true',
        items: [mockEpisode1],
      });

      await expect(recentCommand({ feed: 'javascript' })).rejects.toThrow('process.exit called');

      expect(mockClient.getEpisodesByFeedId).toHaveBeenCalledTimes(1);
      expect(mockClient.getEpisodesByFeedId).toHaveBeenCalledWith(
        expect.objectContaining({ id: 920666 })
      );
    });

    it('should show error when feed not found', async () => {
      await expect(recentCommand({ feed: 'nonexistent' })).rejects.toThrow('process.exit called');

      const allErrorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(allErrorCalls).toContain('No saved podcast matches');
      expect(allErrorCalls).toContain('JavaScript Jabber');
      expect(allErrorCalls).toContain('Syntax FM');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('option validation', () => {
    beforeEach(() => {
      mockFavorites.feeds = [mockFeed1];
    });

    it('should reject invalid --max value (non-numeric)', async () => {
      await expect(recentCommand({ max: 'abc' })).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: --max must be a number');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should reject --max value below range', async () => {
      await expect(recentCommand({ max: '0' })).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: --max must be between 1 and 20');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should reject --max value above range', async () => {
      await expect(recentCommand({ max: '100' })).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: --max must be between 1 and 20');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should reject invalid --days value', async () => {
      await expect(recentCommand({ days: 'abc' })).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: --days must be a number');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should reject --days value below range', async () => {
      await expect(recentCommand({ days: '0' })).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: --days must be between 1 and 90');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should reject --days value above range', async () => {
      await expect(recentCommand({ days: '100' })).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: --days must be between 1 and 90');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockFavorites.feeds = [mockFeed1, mockFeed2];
    });

    it('should handle partial failures gracefully', async () => {
      mockClient.getEpisodesByFeedId
        .mockResolvedValueOnce({
          status: 'true',
          items: [mockEpisode1],
        })
        .mockRejectedValueOnce(new Error('Network error'));

      await expect(recentCommand({})).rejects.toThrow('process.exit called');

      const allLogCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(allLogCalls).toContain('JavaScript Jabber');
      expect(allLogCalls).toContain('Warning');
      expect(allLogCalls).toContain('could not be fetched');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should show error when all feeds fail', async () => {
      mockClient.getEpisodesByFeedId.mockRejectedValue(new Error('Network error'));

      await expect(recentCommand({})).rejects.toThrow('process.exit called');

      const allErrorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(allErrorCalls).toContain('Could not fetch episodes from any feeds');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle missing API credentials', async () => {
      (loadConfig as jest.Mock).mockReturnValue({
        podcastIndex: {
          apiKey: '',
          apiSecret: '',
        },
      });

      await expect(recentCommand({})).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: Podcast Index API credentials not configured.'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('no new episodes', () => {
    beforeEach(() => {
      mockFavorites.feeds = [mockFeed1, mockFeed2];
    });

    it('should show helpful message when no new episodes', async () => {
      mockClient.getEpisodesByFeedId.mockResolvedValue({
        status: 'true',
        items: [],
      });

      await expect(recentCommand({})).rejects.toThrow('process.exit called');

      const allLogCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(allLogCalls).toContain('No new episodes from your saved podcasts');
      expect(allLogCalls).toContain('pullapod recent --days 30');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('progress indication', () => {
    let stdoutWriteSpy: jest.SpyInstance;

    beforeEach(() => {
      stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
    });

    afterEach(() => {
      stdoutWriteSpy.mockRestore();
    });

    it('should show progress when fetching more than 10 feeds', async () => {
      // Create 12 mock feeds (above PROGRESS_THRESHOLD of 10)
      const manyFeeds: FavoriteFeed[] = Array.from({ length: 12 }, (_, i) => ({
        name: `Podcast ${i + 1}`,
        url: `https://example.com/feed${i + 1}`,
        feedId: 1000 + i,
        dateAdded: '2024-01-10T12:00:00Z',
      }));
      mockFavorites.feeds = manyFeeds;

      mockClient.getEpisodesByFeedId.mockResolvedValue({
        status: 'true',
        items: [],
      });

      await expect(recentCommand({})).rejects.toThrow('process.exit called');

      // Verify progress was shown
      const allWriteCalls = stdoutWriteSpy.mock.calls.flat().join('');
      expect(allWriteCalls).toContain('Progress:');
      expect(allWriteCalls).toContain('feeds fetched');
    });

    it('should not show progress when fetching 10 or fewer feeds', async () => {
      // Create exactly 10 feeds (at PROGRESS_THRESHOLD)
      const tenFeeds: FavoriteFeed[] = Array.from({ length: 10 }, (_, i) => ({
        name: `Podcast ${i + 1}`,
        url: `https://example.com/feed${i + 1}`,
        feedId: 1000 + i,
        dateAdded: '2024-01-10T12:00:00Z',
      }));
      mockFavorites.feeds = tenFeeds;

      mockClient.getEpisodesByFeedId.mockResolvedValue({
        status: 'true',
        items: [],
      });

      await expect(recentCommand({})).rejects.toThrow('process.exit called');

      // Verify progress was NOT shown
      const allWriteCalls = stdoutWriteSpy.mock.calls.flat().join('');
      expect(allWriteCalls).not.toContain('Progress:');
    });

    it('should not show progress when using --feed filter', async () => {
      // Create 12 feeds but filter to just one
      const manyFeeds: FavoriteFeed[] = Array.from({ length: 12 }, (_, i) => ({
        name: `Podcast ${i + 1}`,
        url: `https://example.com/feed${i + 1}`,
        feedId: 1000 + i,
        dateAdded: '2024-01-10T12:00:00Z',
      }));
      mockFavorites.feeds = manyFeeds;

      mockClient.getEpisodesByFeedId.mockResolvedValue({
        status: 'true',
        items: [],
      });

      await expect(recentCommand({ feed: 'Podcast 1' })).rejects.toThrow('process.exit called');

      // Verify progress was NOT shown (only 1 feed being fetched)
      const allWriteCalls = stdoutWriteSpy.mock.calls.flat().join('');
      expect(allWriteCalls).not.toContain('Progress:');
    });
  });
});
