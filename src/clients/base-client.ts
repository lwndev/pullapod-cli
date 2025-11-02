/**
 * Base HTTP client for API interactions
 * Provides common functionality for all API clients
 */

export interface HttpClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
}

export class HttpClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'HttpClientError';
  }
}

/**
 * Abstract base class for HTTP clients
 * Provides common HTTP methods with error handling
 */
export abstract class BaseHttpClient {
  protected baseUrl: string;
  protected defaultHeaders: Record<string, string>;
  protected timeout: number;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = config.headers || {};
    this.timeout = config.timeout || 30000; // 30 second default
  }

  /**
   * Perform a GET request
   */
  protected async get<T = any>(
    path: string,
    params?: Record<string, string | number | boolean>,
    headers?: Record<string, string>
  ): Promise<HttpResponse<T>> {
    const url = this.buildUrl(path, params);
    return this.request<T>('GET', url, undefined, headers);
  }

  /**
   * Perform a POST request
   */
  protected async post<T = any>(
    path: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<HttpResponse<T>> {
    const url = this.buildUrl(path);
    return this.request<T>('POST', url, body, headers);
  }

  /**
   * Build full URL with query parameters
   */
  protected buildUrl(
    path: string,
    params?: Record<string, string | number | boolean>
  ): string {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const queryString = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');

    return queryString ? `${url}?${queryString}` : url;
  }

  /**
   * Make HTTP request with timeout and error handling
   */
  protected async request<T = any>(
    method: string,
    url: string,
    body?: any,
    additionalHeaders?: Record<string, string>
  ): Promise<HttpResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers = {
        ...this.defaultHeaders,
        ...additionalHeaders,
      };

      // Add Content-Type for POST requests with body
      if (body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      const options: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body) {
        options.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(url, options);

      clearTimeout(timeoutId);

      // Parse response body
      let data: T;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        data = (await response.json()) as T;
      } else {
        data = (await response.text()) as T;
      }

      // Handle HTTP errors
      if (!response.ok) {
        throw new HttpClientError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          data
        );
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof HttpClientError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new HttpClientError(`Request timeout after ${this.timeout}ms`);
        }
        throw new HttpClientError(`Request failed: ${error.message}`);
      }

      throw new HttpClientError('Unknown error occurred during request');
    }
  }
}
