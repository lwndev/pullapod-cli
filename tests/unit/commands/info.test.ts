/**
 * Tests for info command
 */

import { infoCommand } from '../../../src/commands/info';
import { PodcastIndexClient } from '../../../src/clients/podcast-index-client';
import { formatPodcastInfo } from '../../../src/formatters/info-formatter';
import { loadConfig } from '../../../src/config';
import { PodcastFeed } from '../../../src/clients/podcast-index-types';

// Mock dependencies
jest.mock('../../../src/clients/podcast-index-client');
jest.mock('../../../src/formatters/info-formatter');
jest.mock('../../../src/config');

describe('info command', () => {
  const mockFeed: PodcastFeed = {
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
    itunesId: 496893300,
    language: 'en',
    type: 0,
    dead: 0,
    crawlErrors: 0,
    parseErrors: 0,
    categories: { '1': 'Technology' },
    locked: 0,
    explicit: false,
    medium: 'podcast',
    episodeCount: 547,
  };

  let mockClient: jest.Mocked<PodcastIndexClient>;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    // Setup mocks
    mockClient = {
      getPodcastById: jest.fn(),
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

    (formatPodcastInfo as jest.Mock).mockReturnValue('Formatted podcast info');

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
    it('should fetch podcast info by feed URL', async () => {
      mockClient.getPodcastByUrl.mockResolvedValue({
        status: 'true',
        feed: mockFeed,
      });

      await expect(
        infoCommand('https://feeds.fireside.fm/javascriptjabber/rss')
      ).rejects.toThrow('process.exit called');

      expect(mockClient.getPodcastByUrl).toHaveBeenCalledWith(
        'https://feeds.fireside.fm/javascriptjabber/rss'
      );
      expect(formatPodcastInfo).toHaveBeenCalledWith(mockFeed);
      expect(consoleSpy).toHaveBeenCalledWith('\nFormatted podcast info');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('feed ID input', () => {
    it('should fetch podcast info by feed ID when numeric input is provided', async () => {
      mockClient.getPodcastById.mockResolvedValue({
        status: 'true',
        feed: mockFeed,
      });

      await expect(infoCommand('920666')).rejects.toThrow('process.exit called');

      expect(mockClient.getPodcastById).toHaveBeenCalledWith(920666);
      expect(mockClient.getPodcastByUrl).not.toHaveBeenCalled();
      expect(formatPodcastInfo).toHaveBeenCalledWith(mockFeed);
    });

    it('should detect feed ID even with whitespace', async () => {
      mockClient.getPodcastById.mockResolvedValue({
        status: 'true',
        feed: mockFeed,
      });

      await expect(infoCommand('  920666  ')).rejects.toThrow('process.exit called');

      expect(mockClient.getPodcastById).toHaveBeenCalledWith(920666);
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

      await expect(infoCommand('920666')).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: Podcast Index API credentials not configured.'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('PODCAST_INDEX_API_KEY')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle feed not found', async () => {
      mockClient.getPodcastById.mockResolvedValue({
        status: 'true',
        feed: undefined,
      });

      await expect(infoCommand('999999')).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Feed not found');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle API errors gracefully', async () => {
      mockClient.getPodcastById.mockRejectedValue(new Error('API request failed'));

      await expect(infoCommand('920666')).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nError:', 'API request failed');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should show debug info when DEBUG is set', async () => {
      const originalDebug = process.env.DEBUG;
      process.env.DEBUG = 'true';

      const error = new Error('API request failed');
      mockClient.getPodcastById.mockRejectedValue(error);

      await expect(infoCommand('920666')).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith(error);

      process.env.DEBUG = originalDebug;
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

      mockClient.getPodcastById.mockResolvedValue({
        status: 'true',
        feed: mockFeed,
      });

      await expect(infoCommand('920666')).rejects.toThrow('process.exit called');

      expect(PodcastIndexClient).toHaveBeenCalledWith({
        apiKey: 'my-api-key',
        apiSecret: 'my-api-secret',
      });
    });
  });

  describe('response handling', () => {
    it('should handle feed in feeds array (fallback)', async () => {
      mockClient.getPodcastById.mockResolvedValue({
        status: 'true',
        feeds: [mockFeed],
      });

      await expect(infoCommand('920666')).rejects.toThrow('process.exit called');

      expect(formatPodcastInfo).toHaveBeenCalledWith(mockFeed);
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });
});
