/**
 * Recent command implementation
 * Allows users to view recent episodes across all saved favorite podcasts
 */

import { Command } from 'commander';
import { PodcastIndexClient } from '../clients/podcast-index-client';
import { PodcastEpisode } from '../clients/podcast-index-types';
import { loadConfig } from '../config';
import { listFavorites, FavoriteFeed } from '../storage/favorites';
import { formatErrorMessage, isNetworkError, AppError, ErrorCode } from '../utils/errors';
import {
  FeedFetchResult,
  formatRecentOutput,
  formatNoFavorites,
  formatFeedNotFound,
  formatLargeFavoritesWarning,
} from '../formatters/recent-formatter';

/**
 * Options for the recent command
 */
export interface RecentOptions {
  max?: string;
  days?: string;
  feed?: string;
}

/**
 * Maximum concurrent API requests
 */
const MAX_CONCURRENT_REQUESTS = 5;

/**
 * Delay between batches to respect API rate limits (milliseconds)
 */
const BATCH_DELAY_MS = 100;

/**
 * Default values for options
 */
const DEFAULT_MAX_EPISODES = 5;
const DEFAULT_DAYS = 7;

/**
 * Option ranges
 */
const MAX_EPISODES_MIN = 1;
const MAX_EPISODES_MAX = 20;
const DAYS_MIN = 1;
const DAYS_MAX = 90;

/**
 * Large favorites list threshold
 */
const LARGE_FAVORITES_THRESHOLD = 20;

/**
 * Threshold for showing progress indication during fetch
 */
const PROGRESS_THRESHOLD = 10;

/**
 * Initialize Podcast Index client
 */
function initializeClient(): PodcastIndexClient {
  const config = loadConfig();
  if (!config.podcastIndex.apiKey || !config.podcastIndex.apiSecret) {
    console.error('Error: Podcast Index API credentials not configured.');
    console.error(
      'Please set PODCAST_INDEX_API_KEY and PODCAST_INDEX_API_SECRET environment variables.'
    );
    console.error('You can get API keys at https://api.podcastindex.org/');
    process.exit(1);
  }

  return new PodcastIndexClient({
    apiKey: config.podcastIndex.apiKey,
    apiSecret: config.podcastIndex.apiSecret,
  });
}

/**
 * Validate and parse numeric option within range
 */
function parseNumericOption(
  value: string | undefined,
  defaultValue: number,
  min: number,
  max: number,
  optionName: string
): number {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    console.error(`Error: ${optionName} must be a number`);
    process.exit(1);
  }

  if (parsed < min || parsed > max) {
    console.error(`Error: ${optionName} must be between ${min} and ${max}`);
    process.exit(1);
  }

  return parsed;
}

/**
 * Find favorite feed by name (case-insensitive, partial match)
 */
function findFeedByName(feeds: FavoriteFeed[], query: string): FavoriteFeed | null {
  const queryLower = query.toLowerCase();

  // Check for exact match first (case-insensitive)
  const exactMatch = feeds.find((f) => f.name.toLowerCase() === queryLower);
  if (exactMatch) {
    return exactMatch;
  }

  // Check for partial match
  const partialMatches = feeds.filter((f) => f.name.toLowerCase().includes(queryLower));

  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  if (partialMatches.length > 1) {
    console.error(`Multiple feeds match "${query}":`);
    for (const feed of partialMatches) {
      console.error(`  - ${feed.name}`);
    }
    console.error('\nPlease be more specific.');
    process.exit(1);
  }

  return null;
}

/**
 * Fetch episodes from a single feed with error handling
 */
async function fetchFeedEpisodes(
  client: PodcastIndexClient,
  feed: FavoriteFeed,
  maxEpisodes: number,
  sinceTimestamp: number
): Promise<FeedFetchResult> {
  try {
    const response = await client.getEpisodesByFeedId({
      id: feed.feedId,
      max: maxEpisodes,
      since: sinceTimestamp,
    });

    const episodes: PodcastEpisode[] = response.items || [];

    return {
      feed,
      episodes,
    };
  } catch (error) {
    // Handle specific error types
    if (isNetworkError(error)) {
      return {
        feed,
        episodes: [],
        error: 'Network error',
      };
    }

    if (error instanceof AppError) {
      if (error.code === ErrorCode.API_RATE_LIMIT) {
        return {
          feed,
          episodes: [],
          error: 'Rate limited',
        };
      }
    }

    return {
      feed,
      episodes: [],
      error: formatErrorMessage(error),
    };
  }
}

