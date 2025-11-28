/**
 * TypeScript types for Podcast Index API
 * Based on https://podcastindex-org.github.io/docs-api/
 */

/**
 * Common response wrapper for Podcast Index API
 */
export interface PodcastIndexResponse<T> {
  status: string;
  feeds?: T[];
  items?: T[];
  feed?: T;
  episodes?: PodcastEpisode[];
  count?: number;
  query?: string;
  description?: string;
}

/**
 * Podcast feed information
 */
export interface PodcastFeed {
  id: number;
  title: string;
  url: string;
  originalUrl: string;
  link: string;
  description: string;
  author: string;
  ownerName: string;
  image: string;
  artwork: string;
  lastUpdateTime: number;
  lastCrawlTime: number;
  lastParseTime: number;
  lastGoodHttpStatusTime: number;
  lastHttpStatus: number;
  contentType: string;
  itunesId?: number;
  generator?: string;
  language: string;
  type: number;
  dead: number;
  crawlErrors: number;
  parseErrors: number;
  categories: Record<string, string>;
  locked: number;
  explicit: boolean;
  podcastGuid?: string;
  medium?: string;
  episodeCount?: number;
  imageUrlHash?: number;
  newestItemPublishTime?: number;
}

/**
 * Podcast episode information
 */
export interface PodcastEpisode {
  id: number;
  title: string;
  link: string;
  description: string;
  guid: string;
  datePublished: number;
  datePublishedPretty: string;
  dateCrawled: number;
  enclosureUrl: string;
  enclosureType: string;
  enclosureLength: number;
  duration: number;
  explicit: number;
  episode?: number;
  episodeType?: string;
  season?: number;
  image: string;
  feedItunesId?: number;
  feedImage: string;
  feedId: number;
  feedTitle: string;
  feedLanguage: string;
}

/**
 * Search parameters for podcasts
 */
export interface PodcastSearchParams {
  q: string; // Search query
  val?: string; // Only returns feeds with a value block
  aponly?: boolean; // Only return feeds with Podcast Index as source
  clean?: boolean; // Only return clean/family-friendly feeds
  fulltext?: boolean; // Return full text of episodes
  max?: number; // Maximum results (default: 10, max: 1000)
}

/**
 * Parameters for searching podcasts by title
 */
export interface PodcastByTitleParams {
  q: string; // Title to search for
  val?: string; // Filter by value block
  clean?: boolean; // Only clean feeds
  fulltext?: boolean; // Return full text
  similar?: boolean; // Include similar matches
  max?: number; // Maximum results
}

/**
 * Parameters for fetching episodes by feed ID
 */
export interface EpisodesByFeedIdParams {
  id: number; // Feed ID
  since?: number; // Unix timestamp - only episodes since this time
  max?: number; // Maximum episodes to return
  fulltext?: boolean; // Return full description text
}

/**
 * Parameters for fetching episodes by feed URL
 */
export interface EpisodesByFeedUrlParams {
  url: string; // Feed URL
  since?: number; // Unix timestamp
  max?: number; // Maximum episodes
  fulltext?: boolean; // Full text
}

/**
 * Parameters for recent episodes
 */
export interface RecentEpisodesParams {
  max?: number; // Maximum results (default: 10, max: 1000)
  excludeString?: string; // Exclude episodes with this string in title
  before?: number; // Unix timestamp - episodes before this time
  fulltext?: boolean; // Return full text
}

/**
 * Parameters for recent feeds
 */
export interface RecentFeedsParams {
  max?: number; // Maximum results (default: 10, max: 1000)
  since?: number; // Unix timestamp - feeds added since this time
  cat?: string; // Category filter
  lang?: string; // Language filter (e.g., 'en')
  notcat?: string; // Exclude category
}

/**
 * Parameters for trending podcasts
 */
export interface TrendingParams {
  max?: number; // Maximum results (default: 10, max: 1000)
  since?: number; // Unix timestamp
  lang?: string; // Language filter
  cat?: string; // Category filter
  notcat?: string; // Exclude category
}

/**
 * Podcast Index API statistics
 */
export interface PodcastIndexStats {
  feedCountTotal: number;
  episodeCountTotal: number;
  feedsWithNewEpisodes3days: number;
  feedsWithNewEpisodes10days: number;
  feedsWithNewEpisodes30days: number;
  feedsWithNewEpisodes90days: number;
  feedsWithValueBlocks: number;
}

/**
 * Category information
 */
export interface Category {
  id: number;
  name: string;
}

/**
 * Value block information for Value4Value
 */
export interface ValueBlock {
  model: {
    type: string;
    method: string;
    suggested: string;
  };
  destinations: Array<{
    name: string;
    type: string;
    address: string;
    split: number;
    fee?: boolean;
  }>;
}
