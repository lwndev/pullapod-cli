/**
 * Tests for Base HTTP Client
 */

import fetchMock from 'jest-fetch-mock';
import { BaseHttpClient, HttpClientError } from '../../src/clients/base-client';

// Helper to create a proper mock Response
function createMockResponse(data: unknown, status: number = 200, statusText: string = 'OK', contentType: string = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Headers({
      'Content-Type': contentType,
    }),
    json: () => Promise.resolve(typeof data === 'string' ? JSON.parse(data) : data),
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
  } as Response;
}

// Test implementation of BaseHttpClient
class TestClient extends BaseHttpClient {
  constructor(baseUrl: string) {
    super({ baseUrl });
  }

  public async testGet<T = unknown>(path: string, params?: Record<string, string | number | boolean>) {
    return this.get<T>(path, params);
  }

  public async testPost<T = unknown>(path: string, body?: unknown) {
    return this.post<T>(path, body);
  }

  public testBuildUrl(path: string, params?: Record<string, string | number | boolean>) {
    return this.buildUrl(path, params);
  }
}

describe('BaseHttpClient', () => {
  let client: TestClient;

  beforeEach(() => {
    fetchMock.enableMocks();
    client = new TestClient('https://api.example.com');
    fetchMock.resetMocks();
  });

  afterEach(() => {
    fetchMock.resetMocks();
  });

  describe('buildUrl', () => {
    it('should build URL with no parameters', () => {
      const url = client.testBuildUrl('/test');
      expect(url).toBe('https://api.example.com/test');
    });

    it('should build URL with query parameters', () => {
      const url = client.testBuildUrl('/test', { q: 'search', max: 10 });
      expect(url).toBe('https://api.example.com/test?q=search&max=10');
    });

    it('should handle boolean parameters', () => {
      const url = client.testBuildUrl('/test', { enabled: true });
      expect(url).toBe('https://api.example.com/test?enabled=true');
    });

    it('should filter out undefined and null parameters', () => {
      const url = client.testBuildUrl('/test', {
        valid: 'yes',
        invalid: undefined as unknown as string,
        alsoInvalid: null as unknown as string,
      });
      expect(url).toBe('https://api.example.com/test?valid=yes');
    });

    it('should URL encode parameter values', () => {
      const url = client.testBuildUrl('/test', { q: 'hello world' });
      expect(url).toBe('https://api.example.com/test?q=hello%20world');
    });

    it('should handle paths with leading slash', () => {
      const url = client.testBuildUrl('/test');
      expect(url).toBe('https://api.example.com/test');
    });

    it('should handle paths without leading slash', () => {
      const url = client.testBuildUrl('test');
      expect(url).toBe('https://api.example.com/test');
    });

    it('should remove trailing slash from base URL', () => {
      const clientWithSlash = new TestClient('https://api.example.com/');
      const url = clientWithSlash.testBuildUrl('/test');
      expect(url).toBe('https://api.example.com/test');
    });
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockData = { success: true, message: 'Hello' };
      const mockResponse = createMockResponse(mockData);

      fetchMock.mockResolvedValueOnce(mockResponse);

      const response = await client.testGet('/test');

      expect(response.data).toEqual(mockData);
      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should include query parameters in GET request', async () => {
      const mockResponse = createMockResponse({ success: true });

      fetchMock.mockResolvedValueOnce(mockResponse);

      await client.testGet('/test', { q: 'search', max: 10 });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('?q=search&max=10');
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request with JSON body', async () => {
      const mockData = { success: true };
      const mockResponse = createMockResponse(mockData);

      fetchMock.mockResolvedValueOnce(mockResponse);

      const requestBody = { name: 'Test', value: 123 };
      const response = await client.testPost('/test', requestBody);

      expect(response.data).toEqual(mockData);
      const callOptions = fetchMock.mock.calls[0][1];
      expect(callOptions?.method).toBe('POST');
      expect(callOptions?.body).toBe(JSON.stringify(requestBody));
    });
  });

  describe('Error Handling', () => {
    it('should throw HttpClientError on HTTP 404', async () => {
      const mockResponse = createMockResponse(
        { error: 'Not found' },
        404,
        'Not Found'
      );

      fetchMock.mockResolvedValueOnce(mockResponse);

      await expect(client.testGet('/test')).rejects.toThrow(HttpClientError);

      // Re-mock for second assertion
      fetchMock.mockResolvedValueOnce(createMockResponse({ error: 'Not found' }, 404, 'Not Found'));
      await expect(client.testGet('/test')).rejects.toThrow('HTTP 404');
    });

    it('should throw HttpClientError on HTTP 500', async () => {
      const mockResponse = createMockResponse(
        { error: 'Server error' },
        500,
        'Internal Server Error'
      );

      fetchMock.mockResolvedValueOnce(mockResponse);

      await expect(client.testGet('/test')).rejects.toThrow(HttpClientError);
    });

    it('should throw HttpClientError on network error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network failure'));

      await expect(client.testGet('/test')).rejects.toThrow(HttpClientError);

      // Re-mock for second assertion
      fetchMock.mockRejectedValueOnce(new Error('Network failure'));
      await expect(client.testGet('/test')).rejects.toThrow('Request failed');
    });

    it('should include status code in error', async () => {
      const mockResponse = createMockResponse(
        { error: 'Bad request' },
        400,
        'Bad Request'
      );

      fetchMock.mockResolvedValueOnce(mockResponse);

      try {
        await client.testGet('/test');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpClientError);
        expect((error as HttpClientError).statusCode).toBe(400);
      }
    });
  });

  describe('Content Type Handling', () => {
    it('should parse JSON responses', async () => {
      const mockData = { key: 'value' };
      const mockResponse = createMockResponse(mockData, 200, 'OK', 'application/json');

      fetchMock.mockResolvedValueOnce(mockResponse);

      const response = await client.testGet('/test');
      expect(response.data).toEqual(mockData);
    });

    it('should handle plain text responses', async () => {
      const mockResponse = createMockResponse(
        'Plain text response',
        200,
        'OK',
        'text/plain'
      );

      fetchMock.mockResolvedValueOnce(mockResponse);

      const response = await client.testGet('/test');
      expect(response.data).toBe('Plain text response');
    });
  });
});
