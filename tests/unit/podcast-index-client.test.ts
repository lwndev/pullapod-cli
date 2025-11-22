/**
 * Tests for Podcast Index API Client
 */

import fetchMock from 'jest-fetch-mock';
import { PodcastIndexClient } from '../../src/clients/podcast-index-client';
import { HttpClientError } from '../../src/clients/base-client';

// Helper to create a proper mock Response
function createMockResponse(data: unknown, status: number = 200, statusText: string = 'OK') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response;
}

describe('PodcastIndexClient', () => {
  const mockConfig = {
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    baseUrl: 'https://api.podcastindex.org/api/1.0',
  };

  let client: PodcastIndexClient;

  beforeEach(() => {
    fetchMock.enableMocks();
    client = new PodcastIndexClient(mockConfig);
    fetchMock.resetMocks();
  });

  afterEach(() => {
    fetchMock.resetMocks();
  });

  describe('Authentication', () => {
    it('should include authentication headers in requests', async () => {
      const mockResponse = createMockResponse({
        status: 'true',
        feeds: [],
        count: 0,
      });

      fetchMock.mockResolvedValueOnce(mockResponse);

      await client.searchByTerm({ q: 'test' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callArgs = fetchMock.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;

      expect(headers['User-Agent']).toBeDefined();
      expect(headers['X-Auth-Key']).toBe('test-api-key');
      expect(headers['X-Auth-Date']).toBeDefined();
      expect(headers['Authorization']).toBeDefined();
    });

    it('should generate valid SHA-1 authorization hash', async () => {
      const mockResponse = createMockResponse({
        status: 'true',
        feeds: [],
        count: 0,
      });

      fetchMock.mockResolvedValueOnce(mockResponse);

      await client.searchByTerm({ q: 'test' });

      const callArgs = fetchMock.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      const authHeader = headers['Authorization'];

      // SHA-1 hash should be 40 characters (hex)
      expect(authHeader).toMatch(/^[a-f0-9]{40}$/);
    });
  });

  describe('Search Methods', () => {
    it('should search podcasts by term', async () => {
      const mockData = {
        status: 'true',
        feeds: [
          {
            id: 920666,
            title: 'Test Podcast',
            url: 'https://example.com/feed.xml',
            description: 'A test podcast',
            author: 'Test Author',
          },
        ],
        count: 1,
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.searchByTerm({ q: 'javascript', max: 10 });

      expect(result.status).toBe('true');
      expect(result.feeds).toHaveLength(1);
      expect(result.feeds?.[0].title).toBe('Test Podcast');

      // Verify the URL includes query parameters
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('q=javascript');
      expect(calledUrl).toContain('max=10');
    });

    it('should search podcasts by title', async () => {
      const mockData = {
        status: 'true',
        feeds: [
          {
            id: 123456,
            title: 'The Daily',
            url: 'https://example.com/daily.xml',
          },
        ],
        count: 1,
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.searchByTitle({
        q: 'The Daily',
        similar: true,
      });

      expect(result.feeds?.[0].title).toBe('The Daily');
    });
  });

  describe('Podcast Methods', () => {
    it('should get podcast by ID', async () => {
      const mockData = {
        status: 'true',
        feed: {
          id: 920666,
          title: 'Test Podcast',
          url: 'https://example.com/feed.xml',
        },
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.getPodcastById(920666);

      expect(result.feed?.id).toBe(920666);
      expect(result.feed?.title).toBe('Test Podcast');
    });

    it('should get podcast by URL', async () => {
      const feedUrl = 'https://example.com/feed.xml';
      const mockData = {
        status: 'true',
        feed: {
          id: 920666,
          url: feedUrl,
          title: 'Test Podcast',
        },
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.getPodcastByUrl(feedUrl);

      expect(result.feed?.url).toBe(feedUrl);
    });

    it('should get podcast by iTunes ID', async () => {
      const mockData = {
        status: 'true',
        feed: {
          id: 920666,
          itunesId: 1234567890,
          title: 'Test Podcast',
        },
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.getPodcastByItunesId(1234567890);

      expect(result.feed?.itunesId).toBe(1234567890);
    });

    it('should get podcast by GUID', async () => {
      const podcastGuid = '917393e3-1382-5c6e-8f7e-facf67af2d10';
      const mockData = {
        status: 'true',
        feed: {
          id: 920666,
          podcastGuid: podcastGuid,
          title: 'Test Podcast',
        },
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.getPodcastByGuid(podcastGuid);

      expect(result.feed?.podcastGuid).toBe(podcastGuid);
    });

    it('should get trending podcasts', async () => {
      const mockData = {
        status: 'true',
        feeds: [
          { id: 1, title: 'Trending Pod 1' },
          { id: 2, title: 'Trending Pod 2' },
        ],
        count: 2,
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.getTrending({ max: 10, lang: 'en' });

      expect(result.feeds).toHaveLength(2);
    });
  });

  describe('Episode Methods', () => {
    it('should get episodes by feed ID', async () => {
      const mockData = {
        status: 'true',
        items: [
          {
            id: 123,
            title: 'Episode 1',
            feedId: 920666,
          },
        ],
        count: 1,
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.getEpisodesByFeedId({ id: 920666, max: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items?.[0].feedId).toBe(920666);
    });

    it('should get episodes by feed URL', async () => {
      const feedUrl = 'https://example.com/feed.xml';
      const mockData = {
        status: 'true',
        items: [
          {
            id: 123,
            title: 'Episode 1',
            feedId: 920666,
          },
        ],
        count: 1,
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.getEpisodesByFeedUrl({ url: feedUrl, max: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items?.[0].title).toBe('Episode 1');
    });

    it('should get episode by ID', async () => {
      const mockData = {
        status: 'true',
        episode: {
          id: 123456,
          title: 'Test Episode',
        },
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.getEpisodeById(123456);

      expect(result.status).toBe('true');
    });

    it('should get episode by GUID', async () => {
      const episodeGuid = 'episode-guid-123';
      const feedUrl = 'https://example.com/feed.xml';
      const mockData = {
        status: 'true',
        episode: {
          id: 123456,
          guid: episodeGuid,
          title: 'Test Episode',
        },
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.getEpisodeByGuid(episodeGuid, feedUrl);

      expect(result.status).toBe('true');
    });

    it('should get random episodes', async () => {
      const mockData = {
        status: 'true',
        episodes: [
          { id: 1, title: 'Random Episode 1' },
          { id: 2, title: 'Random Episode 2' },
        ],
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.getRandomEpisodes(2, 'en');

      expect(result.episodes).toHaveLength(2);
    });
  });

  describe('Recent Methods', () => {
    it('should get recent episodes', async () => {
      const mockData = {
        status: 'true',
        items: [
          { id: 1, title: 'Recent Episode 1' },
          { id: 2, title: 'Recent Episode 2' },
        ],
        count: 2,
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.getRecentEpisodes({ max: 10 });

      expect(result.items).toHaveLength(2);
    });

    it('should get recent feeds', async () => {
      const mockData = {
        status: 'true',
        feeds: [{ id: 1, title: 'New Podcast' }],
        count: 1,
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.getRecentFeeds({ max: 10, lang: 'en' });

      expect(result.feeds).toHaveLength(1);
    });

    it('should get new feeds', async () => {
      const mockData = {
        status: 'true',
        feeds: [
          { id: 1, title: 'Brand New Podcast 1' },
          { id: 2, title: 'Brand New Podcast 2' },
        ],
        count: 2,
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.getNewFeeds({ max: 10, lang: 'en' });

      expect(result.feeds).toHaveLength(2);
      expect(result.count).toBe(2);
    });
  });

  describe('Stats & Categories', () => {
    it('should get statistics', async () => {
      const mockData = {
        stats: {
          feedCountTotal: 4000000,
          episodeCountTotal: 100000000,
          feedsWithNewEpisodes3days: 50000,
          feedsWithNewEpisodes10days: 100000,
          feedsWithNewEpisodes30days: 200000,
          feedsWithNewEpisodes90days: 300000,
          feedsWithValueBlocks: 10000,
        },
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.getStats();

      expect(result.feedCountTotal).toBe(4000000);
      expect(result.episodeCountTotal).toBe(100000000);
    });

    it('should get categories', async () => {
      const mockData = {
        feeds: [
          { id: 1, name: 'Technology' },
          { id: 2, name: 'News' },
        ],
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.getCategories();

      expect(result.feeds).toHaveLength(2);
      expect(result.feeds[0].name).toBe('Technology');
    });
  });

  describe('Hub & Add Methods', () => {
    it('should notify feed update', async () => {
      const feedUrl = 'https://example.com/feed.xml';
      const mockData = {
        status: 'success',
        description: 'Feed update notification received',
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.notifyFeedUpdate(feedUrl);

      expect(result.status).toBe('success');
    });

    it('should add new feed', async () => {
      const feedUrl = 'https://example.com/new-feed.xml';
      const mockData = {
        status: 'success',
        description: 'Feed added successfully',
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.addFeed(feedUrl);

      expect(result.status).toBe('success');
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP 401 errors', async () => {
      const errorResponse = createMockResponse(
        { error: 'Unauthorized' },
        401,
        'Unauthorized'
      );

      fetchMock.mockResolvedValueOnce(errorResponse);

      await expect(client.searchByTerm({ q: 'test' })).rejects.toThrow(
        HttpClientError
      );

      // Re-mock for second assertion
      fetchMock.mockResolvedValueOnce(createMockResponse({ error: 'Unauthorized' }, 401, 'Unauthorized'));
      await expect(client.searchByTerm({ q: 'test' })).rejects.toThrow(
        'HTTP 401'
      );
    });

    it('should handle HTTP 404 errors', async () => {
      const errorResponse = createMockResponse(
        { error: 'Not found' },
        404,
        'Not Found'
      );

      fetchMock.mockResolvedValueOnce(errorResponse);

      await expect(client.getPodcastById(999999)).rejects.toThrow(
        HttpClientError
      );
    });

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network failure'));

      await expect(client.searchByTerm({ q: 'test' })).rejects.toThrow(
        HttpClientError
      );

      // Re-mock for second assertion
      fetchMock.mockRejectedValueOnce(new Error('Network failure'));
      await expect(client.searchByTerm({ q: 'test' })).rejects.toThrow(
        'Request failed'
      );
    });

    it('should include status code in error', async () => {
      const errorResponse = createMockResponse(
        { error: 'Bad request' },
        400,
        'Bad Request'
      );

      fetchMock.mockResolvedValueOnce(errorResponse);

      try {
        await client.searchByTerm({ q: 'test' });
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpClientError);
        expect((error as HttpClientError).statusCode).toBe(400);
      }
    });
  });

  describe('Configuration', () => {
    it('should use custom base URL', () => {
      const customClient = new PodcastIndexClient({
        apiKey: 'key',
        apiSecret: 'secret',
        baseUrl: 'https://custom.api.com/v1',
      });

      expect(customClient).toBeDefined();
    });

    it('should use custom user agent', async () => {
      const customClient = new PodcastIndexClient({
        apiKey: 'key',
        apiSecret: 'secret',
        userAgent: 'CustomApp/2.0',
      });

      const mockResponse = createMockResponse({ status: 'true', feeds: [] });
      fetchMock.mockResolvedValueOnce(mockResponse);

      await customClient.searchByTerm({ q: 'test' });

      const callArgs = fetchMock.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers['User-Agent']).toBe('CustomApp/2.0');
    });

    it('should use default user agent if not provided', async () => {
      const mockResponse = createMockResponse({ status: 'true', feeds: [] });
      fetchMock.mockResolvedValueOnce(mockResponse);

      await client.searchByTerm({ q: 'test' });

      const callArgs = fetchMock.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers['User-Agent']).toBe('pullapod/1.0');
    });
  });
});
