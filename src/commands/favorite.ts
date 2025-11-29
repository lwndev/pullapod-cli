/**
 * Favorite command implementation
 * Allows users to manage a collection of bookmarked podcast feeds
 */

import { Command } from 'commander';
import * as readline from 'readline';
import { PodcastIndexClient } from '../clients/podcast-index-client';
import { loadConfig } from '../config';
import { validateUrl } from '../utils/validation';
import { formatErrorMessage, isNetworkError, AppError, ErrorCode } from '../utils/errors';
import {
  addFavorite,
  findFavoriteMatches,
  removeFavorite,
  clearFavorites,
  listFavorites,
  getFavoritesCount,
  FavoriteFeed,
} from '../storage/favorites';
import {
  formatFavoritesList,
  formatAddSuccess,
  formatAddDuplicate,
  formatRemoveConfirmation,
  formatRemoveSuccess,
  formatRemoveCancelled,
  formatMultipleMatches,
  formatNoMatches,
  formatClearConfirmation,
  formatClearSuccess,
  formatClearCancelled,
  formatClearEmpty,
} from '../formatters/favorite-formatter';

/**
 * Options for the add subcommand
 */
interface AddOptions {
  name?: string;
}

/**
 * Options for the clear subcommand
 */
interface ClearOptions {
  force?: boolean;
}

/**
 * Create a readline interface for user input
 */
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt user for confirmation
 */
