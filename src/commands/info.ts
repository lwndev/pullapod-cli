/**
 * Info command implementation
 * Allows users to view detailed information about a podcast feed
 */

import { Command } from 'commander';
import { PodcastIndexClient } from '../clients/podcast-index-client';
import { loadConfig } from '../config';
import { formatPodcastInfo } from '../formatters/info-formatter';
import { detectFeedIdOrUrl } from '../utils/validation';
import { formatErrorMessage } from '../utils/errors';

/**
 * Execute info command
 * @param feedInput - Feed URL or feed ID
 */
export async function infoCommand(feedInput: string): Promise<void> {
  try {
    // Initialize client
    const config = loadConfig();
    if (!config.podcastIndex.apiKey || !config.podcastIndex.apiSecret) {
      console.error('Error: Podcast Index API credentials not configured.');
      console.error(
        'Please set PODCAST_INDEX_API_KEY and PODCAST_INDEX_API_SECRET environment variables.'
      );
      console.error('You can get API keys at https://api.podcastindex.org/');
      process.exit(1);
    }

    const client = new PodcastIndexClient({
      apiKey: config.podcastIndex.apiKey,
      apiSecret: config.podcastIndex.apiSecret,
    });

    // Detect if input is feed ID or URL
    const feedDetection = detectFeedIdOrUrl(feedInput);

    console.log(`Fetching podcast info from ${feedDetection.type === 'id' ? 'feed ID' : 'feed URL'}...`);

    // Fetch podcast info based on input type
    let response;
    if (feedDetection.type === 'id') {
      response = await client.getPodcastById(feedDetection.value as number);
    } else {
      response = await client.getPodcastByUrl(feedDetection.value as string);
    }

    // Check if we got a valid response
    // The API returns feed data in the 'feed' property for single podcast queries
    const feed = response.feed || (response.feeds && response.feeds[0]);

    if (!feed) {
      console.error('Error: Feed not found');
      console.error('Please check the feed URL or ID and try again.');
      process.exit(1);
    }

    // Format and display results
    const output = formatPodcastInfo(feed);
    console.log('\n' + output);

    // Exit successfully
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
 * Register info command with Commander
 */
export function registerInfoCommand(program: Command): void {
  program
    .command('info')
    .description('View detailed information about a podcast feed')
    .argument('<feed>', 'RSS feed URL or Podcast Index feed ID')
    .action(infoCommand);
}
