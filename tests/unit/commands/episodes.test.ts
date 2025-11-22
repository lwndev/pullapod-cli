/**
 * Tests for episodes command
 */

import { episodesCommand, EpisodesOptions } from '../../../src/commands/episodes';
import { PodcastIndexClient } from '../../../src/clients/podcast-index-client';
import { formatEpisodesList } from '../../../src/formatters/episodes-formatter';
import { loadConfig } from '../../../src/config';
import { PodcastEpisode } from '../../../src/clients/podcast-index-types';

// Mock dependencies
jest.mock('../../../src/clients/podcast-index-client');
jest.mock('../../../src/formatters/episodes-formatter');
jest.mock('../../../src/config');

describe('episodes command', () => {
  const mockEpisodes: PodcastEpisode[] = [
    {
      id: 1,
      title: 'JSJ 547: Modern React Patterns',
      link: 'https://javascriptjabber.com/episode547',
      description: 'In this episode we discuss modern React patterns with special guest Dan Abramov',
      guid: 'episode547',
      datePublished: 1705276800, // Jan 15, 2024
      datePublishedPretty: 'January 15, 2024 12:00am',
      dateCrawled: 1705276800,
      enclosureUrl: 'https://cdn.fireside.fm/episode547.mp3',
      enclosureType: 'audio/mpeg',
      enclosureLength: 52428800,
      duration: 3120, // 52 minutes
      explicit: 0,
      episode: 547,
      image: 'https://example.com/episode547.jpg',
      feedItunesId: 123456,
      feedImage: 'https://example.com/podcast.jpg',
      feedId: 920666,
      feedTitle: 'JavaScript Jabber',
      feedLanguage: 'en',
    },
    {
      id: 2,
      title: 'JSJ 546: TypeScript 5.0 Deep Dive',
      link: 'https://javascriptjabber.com/episode546',
      description: 'A deep dive into the new features in TypeScript 5.0',
      guid: 'episode546',
      datePublished: 1704672000, // Jan 08, 2024
      datePublishedPretty: 'January 8, 2024 12:00am',
      dateCrawled: 1704672000,
      enclosureUrl: 'https://cdn.fireside.fm/episode546.mp3',
      enclosureType: 'audio/mpeg',
      enclosureLength: 48234800,
      duration: 2880, // 48 minutes
      explicit: 0,
      episode: 546,
      image: 'https://example.com/episode546.jpg',
      feedItunesId: 123456,
      feedImage: 'https://example.com/podcast.jpg',
      feedId: 920666,
      feedTitle: 'JavaScript Jabber',
      feedLanguage: 'en',
    },
  ];

  let mockClient: jest.Mocked<PodcastIndexClient>;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    // Setup mocks
    mockClient = {
      getEpisodesByFeedId: jest.fn(),
      getEpisodesByFeedUrl: jest.fn(),
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

    (formatEpisodesList as jest.Mock).mockReturnValue('Formatted episodes list');

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

  describe('feed URL input', () => {
    it('should fetch episodes by feed URL with default options', async () => {
      mockClient.getEpisodesByFeedUrl.mockResolvedValue({
        status: 'true',
        items: mockEpisodes,
        count: mockEpisodes.length,
        description: 'Found episodes',
      });

      const options: EpisodesOptions = {};

      await expect(
        episodesCommand('https://feeds.fireside.fm/javascriptjabber/rss', options)
      ).rejects.toThrow('process.exit called');

      expect(mockClient.getEpisodesByFeedUrl).toHaveBeenCalledWith({
        url: 'https://feeds.fireside.fm/javascriptjabber/rss',
        max: 20,
        since: undefined,
        fulltext: true,
      });
      expect(formatEpisodesList).toHaveBeenCalledWith(
        mockEpisodes,
        'JavaScript Jabber',
        false,
        20
      );
      expect(consoleSpy).toHaveBeenCalledWith('\nFormatted episodes list');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('feed ID input', () => {
    it('should fetch episodes by feed ID when numeric input is provided', async () => {
      mockClient.getEpisodesByFeedId.mockResolvedValue({
        status: 'true',
        items: mockEpisodes,
        count: mockEpisodes.length,
        description: 'Found episodes',
      });

      const options: EpisodesOptions = {};

      await expect(episodesCommand('920666', options)).rejects.toThrow('process.exit called');

      expect(mockClient.getEpisodesByFeedId).toHaveBeenCalledWith({
        id: 920666,
        max: 20,
        since: undefined,
        fulltext: true,
      });
      expect(mockClient.getEpisodesByFeedUrl).not.toHaveBeenCalled();
    });

    it('should detect feed ID even with whitespace', async () => {
      mockClient.getEpisodesByFeedId.mockResolvedValue({
        status: 'true',
        items: mockEpisodes,
        count: mockEpisodes.length,
        description: 'Found episodes',
      });

      const options: EpisodesOptions = {};

      await expect(episodesCommand('  920666  ', options)).rejects.toThrow('process.exit called');

      expect(mockClient.getEpisodesByFeedId).toHaveBeenCalledWith({
        id: 920666,
        max: 20,
        since: undefined,
        fulltext: true,
      });
    });
  });

  describe('options handling', () => {
    it('should respect --max option', async () => {
      mockClient.getEpisodesByFeedId.mockResolvedValue({
        status: 'true',
        items: mockEpisodes,
        count: mockEpisodes.length,
        description: 'Found episodes',
      });

      const options: EpisodesOptions = { max: '10' };

      await expect(episodesCommand('920666', options)).rejects.toThrow('process.exit called');

      expect(mockClient.getEpisodesByFeedId).toHaveBeenCalledWith({
        id: 920666,
        max: 10,
        since: undefined,
        fulltext: true,
      });
    });

    it('should validate max option is within range', async () => {
      const options: EpisodesOptions = { max: '150' };

      await expect(episodesCommand('920666', options)).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\nError:',
        expect.stringContaining('Max episodes must be between 1 and 100')
      );
    });

    it('should validate max option is not below minimum', async () => {
      const options: EpisodesOptions = { max: '0' };

      await expect(episodesCommand('920666', options)).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\nError:',
        expect.stringContaining('Max episodes must be between 1 and 100')
      );
    });

    it('should handle --full option', async () => {
      mockClient.getEpisodesByFeedId.mockResolvedValue({
        status: 'true',
        items: mockEpisodes,
        count: mockEpisodes.length,
        description: 'Found episodes',
      });

      const options: EpisodesOptions = { full: true };

      await expect(episodesCommand('920666', options)).rejects.toThrow('process.exit called');

      expect(formatEpisodesList).toHaveBeenCalledWith(
        mockEpisodes,
        'JavaScript Jabber',
        true,
        20
      );
    });

    it('should handle --since option with valid date', async () => {
      mockClient.getEpisodesByFeedId.mockResolvedValue({
        status: 'true',
        items: mockEpisodes,
        count: mockEpisodes.length,
        description: 'Found episodes',
      });

      const options: EpisodesOptions = { since: '2024-01-01' };

      await expect(episodesCommand('920666', options)).rejects.toThrow('process.exit called');

      expect(mockClient.getEpisodesByFeedId).toHaveBeenCalledWith({
        id: 920666,
        max: 20,
        since: 1704067200, // Unix timestamp for 2024-01-01
        fulltext: true,
      });
    });

    it('should validate --since date format', async () => {
      const options: EpisodesOptions = { since: 'invalid-date' };

      await expect(episodesCommand('920666', options)).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\nError:',
        expect.stringContaining('Invalid --since format')
      );
    });
  });

  describe('empty results', () => {
    it('should handle no episodes found', async () => {
      mockClient.getEpisodesByFeedId.mockResolvedValue({
        status: 'true',
        items: [],
        count: 0,
        description: 'No episodes found',
      });

      const options: EpisodesOptions = {};

      await expect(episodesCommand('920666', options)).rejects.toThrow('process.exit called');

      expect(consoleSpy).toHaveBeenCalledWith('No episodes found for this feed.');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should handle no episodes matching date filter', async () => {
      mockClient.getEpisodesByFeedId.mockResolvedValue({
        status: 'true',
        items: [],
        count: 0,
        description: 'No episodes found',
      });

      const options: EpisodesOptions = { since: '2024-01-01' };

      await expect(episodesCommand('920666', options)).rejects.toThrow('process.exit called');

      expect(consoleSpy).toHaveBeenCalledWith('No episodes found matching the specified date filter.');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('error handling', () => {
    it('should handle missing API credentials', async () => {
      (loadConfig as jest.Mock).mockReturnValue({
        podcastIndex: {
          apiKey: '',
          apiSecret: '',
        },
      });

      const options: EpisodesOptions = {};

      await expect(episodesCommand('920666', options)).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: Podcast Index API credentials not configured.'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('PODCAST_INDEX_API_KEY')
      );
    });

    it('should handle API errors gracefully', async () => {
      mockClient.getEpisodesByFeedId.mockRejectedValue(new Error('API request failed'));

      const options: EpisodesOptions = {};

      await expect(episodesCommand('920666', options)).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nError:', 'API request failed');
    });

    it('should show debug info when DEBUG is set', async () => {
      const originalDebug = process.env.DEBUG;
      process.env.DEBUG = 'true';

      const error = new Error('API request failed');
      mockClient.getEpisodesByFeedId.mockRejectedValue(error);

      const options: EpisodesOptions = {};

      await expect(episodesCommand('920666', options)).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith(error);

      process.env.DEBUG = originalDebug;
    });

    it('should handle feed not found errors', async () => {
      mockClient.getEpisodesByFeedId.mockRejectedValue(new Error('Feed not found'));

      const options: EpisodesOptions = {};

      await expect(episodesCommand('999999', options)).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nError:', 'Feed not found');
    });
  });

  describe('client initialization', () => {
    it('should initialize client with correct credentials', async () => {
      (loadConfig as jest.Mock).mockReturnValue({
        podcastIndex: {
          apiKey: 'my-api-key',
          apiSecret: 'my-api-secret',
        },
      });

      mockClient.getEpisodesByFeedId.mockResolvedValue({
        status: 'true',
        items: mockEpisodes,
        count: mockEpisodes.length,
        description: 'Found episodes',
      });

      const options: EpisodesOptions = {};

      await expect(episodesCommand('920666', options)).rejects.toThrow('process.exit called');

      expect(PodcastIndexClient).toHaveBeenCalledWith({
        apiKey: 'my-api-key',
        apiSecret: 'my-api-secret',
      });
    });
  });
});
