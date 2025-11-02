# API Clients Architecture

This document describes the extensible API client architecture in pullapod-cli.

## Overview

The pullapod-cli project includes an extensible client architecture designed to support multiple podcast-related APIs. The architecture consists of:

1. **Base HTTP Client** - Abstract base class with common HTTP functionality
2. **Configuration Management** - Environment variable handling and validation
3. **Type-Safe Interfaces** - TypeScript types for all API responses
4. **Individual Clients** - Specific implementations for each API

## Architecture

### Directory Structure

```
src/
├── clients/                          # API clients
│   ├── base-client.ts               # Abstract HTTP client
│   ├── podcast-index-client.ts      # Podcast Index API implementation
│   ├── podcast-index-types.ts       # TypeScript types for Podcast Index
│   └── index.ts                     # Client exports
├── config/                           # Configuration
│   ├── env-config.ts                # Environment variable handling
│   └── index.ts                     # Config exports
docs/
└── PODCAST_INDEX_API.md             # Podcast Index API documentation
examples/
└── podcast-index-example.ts         # Usage examples
```

### Base HTTP Client

The `BaseHttpClient` abstract class provides:

- **HTTP Methods**: GET, POST with proper error handling
- **Query Parameter Building**: Automatic URL construction with parameters
- **Timeout Support**: Configurable request timeouts (default: 30s)
- **Error Handling**: Structured error responses with `HttpClientError`
- **Content Type Handling**: Automatic JSON/text parsing

```typescript
import { BaseHttpClient, HttpClientConfig } from './clients/base-client';

class MyAPIClient extends BaseHttpClient {
  constructor(apiKey: string) {
    super({
      baseUrl: 'https://api.example.com',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
  }

  async getData() {
    return this.get('/data', { param: 'value' });
  }
}
```

### Configuration Management

Environment variables are managed through the config module:

```typescript
import {
  getRequiredEnv,
  getOptionalEnv,
  loadPodcastIndexConfig
} from './config';

// Get required environment variable (throws if missing)
const apiKey = getRequiredEnv('API_KEY');

// Get optional with default
const baseUrl = getOptionalEnv('BASE_URL', 'https://api.default.com');

// Load complete configuration
const config = loadPodcastIndexConfig();
```

## Available Clients

### Podcast Index API Client