/**
 * Fetch episodes from multiple feeds with concurrency limit
 */
async function fetchAllFeedsWithConcurrency(
  client: PodcastIndexClient,
  feeds: FavoriteFeed[],
  maxEpisodes: number,
  sinceTimestamp: number,
  showProgress = false
): Promise<FeedFetchResult[]> {
  const results: FeedFetchResult[] = [];
  const queue = [...feeds];
  const totalFeeds = feeds.length;

  // Process feeds in batches of MAX_CONCURRENT_REQUESTS
  while (queue.length > 0) {
    const batch = queue.splice(0, MAX_CONCURRENT_REQUESTS);
    const batchPromises = batch.map((feed) =>
      fetchFeedEpisodes(client, feed, maxEpisodes, sinceTimestamp)
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Show progress for large fetch operations
    if (showProgress) {
      const completed = results.length;
      process.stdout.write(`\r  Progress: ${completed}/${totalFeeds} feeds fetched...`);
    }

    // Add small delay between batches to respect API rate limits
    if (queue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // Clear progress line if shown
  if (showProgress) {
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
  }

  return results;
}

/**
 * Execute recent command
 */
export async function recentCommand(options: RecentOptions): Promise<void> {
  try {
    // Parse and validate options
    const maxEpisodes = parseNumericOption(
      options.max,
      DEFAULT_MAX_EPISODES,
      MAX_EPISODES_MIN,
      MAX_EPISODES_MAX,
      '--max'
    );

    const days = parseNumericOption(options.days, DEFAULT_DAYS, DAYS_MIN, DAYS_MAX, '--days');

    // Load favorites
    let favorites: FavoriteFeed[];
    try {
      favorites = listFavorites();
    } catch (error) {
      console.error('\nError:', formatErrorMessage(error));
      process.exit(1);
    }

    // Check if favorites exist
    if (favorites.length === 0) {
      console.log(formatNoFavorites());
      process.exit(1);
    }

    // Filter by feed name if specified
    let feedsToFetch = favorites;
    if (options.feed) {
      const matchedFeed = findFeedByName(favorites, options.feed);
      if (!matchedFeed) {
        console.error(formatFeedNotFound(options.feed, favorites));
        process.exit(1);
      }
      feedsToFetch = [matchedFeed];
    }

    // Warn about large favorites list
    if (feedsToFetch.length > LARGE_FAVORITES_THRESHOLD) {
      console.log(formatLargeFavoritesWarning(feedsToFetch.length));
    }

    // Initialize client
    const client = initializeClient();

    // Calculate since timestamp
    const sinceTimestamp = Math.floor(Date.now() / 1000) - days * 86400;

    // Fetch episodes from all feeds
    const showProgress = feedsToFetch.length > PROGRESS_THRESHOLD;
    console.log(`Fetching recent episodes from ${feedsToFetch.length} podcast(s)...`);

    const results = await fetchAllFeedsWithConcurrency(
      client,
      feedsToFetch,
      maxEpisodes,
      sinceTimestamp,
      showProgress
    );

    // Check if all feeds failed
    const allFailed = results.every((r) => r.error);
    if (allFailed && results.length > 0) {
      console.error('\nError: Could not fetch episodes from any feeds.');
      console.error('Please check your internet connection and try again.');

      // Show individual errors in debug mode
      if (process.env.DEBUG) {
        for (const result of results) {
          if (result.error) {
            console.error(`  - ${result.feed.name}: ${result.error}`);
          }
        }
      }

      process.exit(1);
    }

    // Format and display output
    const output = formatRecentOutput(results, days, options.feed);
    console.log('\n' + output);

    process.exit(0);
  } catch (error) {
    // Handle network errors at top level
    if (isNetworkError(error)) {
      console.error('\nNetwork Error: Unable to reach Podcast Index API');
      console.error('Please check your internet connection and try again.');
      process.exit(1);
    }

    console.error('\nError:', formatErrorMessage(error));
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

/**
 * Register recent command with Commander
 */
export function registerRecentCommand(program: Command): void {
  program
    .command('recent')
    .description('Show recent episodes from your saved podcasts')
    .option('--max <number>', `Max episodes per feed (${MAX_EPISODES_MIN}-${MAX_EPISODES_MAX})`, String(DEFAULT_MAX_EPISODES))
    .option('--days <number>', `Only episodes from last N days (${DAYS_MIN}-${DAYS_MAX})`, String(DEFAULT_DAYS))
    .option('--feed <name>', 'Show recent episodes from specific saved feed only')
    .action(recentCommand);
}
