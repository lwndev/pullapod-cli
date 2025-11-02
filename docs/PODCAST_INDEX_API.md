# Podcast Index API Client

This document provides comprehensive information about using the Podcast Index API client in pullapod-cli.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [API Methods](#api-methods)
  - [Search](#search)
  - [Podcasts](#podcasts)
  - [Episodes](#episodes)
  - [Recent](#recent)
  - [Stats & Categories](#stats--categories)
  - [Hub & Add](#hub--add)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Overview

The Podcast Index API client provides a TypeScript interface to the [Podcast Index API](https://podcastindex-org.github.io/docs-api/), a comprehensive directory of podcast feeds and episodes. The API allows you to search for podcasts, retrieve feed information, access episodes, and discover new content.

**Base URL**: `https://api.podcastindex.org/api/1.0`

## Getting Started

### Prerequisites

1. Register for a free API key at https://api.podcastindex.org/
2. You will receive an API key and secret

### Environment Variables

Set the following environment variables:

```bash
export PODCAST_INDEX_API_KEY="your-api-key"
export PODCAST_INDEX_API_SECRET="your-api-secret"

# Optional: Override the base URL (defaults to https://api.podcastindex.org/api/1.0)
export PODCAST_INDEX_BASE_URL="https://api.podcastindex.org/api/1.0"
```

### Basic Usage

```typescript
import { PodcastIndexClient } from './clients';
import { loadPodcastIndexConfig } from './config';

// Load configuration from environment variables
const config = loadPodcastIndexConfig();

// Create client instance
const client = new PodcastIndexClient({
  apiKey: config.apiKey,
  apiSecret: config.apiSecret,
  baseUrl: config.baseUrl,
  userAgent: 'pullapod/1.0', // Optional, defaults to 'pullapod/1.0'
});

// Use the client
const results = await client.searchByTerm({ q: 'javascript' });
```

## Authentication

The Podcast Index API uses **Amazon-style request authorization** with SHA-1 hashing. The client handles authentication automatically by including these headers with each request:

- `User-Agent`: Application identifier (e.g., "pullapod/1.0")
- `X-Auth-Key`: Your API key
- `X-Auth-Date`: Current UTC unix timestamp (must be within 3 minutes)
- `Authorization`: SHA-1 hash of `apiKey + apiSecret + timestamp`

The authentication is handled automatically by the client - you don't need to manage these headers manually.

## API Methods

### Search

#### searchByTerm(params)

Search for podcasts by term (searches title, author, description).

```typescript
const results = await client.searchByTerm({
  q: 'javascript',      // Required: search query
  max: 10,              // Optional: max results (1-1000, default: 10)
  val: 'lightning',     // Optional: only feeds with value block
  aponly: true,         // Optional: Podcast Index sourced only
  clean: false,         // Optional: family-friendly only
  fulltext: true,       // Optional: return full descriptions
});
```

#### searchByTitle(params)

Search for podcasts by title only (more precise than searchByTerm).

```typescript
const results = await client.searchByTitle({
  q: 'The Daily',       // Required: title to search
  similar: true,        // Optional: include similar matches
  max: 10,              // Optional: max results
  fulltext: true,       // Optional: full descriptions
});
```

### Podcasts

#### getPodcastById(id)

Get podcast feed information by Podcast Index ID.

```typescript
const podcast = await client.getPodcastById(920666);
```

#### getPodcastByUrl(url)

Get podcast feed information by RSS feed URL.

```typescript
const podcast = await client.getPodcastByUrl(
  'https://feeds.example.com/podcast.xml'
);
```

#### getPodcastByItunesId(itunesId)

Get podcast feed information by iTunes ID.

```typescript
const podcast = await client.getPodcastByItunesId(1234567890);
```

#### getPodcastByGuid(guid)

Get podcast feed information by podcast GUID.

```typescript
const podcast = await client.getPodcastByGuid(
  '917393e3-1382-5c6e-8f7e-facf67af2d10'
);
```

#### getTrending(params)

Get trending podcasts.

```typescript
const trending = await client.getTrending({
  max: 20,              // Optional: max results
  since: 1609459200,    // Optional: unix timestamp
  lang: 'en',           // Optional: language filter
  cat: 'Technology',    // Optional: category filter
  notcat: 'News',       // Optional: exclude category
});
```

### Episodes

#### getEpisodesByFeedId(params)

Get episodes for a specific podcast feed ID.

```typescript
const episodes = await client.getEpisodesByFeedId({
  id: 920666,           // Required: feed ID
  max: 50,              // Optional: max episodes
  since: 1609459200,    // Optional: unix timestamp - only episodes after
  fulltext: true,       // Optional: full description text
});
```

#### getEpisodesByFeedUrl(params)

Get episodes for a specific podcast feed URL.

```typescript
const episodes = await client.getEpisodesByFeedUrl({
  url: 'https://feeds.example.com/podcast.xml',
  max: 50,
  since: 1609459200,
  fulltext: true,
});
```

#### getEpisodeById(id)

Get a specific episode by ID.

```typescript
const episode = await client.getEpisodeById(12345678);
```

#### getEpisodeByGuid(guid, feedUrl?)

Get a specific episode by GUID.

```typescript
const episode = await client.getEpisodeByGuid(
  'episode-guid-123',
  'https://feeds.example.com/podcast.xml' // Optional: for disambiguation
);
```

#### getRandomEpisodes(max, lang?, cat?)

Get random episodes from the index.

```typescript
const random = await client.getRandomEpisodes(
  5,              // Number of episodes
  'en',           // Optional: language filter
  'Technology'    // Optional: category filter
);
```

### Recent

#### getRecentEpisodes(params)

Get recently published episodes across all podcasts.

```typescript
const recent = await client.getRecentEpisodes({
  max: 20,                    // Optional: max results
  excludeString: 'trailer',   // Optional: exclude episodes with this in title
  before: 1609459200,         // Optional: episodes before this timestamp
  fulltext: true,             // Optional: full description
});
```

#### getRecentFeeds(params)

Get recently added podcast feeds.

```typescript
const recentFeeds = await client.getRecentFeeds({
  max: 20,              // Optional: max results
  since: 1609459200,    // Optional: feeds added since timestamp
  lang: 'en',           // Optional: language filter
  cat: 'Technology',    // Optional: category filter
  notcat: 'News',       // Optional: exclude category
});
```

#### getNewFeeds(params)

Get newly added podcast feeds (alias for getRecentFeeds with different endpoint).

```typescript
const newFeeds = await client.getNewFeeds({
  max: 20,
  since: 1609459200,
});
```

### Stats & Categories

#### getStats()

Get current Podcast Index statistics.

```typescript
const stats = await client.getStats();
console.log(`Total feeds: ${stats.feedCountTotal}`);
console.log(`Total episodes: ${stats.episodeCountTotal}`);
```

#### getCategories()

Get list of available podcast categories.

```typescript
const categories = await client.getCategories();
categories.feeds.forEach(cat => {
  console.log(`${cat.id}: ${cat.name}`);
});
```

### Hub & Add

#### notifyFeedUpdate(feedUrl)

Notify the index that a podcast feed has been updated.

```typescript
await client.notifyFeedUpdate('https://feeds.example.com/podcast.xml');
```

#### addFeed(feedUrl)

Add a new podcast feed to the index (requires appropriate API permissions).

```typescript
const result = await client.addFeed('https://feeds.example.com/new-podcast.xml');
```

## Error Handling

The client throws `HttpClientError` for HTTP errors. Always wrap API calls in try-catch blocks:

```typescript
import { HttpClientError } from './clients';

try {
  const results = await client.searchByTerm({ q: 'javascript' });
  console.log(`Found ${results.count} podcasts`);
} catch (error) {
  if (error instanceof HttpClientError) {
    console.error(`API Error: ${error.message}`);
    console.error(`Status Code: ${error.statusCode}`);
    console.error(`Response: ${JSON.stringify(error.response)}`);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

Common error scenarios:

- **401 Unauthorized**: Invalid API key or secret
- **400 Bad Request**: Invalid parameters
- **429 Too Many Requests**: Rate limit exceeded
- **Timeout**: Request took longer than 30 seconds (default timeout)

## Examples

### Example 1: Search and Download Episodes

```typescript
import { PodcastIndexClient } from './clients';
import { loadPodcastIndexConfig } from './config';

async function findAndDownloadPodcast() {
  const config = loadPodcastIndexConfig();
  const client = new PodcastIndexClient(config);

  // Search for a podcast
  const searchResults = await client.searchByTitle({
    q: 'JavaScript Jabber',
    max: 1,
  });

  if (searchResults.feeds && searchResults.feeds.length > 0) {
    const podcast = searchResults.feeds[0];
    console.log(`Found: ${podcast.title}`);
    console.log(`Feed URL: ${podcast.url}`);

    // Get recent episodes
    const episodes = await client.getEpisodesByFeedId({
      id: podcast.id,
      max: 10,
    });

    console.log(`\nRecent episodes:`);
    episodes.items?.forEach(ep => {
      console.log(`- ${ep.title}`);
      console.log(`  Published: ${ep.datePublishedPretty}`);
      console.log(`  Download: ${ep.enclosureUrl}`);
    });
  }
}
```

### Example 2: Discover New Podcasts

```typescript
async function discoverNewPodcasts() {
  const config = loadPodcastIndexConfig();
  const client = new PodcastIndexClient(config);

  // Get trending tech podcasts
  const trending = await client.getTrending({
    max: 10,
    lang: 'en',
    cat: 'Technology',
  });

  console.log('Trending Technology Podcasts:');
  trending.feeds?.forEach((feed, index) => {
    console.log(`\n${index + 1}. ${feed.title}`);
    console.log(`   by ${feed.author}`);
    console.log(`   ${feed.description.substring(0, 100)}...`);
    console.log(`   Episodes: ${feed.episodeCount}`);
  });
}
```

### Example 3: Monitor Recent Episodes

```typescript
async function monitorRecentEpisodes() {
  const config = loadPodcastIndexConfig();
  const client = new PodcastIndexClient(config);

  // Get episodes from the last 24 hours
  const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;

  const recent = await client.getRecentEpisodes({
    max: 50,
    excludeString: 'trailer',
  });

  console.log('Recent Episodes:');
  recent.items?.forEach(episode => {
    const publishDate = new Date(episode.datePublished * 1000);
    console.log(`\n${episode.feedTitle} - ${episode.title}`);
    console.log(`Published: ${publishDate.toLocaleString()}`);
    console.log(`Duration: ${Math.floor(episode.duration / 60)} minutes`);
  });
}
```

### Example 4: Get Podcast Statistics

```typescript
async function showIndexStats() {
  const config = loadPodcastIndexConfig();
  const client = new PodcastIndexClient(config);

  const stats = await client.getStats();

  console.log('Podcast Index Statistics:');
  console.log(`Total Feeds: ${stats.feedCountTotal.toLocaleString()}`);
  console.log(`Total Episodes: ${stats.episodeCountTotal.toLocaleString()}`);
  console.log(`Active Feeds (3 days): ${stats.feedsWithNewEpisodes3days.toLocaleString()}`);
  console.log(`Active Feeds (30 days): ${stats.feedsWithNewEpisodes30days.toLocaleString()}`);
  console.log(`Feeds with Value Blocks: ${stats.feedsWithValueBlocks.toLocaleString()}`);
}
```

## API Rate Limits

The Podcast Index API has rate limits to ensure fair usage. If you exceed the rate limit, you'll receive a 429 error. Best practices:

- Cache results when possible
- Implement exponential backoff for retries
- Use appropriate `max` parameters to limit result sizes
- Consider the `since` parameter to fetch only new data

## Additional Resources

- [Official API Documentation](https://podcastindex-org.github.io/docs-api/)
- [Podcast Index GitHub](https://github.com/Podcastindex-org)
- [API OpenAPI Specification](https://podcastindex-org.github.io/docs-api/pi_api.json)
- [Podcast Index Homepage](https://podcastindex.org/)

## Support

For issues with the Podcast Index API itself:
- Visit https://podcastindex.org/
- Check the official documentation
- Contact the Podcast Index team

For issues with this client implementation:
- Open an issue in the pullapod-cli repository
- Refer to the test files for usage examples