Full implementation of the [Podcast Index API](https://podcastindex-org.github.io/docs-api/).

**Features:**
- Amazon-style SHA-1 authentication
- Search for podcasts by term, title, person
- Retrieve podcast feeds by ID, URL, iTunes ID, GUID
- Access episodes by various criteria
- Get trending podcasts and recent episodes
- Access statistics and categories
- Notify feed updates and add new feeds

**Setup Option 1: Using .env file (Recommended):**

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```bash
   PODCAST_INDEX_API_KEY=your-api-key-here
   PODCAST_INDEX_API_SECRET=your-api-secret-here
   ```

3. Use in code:
   ```typescript
   import { PodcastIndexClient } from './clients';
   import { loadPodcastIndexConfig, loadEnvFile } from './config';

   // Load .env file
   loadEnvFile();

   // Load configuration and create client
   const config = loadPodcastIndexConfig();
   const client = new PodcastIndexClient(config);

   // Search for podcasts
   const results = await client.searchByTerm({ q: 'javascript', max: 10 });

   // Get trending
   const trending = await client.getTrending({ lang: 'en', max: 20 });

   // Get episodes
   const episodes = await client.getEpisodesByFeedId({ id: 920666, max: 50 });
   ```

**Setup Option 2: Using environment variables directly:**

```bash
export PODCAST_INDEX_API_KEY="your-key"
export PODCAST_INDEX_API_SECRET="your-secret"
```

Then use without calling `loadEnvFile()`:
```typescript
import { PodcastIndexClient } from './clients';
import { loadPodcastIndexConfig } from './config';

const client = new PodcastIndexClient(loadPodcastIndexConfig());
const results = await client.searchByTerm({ q: 'javascript', max: 10 });
```

See [PODCAST_INDEX_API.md](./PODCAST_INDEX_API.md) for complete documentation.

## Adding New API Clients

To add support for a new API:

### 1. Create Type Definitions

Create a new file `src/clients/your-api-types.ts`:

```typescript
export interface YourAPIResponse<T> {
  status: string;
  data: T;
}

export interface YourDataType {
  id: number;
  name: string;
  // ...
}
```

### 2. Implement Client Class

Create `src/clients/your-api-client.ts`:

```typescript
import { BaseHttpClient, HttpClientConfig } from './base-client';
import { YourAPIResponse, YourDataType } from './your-api-types';

export interface YourAPIClientConfig {
  apiKey: string;
  baseUrl?: string;
}

export class YourAPIClient extends BaseHttpClient {
  private apiKey: string;

  constructor(config: YourAPIClientConfig) {
    super({
      baseUrl: config.baseUrl || 'https://api.your-service.com',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });
    this.apiKey = config.apiKey;
  }

  async getData(id: number): Promise<YourAPIResponse<YourDataType>> {
    const response = await this.get<YourAPIResponse<YourDataType>>(
      `/data/${id}`,
      undefined,
      this.getAuthHeaders()
    );
    return response.data;
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }
}
```

### 3. Add Configuration Support

Update `src/config/env-config.ts`:

```typescript
export interface YourAPIConfig {
  apiKey: string;
  baseUrl: string;
}

export function loadYourAPIConfig(): YourAPIConfig {
  return {
    apiKey: getRequiredEnv('YOUR_API_KEY'),
    baseUrl: getOptionalEnv('YOUR_API_BASE_URL', 'https://api.your-service.com'),
  };
}
```

### 4. Export from Index

Update `src/clients/index.ts`:

```typescript
export * from './your-api-client';
export * from './your-api-types';
```

### 5. Add Documentation

Create `docs/YOUR_API.md` with:
- API overview and registration
- Authentication details
- Available methods
- Usage examples
- Error handling

### 6. Add Tests

Create `tests/your-api-client.test.ts`:

```typescript
import { YourAPIClient } from '../src/clients/your-api-client';

describe('YourAPIClient', () => {
  it('should authenticate correctly', async () => {
    // Test implementation
  });

  it('should fetch data', async () => {
    // Test implementation
  });
});
```

### 7. Add Example

Create `examples/your-api-example.ts` showing real-world usage.

## Error Handling

All clients throw `HttpClientError` for HTTP and network errors:

```typescript
import { HttpClientError } from './clients';

try {
  const data = await client.getData();
} catch (error) {
  if (error instanceof HttpClientError) {
    console.error(`HTTP ${error.statusCode}: ${error.message}`);
    console.error('Response:', error.response);
  }
}
```

## Testing

The project uses Jest with jest-fetch-mock for testing HTTP clients:

```typescript
import fetchMock from 'jest-fetch-mock';

beforeEach(() => {
  fetchMock.resetMocks();
});

it('should make API call', async () => {
  fetchMock.mockResponseOnce(JSON.stringify({ success: true }));
  const result = await client.getData();
  expect(result.success).toBe(true);
});
```

## Best Practices

1. **Use Environment Variables**: Never hardcode API keys
2. **Type Everything**: Leverage TypeScript for type safety
3. **Handle Errors**: Always wrap API calls in try-catch
4. **Set Timeouts**: Configure appropriate timeouts for your use case
5. **Document Methods**: Add JSDoc comments to all public methods
6. **Test Thoroughly**: Write unit tests for all client methods
7. **Follow Patterns**: Maintain consistency with existing clients

## Examples

See the `examples/` directory for complete working examples:
- [examples/podcast-index-example.ts](../examples/podcast-index-example.ts) - Podcast Index API usage

## Resources

- [Podcast Index API Documentation](https://podcastindex-org.github.io/docs-api/)
- [Base Client Implementation](../src/clients/base-client.ts)
- [Configuration Management](../src/config/env-config.ts)
