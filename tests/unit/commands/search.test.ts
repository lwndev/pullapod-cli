/**
 * Tests for search command
 */

import { searchCommand, SearchOptions } from '../../../src/commands/search';
import { PodcastIndexClient } from '../../../src/clients/podcast-index-client';
import { formatSearchResults } from '../../../src/formatters/search-formatter';
import { loadConfig } from '../../../src/config';
import { PodcastFeed } from '../../../src/clients/podcast-index-types';

// Mock dependencies
jest.mock('../../../src/clients/podcast-index-client');
jest.mock('../../../src/formatters/search-formatter');
jest.mock('../../../src/config');

describe('search command', () => {
  const mockFeeds: PodcastFeed[] = [
    {
      id: 1,
      title: 'JavaScript Jabber',
      url: 'https://feeds.fireside.fm/javascriptjabber/rss',
      originalUrl: 'https://feeds.fireside.fm/javascriptjabber/rss',
      link: 'https://javascriptjabber.com',
      description: 'Weekly panel discussion about JavaScript',
      author: 'Devchat.tv',
      ownerName: 'Charles Max Wood',
      image: 'https://example.com/image.jpg',
      artwork: 'https://example.com/artwork.jpg',
      lastUpdateTime: 1234567890,
      lastCrawlTime: 1234567890,
      lastParseTime: 1234567890,
      lastGoodHttpStatusTime: 1234567890,
      lastHttpStatus: 200,
      contentType: 'application/rss+xml',
      language: 'en',
      type: 0,
      dead: 0,
      crawlErrors: 0,
      parseErrors: 0,
      categories: {},
      locked: 0,
      explicit: false,
      episodeCount: 547,
    },
    {
      id: 2,
      title: 'JavaScript Air',
      url: 'https://feeds.simplecast.com/gvtxUiIf',
      originalUrl: 'https://feeds.simplecast.com/gvtxUiIf',
      link: 'https://javascriptair.com',
      description: 'The live broadcast podcast all about JavaScript',
      author: 'Kent C. Dodds',
      ownerName: 'Kent C. Dodds',
      image: 'https://example.com/image2.jpg',
      artwork: 'https://example.com/artwork2.jpg',
      lastUpdateTime: 1234567890,
      lastCrawlTime: 1234567890,
      lastParseTime: 1234567890,
      lastGoodHttpStatusTime: 1234567890,
      lastHttpStatus: 200,
      contentType: 'application/rss+xml',
      language: 'en',
      type: 0,
      dead: 0,
      crawlErrors: 0,
      parseErrors: 0,
      categories: {},
      locked: 0,
      explicit: false,
      episodeCount: 89,
    },
  ];

  let mockClient: jest.Mocked<PodcastIndexClient>;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    // Setup mocks
    mockClient = {
      searchByTerm: jest.fn(),
      searchByTitle: jest.fn(),
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

    (formatSearchResults as jest.Mock).mockReturnValue('Formatted search results');

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

  describe('basic search', () => {
    it('should perform search by term with default options', async () => {
      mockClient.searchByTerm.mockResolvedValue({
        status: 'true',
        feeds: mockFeeds,
        count: mockFeeds.length,
        query: 'javascript',
        description: 'Found matching feeds',
      });

      const options: SearchOptions = {};

      // searchCommand calls process.exit(0) on success, which we mock to throw
      await expect(searchCommand('javascript', options)).rejects.toThrow('process.exit called');

      expect(mockClient.searchByTerm).toHaveBeenCalledWith({
        q: 'javascript',
        max: 10,
      });
      expect(formatSearchResults).toHaveBeenCalledWith(mockFeeds);
      expect(consoleSpy).toHaveBeenCalledWith('Searching for "javascript"...');
      expect(consoleSpy).toHaveBeenCalledWith('\nFormatted search results');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should search by title only when --title-only is set', async () => {
      mockClient.searchByTitle.mockResolvedValue({
        status: 'true',
        feeds: mockFeeds,
        count: mockFeeds.length,
        query: 'javascript',
        description: 'Found matching feeds',
      });

      const options: SearchOptions = { titleOnly: true };

      await expect(searchCommand('javascript', options)).rejects.toThrow('process.exit called');

      expect(mockClient.searchByTitle).toHaveBeenCalledWith({
        q: 'javascript',
        max: 10,
        similar: undefined,
      });
      expect(mockClient.searchByTerm).not.toHaveBeenCalled();
    });

    it('should include similar matches when --similar is set', async () => {
      mockClient.searchByTitle.mockResolvedValue({
        status: 'true',
        feeds: mockFeeds,
        count: mockFeeds.length,
        query: 'javascript',
        description: 'Found matching feeds',
      });

      const options: SearchOptions = { titleOnly: true, similar: true };

      await expect(searchCommand('javascript', options)).rejects.toThrow('process.exit called');

      expect(mockClient.searchByTitle).toHaveBeenCalledWith({
        q: 'javascript',
        max: 10,
        similar: true,
      });
    });
  });

  describe('options handling', () => {
    it('should respect --max option', async () => {
      mockClient.searchByTerm.mockResolvedValue({
        status: 'true',
        feeds: mockFeeds,
        count: mockFeeds.length,
        query: 'javascript',
        description: 'Found matching feeds',
      });

      const options: SearchOptions = { max: '20' };

      await expect(searchCommand('javascript', options)).rejects.toThrow('process.exit called');

      expect(mockClient.searchByTerm).toHaveBeenCalledWith({
        q: 'javascript',
        max: 20,
      });
    });

    it('should validate max option is within range', async () => {
      const options: SearchOptions = { max: '150' };

      await expect(searchCommand('javascript', options)).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\nError:',
        expect.stringContaining('Max results must be between 1 and 100')
      );
    });

    it('should validate max option is not below minimum', async () => {
      const options: SearchOptions = { max: '0' };

      await expect(searchCommand('javascript', options)).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\nError:',
        expect.stringContaining('Max results must be between 1 and 100')
      );
    });
  });

  describe('language filtering', () => {
    it('should filter results by language', async () => {
      const mixedLanguageFeeds = [
        { ...mockFeeds[0], language: 'en' },
        { ...mockFeeds[1], language: 'es' },
      ];

      mockClient.searchByTerm.mockResolvedValue({
        status: 'true',
        feeds: mixedLanguageFeeds,
        count: mixedLanguageFeeds.length,
        query: 'javascript',
        description: 'Found matching feeds',
      });

      const options: SearchOptions = { language: 'en' };

      await expect(searchCommand('javascript', options)).rejects.toThrow('process.exit called');

      expect(formatSearchResults).toHaveBeenCalledWith([mixedLanguageFeeds[0]]);
    });

    it('should handle language filtering case-insensitively', async () => {
      const feeds = [{ ...mockFeeds[0], language: 'EN' }];

      mockClient.searchByTerm.mockResolvedValue({
        status: 'true',
        feeds,
        count: feeds.length,
        query: 'javascript',
        description: 'Found matching feeds',
      });

      const options: SearchOptions = { language: 'en' };

      await expect(searchCommand('javascript', options)).rejects.toThrow('process.exit called');

      expect(formatSearchResults).toHaveBeenCalledWith(feeds);
    });

    it('should handle feeds without language field', async () => {
      const feedsNoLang = [{ ...mockFeeds[0], language: '' }];

      mockClient.searchByTerm.mockResolvedValue({
        status: 'true',
        feeds: feedsNoLang as any,
        count: feedsNoLang.length,
        query: 'javascript',
        description: 'Found matching feeds',
      });

      const options: SearchOptions = { language: 'en' };

      await expect(searchCommand('javascript', options)).rejects.toThrow('process.exit called');

      expect(formatSearchResults).toHaveBeenCalledWith([]);
    });
  });

  describe('query validation', () => {
    it('should reject empty query', async () => {
      const options: SearchOptions = {};

      await expect(searchCommand('   ', options)).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Search query cannot be empty');
    });

    it('should trim whitespace from query', async () => {
      mockClient.searchByTerm.mockResolvedValue({
        status: 'true',
        feeds: mockFeeds,
        count: mockFeeds.length,
        query: 'javascript',
        description: 'Found matching feeds',
      });

      const options: SearchOptions = {};

      await expect(searchCommand('  javascript  ', options)).rejects.toThrow('process.exit called');

      expect(mockClient.searchByTerm).toHaveBeenCalledWith({
        q: 'javascript',
        max: 10,
      });
      expect(consoleSpy).toHaveBeenCalledWith('Searching for "javascript"...');
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

      const options: SearchOptions = {};

      await expect(searchCommand('javascript', options)).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: Podcast Index API credentials not configured.'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('PODCAST_INDEX_API_KEY')
      );
    });

    it('should handle API errors gracefully', async () => {
      mockClient.searchByTerm.mockRejectedValue(new Error('API request failed'));

      const options: SearchOptions = {};

      await expect(searchCommand('javascript', options)).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nError:', 'API request failed');
    });

    it('should show debug info when DEBUG is set', async () => {
      const originalDebug = process.env.DEBUG;
      process.env.DEBUG = 'true';

      const error = new Error('API request failed');
      mockClient.searchByTerm.mockRejectedValue(error);

      const options: SearchOptions = {};

      await expect(searchCommand('javascript', options)).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith(error);

      process.env.DEBUG = originalDebug;
    });

    it('should handle network errors', async () => {
      mockClient.searchByTerm.mockRejectedValue(new Error('ECONNREFUSED'));

      const options: SearchOptions = {};

      await expect(searchCommand('javascript', options)).rejects.toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nError:', 'ECONNREFUSED');
    });
  });

  describe('empty results', () => {
    it('should handle no results found', async () => {
      mockClient.searchByTerm.mockResolvedValue({
        status: 'true',
        feeds: [],
        count: 0,
        query: 'nonexistentpodcast123',
        description: 'No feeds found',
      });

      (formatSearchResults as jest.Mock).mockReturnValue('No podcasts found.');

      const options: SearchOptions = {};

      await expect(searchCommand('nonexistentpodcast123', options)).rejects.toThrow('process.exit called');

      expect(formatSearchResults).toHaveBeenCalledWith([]);
      expect(consoleSpy).toHaveBeenCalledWith('\nNo podcasts found.');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should handle empty results after language filtering', async () => {
      mockClient.searchByTerm.mockResolvedValue({
        status: 'true',
        feeds: [{ ...mockFeeds[0], language: 'es' }],
        count: 1,
        query: 'javascript',
        description: 'Found matching feeds',
      });

      (formatSearchResults as jest.Mock).mockReturnValue('No podcasts found.');

      const options: SearchOptions = { language: 'en' };

      await expect(searchCommand('javascript', options)).rejects.toThrow('process.exit called');

      expect(formatSearchResults).toHaveBeenCalledWith([]);
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

      mockClient.searchByTerm.mockResolvedValue({
        status: 'true',
        feeds: mockFeeds,
        count: mockFeeds.length,
        query: 'javascript',
        description: 'Found matching feeds',
      });

      const options: SearchOptions = {};

      await expect(searchCommand('javascript', options)).rejects.toThrow('process.exit called');

      expect(PodcastIndexClient).toHaveBeenCalledWith({
        apiKey: 'my-api-key',
        apiSecret: 'my-api-secret',
      });
    });
  });
});
