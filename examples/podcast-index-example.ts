/**
 * Example usage of the Podcast Index API client
 *
 * Setup:
 * 1. Copy .env.example to .env
 * 2. Add your API credentials to .env
 * 3. Run: npm run dev examples/podcast-index-example.ts
 *
 * Alternatively, set environment variables directly:
 * export PODCAST_INDEX_API_KEY="your-api-key"
 * export PODCAST_INDEX_API_SECRET="your-api-secret"
 */

import { PodcastIndexClient } from '../src/clients';
import { loadPodcastIndexConfig, loadEnvFile, ConfigurationError } from '../src/config';

async function main() {
  try {
    // Load environment variables from .env file (optional)
    loadEnvFile();

    // Load configuration from environment variables
    const config = loadPodcastIndexConfig();
    console.log('✓ Configuration loaded successfully');

    // Create client instance
    const client = new PodcastIndexClient({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      baseUrl: config.baseUrl,
      userAgent: 'pullapod-example/1.0',
    });
    console.log('✓ Client created\n');

    // Example 1: Search for podcasts by term
    console.log('Example 1: Searching for JavaScript podcasts...');
    const searchResults = await client.searchByTerm({
      q: 'javascript',
      max: 5,
    });
    console.log(`Found ${searchResults.count} podcasts`);
    if (searchResults.feeds && searchResults.feeds.length > 0) {
      searchResults.feeds.slice(0, 3).forEach((feed, index) => {
        console.log(`  ${index + 1}. ${feed.title}`);
        console.log(`     by ${feed.author}`);
        console.log(`     Feed URL: ${feed.url}`);
      });
    }
    console.log('');

    // Example 2: Get trending podcasts
    console.log('Example 2: Getting trending podcasts...');
    const trending = await client.getTrending({
      max: 5,
      lang: 'en',
    });
    if (trending.feeds && trending.feeds.length > 0) {
      trending.feeds.forEach((feed, index) => {
        console.log(`  ${index + 1}. ${feed.title}`);
        console.log(`     ${feed.description?.substring(0, 80)}...`);
      });
    }
    console.log('');

    // Example 3: Get recent episodes
    console.log('Example 3: Getting recent episodes...');
    const recent = await client.getRecentEpisodes({
      max: 5,
    });
    if (recent.items && recent.items.length > 0) {
      recent.items.forEach((episode, index) => {
        const date = new Date(episode.datePublished * 1000);
        console.log(`  ${index + 1}. ${episode.title}`);
        console.log(`     Podcast: ${episode.feedTitle}`);
        console.log(`     Published: ${date.toLocaleDateString()}`);
        console.log(`     Duration: ${Math.floor(episode.duration / 60)} min`);
      });
    }
    console.log('');

    // Example 4: Get Podcast Index statistics
    console.log('Example 4: Getting Podcast Index statistics...');
    const stats = await client.getStats();
    console.log(`  Total Feeds: ${stats.feedCountTotal.toLocaleString()}`);
    console.log(`  Total Episodes: ${stats.episodeCountTotal.toLocaleString()}`);
    console.log(`  Active Feeds (3 days): ${stats.feedsWithNewEpisodes3days.toLocaleString()}`);
    console.log(`  Active Feeds (30 days): ${stats.feedsWithNewEpisodes30days.toLocaleString()}`);
    console.log(`  Feeds with Value Blocks: ${stats.feedsWithValueBlocks.toLocaleString()}`);
    console.log('');

    console.log('✓ All examples completed successfully!');
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error('\n❌ Configuration Error:', error.message);
      console.error('\nPlease set the following environment variables:');
      console.error('  export PODCAST_INDEX_API_KEY="your-api-key"');
      console.error('  export PODCAST_INDEX_API_SECRET="your-api-secret"');
      console.error('\nRegister for a free API key at: https://api.podcastindex.org/');
    } else if (error instanceof Error) {
      console.error('\n❌ Error:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    } else {
      console.error('\n❌ Unknown error:', error);
    }
    process.exit(1);
  }
}

main();
