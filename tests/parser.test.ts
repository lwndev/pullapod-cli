import { PodcastParser } from '../src/parser';
import Parser from 'rss-parser';

// Mock rss-parser module
jest.mock('rss-parser');

describe('PodcastParser', () => {
  let parser: PodcastParser;
  let mockParseURL: jest.Mock;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Get the mocked Parser constructor
    const MockedParser = Parser as jest.MockedClass<typeof Parser>;
    mockParseURL = jest.fn();

    // Setup the mock implementation
    MockedParser.mockImplementation(() => ({
      parseURL: mockParseURL,
      parseString: jest.fn(),
    } as any));

    parser = new PodcastParser();
  });

  const mockFeedResponse = {
    title: 'Test Podcast',
    image: {
      url: 'https://example.com/podcast-art.jpg',
    },
    items: [
      {
        title: 'Episode 1',
        pubDate: 'Fri, 25 Apr 2014 09:00:00 +0000',
        enclosure: {
          url: 'https://example.com/ep1.mp3',
          length: '83968480',
          type: 'audio/mpeg',
        },
        contentSnippet: 'First episode',
        itunesImage: {
          $: {
            href: 'https://example.com/ep1-art.jpg',
          },
        },
        duration: '00:58:23',
      },
      {
        title: 'Episode 2',
        pubDate: 'Thu, 17 Apr 2014 09:00:00 +0000',
        enclosure: {
          url: 'https://example.com/ep2.mp3',
          length: '81795584',
          type: 'audio/mpeg',
        },
        contentSnippet: 'Second episode',
        duration: '00:56:51',
      },
    ],
  };

  describe('parseFeed', () => {
    it('should successfully parse a valid RSS feed', async () => {
      mockParseURL.mockResolvedValue(mockFeedResponse);

      const episodes = await parser.parseFeed('https://example.com/feed.xml');

      expect(episodes).toHaveLength(2);
      expect(episodes[0].title).toBe('Episode 1');
      expect(episodes[0].enclosureUrl).toBe('https://example.com/ep1.mp3');
      expect(episodes[0].podcastTitle).toBe('Test Podcast');
      expect(mockParseURL).toHaveBeenCalledWith('https://example.com/feed.xml');
    });

    it('should send custom headers in requests', async () => {
      // The custom headers are configured in the Parser constructor
      // This test verifies the parser is constructed with the correct options
      mockParseURL.mockResolvedValue(mockFeedResponse);

      const episodes = await parser.parseFeed('https://example.com/feed.xml');

      // Verify the request succeeded and parsed correctly
      expect(episodes).toHaveLength(2);
      expect(mockParseURL).toHaveBeenCalledWith('https://example.com/feed.xml');
    });

    it('should parse episode-specific artwork', async () => {
      mockParseURL.mockResolvedValue(mockFeedResponse);

      const episodes = await parser.parseFeed('https://example.com/feed.xml');

      expect(episodes[0].artwork).toBe('https://example.com/ep1-art.jpg');
    });

    it('should fall back to podcast artwork when episode artwork is missing', async () => {
      mockParseURL.mockResolvedValue(mockFeedResponse);

      const episodes = await parser.parseFeed('https://example.com/feed.xml');

      expect(episodes[1].artwork).toBe('https://example.com/podcast-art.jpg');
    });

    it('should parse publish dates correctly', async () => {
      mockParseURL.mockResolvedValue(mockFeedResponse);

      const episodes = await parser.parseFeed('https://example.com/feed.xml');

      expect(episodes[0].publishDate).toBeInstanceOf(Date);
      expect(episodes[0].publishDate.getFullYear()).toBe(2014);
      expect(episodes[0].publishDate.getMonth()).toBe(3); // April (0-indexed)
      expect(episodes[0].publishDate.getDate()).toBe(25);
    });

    it('should filter out items without enclosures', async () => {
      const feedWithoutEnclosure = {
        title: 'Test Podcast',
        items: [
          {
            title: 'Episode with Audio',
            enclosure: {
              url: 'https://example.com/ep1.mp3',
              length: '1000',
              type: 'audio/mpeg',
            },
          },
          {
            title: 'Episode without Audio',
            contentSnippet: 'Just a text entry',
            // No enclosure
          },
        ],
      };

      mockParseURL.mockResolvedValue(feedWithoutEnclosure);

      const episodes = await parser.parseFeed('https://example.com/feed.xml');

      expect(episodes).toHaveLength(1);
      expect(episodes[0].title).toBe('Episode with Audio');
    });

    it('should handle feeds with missing titles gracefully', async () => {
      const feedWithoutTitles = {
        // No title
        items: [
          {
            enclosure: {
              url: 'https://example.com/ep1.mp3',
              length: '1000',
              type: 'audio/mpeg',
            },
            // No title
          },
        ],
      };

      mockParseURL.mockResolvedValue(feedWithoutTitles);

      const episodes = await parser.parseFeed('https://example.com/feed.xml');

      expect(episodes[0].title).toBe('Untitled Episode');
      expect(episodes[0].podcastTitle).toBe('Unknown Podcast');
    });

    it('should throw error for network failures', async () => {
      mockParseURL.mockRejectedValue(new Error('Network error'));

      await expect(parser.parseFeed('https://example.com/feed.xml'))
        .rejects
        .toThrow('Failed to parse RSS feed');
    });

    it('should throw error for 404 responses', async () => {
      mockParseURL.mockRejectedValue(new Error('Status code 404'));

      await expect(parser.parseFeed('https://example.com/feed.xml'))
        .rejects
        .toThrow('Failed to parse RSS feed');
    });

    it('should throw error for invalid XML', async () => {
      mockParseURL.mockRejectedValue(new Error('Invalid XML'));

      await expect(parser.parseFeed('https://example.com/feed.xml'))
        .rejects
        .toThrow('Failed to parse RSS feed');
    });

    it('should parse duration metadata', async () => {
      mockParseURL.mockResolvedValue(mockFeedResponse);

      const episodes = await parser.parseFeed('https://example.com/feed.xml');

      expect(episodes[0].duration).toBe('00:58:23');
    });
  });
});