async function promptConfirmation(prompt: string): Promise<string> {
  const rl = createReadlineInterface();
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

/**
 * Check if answer is affirmative
 */
function isAffirmative(answer: string): boolean {
  return answer === 'y' || answer === 'yes';
}

/**
 * Sanitize feed name to prevent display issues (Important #5)
 * Removes control characters, normalizes whitespace, and limits length
 */
function sanitizeFeedName(name: string): string {
  // Remove control characters (ASCII 0-31 and 127) using character code filtering
  // This approach avoids eslint no-control-regex rule violation
  let sanitized = '';
  for (const char of name) {
    const code = char.charCodeAt(0);
    // Keep only printable characters (exclude control chars 0-31 and DEL 127)
    if (code > 31 && code !== 127) {
      sanitized += char;
    }
  }

  return (
    sanitized
      // Normalize whitespace (multiple spaces/tabs/newlines to single space)
      .replace(/\s+/g, ' ')
      .trim()
      // Reasonable length limit
      .slice(0, 200)
  );
}

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
 * Execute add subcommand
 */
export async function addCommand(feedUrl: string, options: AddOptions): Promise<void> {
  try {
    // Validate URL format
    if (!validateUrl(feedUrl)) {
      console.error('Error: Invalid feed URL format');
      console.error('Example: pullapod favorite add https://example.com/feed.xml');
      process.exit(1);
    }

    // Initialize client and fetch feed info
    const client = initializeClient();
    console.log('Fetching feed information...');

    let response;
    try {
      response = await client.getPodcastByUrl(feedUrl);
    } catch (apiError) {
      // Network error handling (Important #4)
      if (isNetworkError(apiError)) {
        console.error('\nNetwork Error: Unable to reach Podcast Index API');
        console.error('Please check your internet connection and try again.');
        process.exit(1);
      }

      // Rate limiting check (Important #4)
      if (
        apiError instanceof AppError &&
        (apiError.code === ErrorCode.API_RATE_LIMIT ||
          (apiError.message && apiError.message.toLowerCase().includes('rate limit')))
      ) {
        console.error('\nRate Limit: Too many requests to Podcast Index API');
        console.error('Please wait a moment and try again.');
        process.exit(1);
      }

      throw apiError;
    }

    const feed = response.feed || (response.feeds && response.feeds[0]);

    if (!feed) {
      console.error('Error: Feed not found in Podcast Index');
      console.error('');
      console.error('Try searching for the podcast first:');
      console.error('  pullapod search <podcast name>');
      process.exit(1);
    }

    // Determine name to use and sanitize it (Important #5)
    const rawName = options.name || feed.title || feedUrl;
    const name = sanitizeFeedName(rawName);

    // Validate that name isn't empty after sanitization
    if (!name) {
      console.error('Error: Feed name cannot be empty');
      console.error('Please provide a valid name with --name option');
      process.exit(1);
    }

    // Create favorite entry
    const favorite: FavoriteFeed = {
      name,
      url: feed.url || feedUrl, // Use canonical URL from API if available
      feedId: feed.id,
      dateAdded: new Date().toISOString(),
    };

    // Attempt to add
    const result = addFavorite(favorite);

    if (!result.success) {
      console.error(formatAddDuplicate(result.existingFeed!));
      process.exit(1);
    }

    const totalCount = getFavoritesCount();
    console.log(formatAddSuccess(favorite, totalCount));
    process.exit(0);
  } catch (error) {
    // Additional network error handling at outer level (Important #4)
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
 * Execute list subcommand
 */
export async function listCommand(): Promise<void> {
  try {
    const feeds = listFavorites();
    console.log(formatFavoritesList(feeds));
    process.exit(0);
  } catch (error) {
    console.error('\nError:', formatErrorMessage(error));
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

/**
 * Execute remove subcommand
 */
export async function removeCommand(query: string): Promise<void> {
  try {
    const matches = findFavoriteMatches(query);

    if (matches.length === 0) {
      console.error(formatNoMatches(query));
      process.exit(1);
    }

    if (matches.length > 1) {
      console.error(formatMultipleMatches(matches));
      process.exit(1);
    }

    const feedToRemove = matches[0];

    // Skip confirmation if only one favorite exists
    const totalCount = getFavoritesCount();
    let shouldRemove = totalCount === 1;

    if (!shouldRemove) {
      const answer = await promptConfirmation(formatRemoveConfirmation(feedToRemove));
      shouldRemove = isAffirmative(answer);
    }

    if (!shouldRemove) {
      console.log(formatRemoveCancelled());
      process.exit(0);
    }

    const result = removeFavorite(feedToRemove);

    if (result.success) {
      console.log(formatRemoveSuccess(feedToRemove, result.remainingCount));
      process.exit(0);
    } else {
      console.error('Error: Failed to remove favorite');
      process.exit(1);
    }
  } catch (error) {
    console.error('\nError:', formatErrorMessage(error));
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

/**
 * Execute clear subcommand
 */
export async function clearCommand(options: ClearOptions): Promise<void> {
  try {
    const count = getFavoritesCount();

    if (count === 0) {
      console.log(formatClearEmpty());
      process.exit(0);
    }

    let shouldClear = options.force === true;

    if (!shouldClear) {
      const confirmPrompt = formatClearConfirmation(count);
      const answer = await promptConfirmation(confirmPrompt);
      shouldClear = answer === 'yes';
    }

    if (!shouldClear) {
      console.log(formatClearCancelled());
      process.exit(0);
    }

    const result = clearFavorites();
    console.log(formatClearSuccess(result.removedCount));
    process.exit(0);
  } catch (error) {
    console.error('\nError:', formatErrorMessage(error));
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

/**
 * Register favorite command with Commander
 */
export function registerFavoriteCommand(program: Command): void {
  const favorite = program
    .command('favorite')
    .description('Manage your favorite podcast feeds');

  // Add subcommand
  favorite
    .command('add')
    .description('Add a podcast feed to favorites')
    .argument('<feed-url>', 'RSS feed URL to save')
    .option('--name <name>', 'Custom name for the feed')
    .action(addCommand);

  // List subcommand
  favorite
    .command('list')
    .description('List all saved favorites')
    .action(listCommand);

  // Remove subcommand
  favorite
    .command('remove')
    .description('Remove a feed from favorites')
    .argument('<name|url>', 'Feed name or URL to remove')
    .action(removeCommand);

  // Clear subcommand
  favorite
    .command('clear')
    .description('Clear all favorites')
    .option('--force', 'Skip confirmation prompt')
    .action(clearCommand);
}
