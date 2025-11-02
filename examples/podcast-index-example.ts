/**
 * Example usage of the Podcast Index API client with pullapod-cli
 *
 * This example demonstrates how to use the Podcast Index API to:
 * 1. Search for podcasts and get their RSS feed URLs
 * 2. Find recent episodes to download with pullapod-cli
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

    // ============================================================================
    // Example 1: Find a podcast and get its RSS feed URL for pullapod-cli
    // ============================================================================
    console.log('Example 1: Finding a podcast and getting its RSS feed URL');
    console.log('='.repeat(70));

    const searchQuery = 'javascript jabber';
    console.log(`\nSearching for: "${searchQuery}"\n`);

    const searchResults = await client.searchByTitle({
      q: searchQuery,
      max: 3,
    });

    if (searchResults.feeds && searchResults.feeds.length > 0) {
      console.log(`Found ${searchResults.count} podcasts:\n`);

      searchResults.feeds.forEach((feed, index) => {
        console.log(`${index + 1}. ${feed.title}`);
        console.log(`   Author: ${feed.author}`);
        console.log(`   Episodes: ${feed.episodeCount || 'Unknown'}`);
        console.log(`   RSS Feed: ${feed.url}`);
        console.log(`   Language: ${feed.language}`);
        console.log('');
      });

      // Show how to use the RSS feed with pullapod-cli
      const selectedFeed = searchResults.feeds[0];
      console.log('📥 To download episodes from this podcast with pullapod-cli:');
      console.log(`   pullapod --feed "${selectedFeed.url}" --date 2024-01-15`);
      console.log(`   pullapod --feed "${selectedFeed.url}" --name "interview"`);
      console.log('');

      // ============================================================================
      // Example 2: Get recent episodes from the selected podcast
      // ============================================================================
      console.log('\nExample 2: Getting recent episodes from the selected podcast');
      console.log('='.repeat(70));
      console.log(`\nFetching recent episodes from: ${selectedFeed.title}\n`);

      const episodes = await client.getEpisodesByFeedId({
        id: selectedFeed.id,
        max: 5,
      });

      if (episodes.items && episodes.items.length > 0) {
        console.log(`Found ${episodes.items.length} recent episodes:\n`);

        episodes.items.forEach((episode, index) => {
          const date = new Date(episode.datePublished * 1000);
          const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
          const durationMin = Math.floor(episode.duration / 60);

          console.log(`${index + 1}. ${episode.title}`);
          console.log(`   Published: ${date.toLocaleDateString()} (${dateStr})`);
          console.log(`   Duration: ${durationMin} minutes`);
          console.log(`   Download: ${episode.enclosureUrl}`);
          console.log('');
        });

        // Show how to download the most recent episode
        const latestEpisode = episodes.items[0];
        const latestDate = new Date(latestEpisode.datePublished * 1000)
          .toISOString()
          .split('T')[0];

        console.log('📥 To download the most recent episode:');
        console.log(`   pullapod --feed "${selectedFeed.url}" --date ${latestDate}`);
        console.log('');

        console.log('📥 To download all episodes from the last 30 days:');
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        console.log(`   pullapod --feed "${selectedFeed.url}" --start ${thirtyDaysAgo} --end ${latestDate}`);
        console.log('');
      }

      // ============================================================================
      // Example 3: Discover trending podcasts to explore
      // ============================================================================
      console.log('\nExample 3: Discovering trending podcasts');
      console.log('='.repeat(70));
      console.log('\nFetching trending Technology podcasts...\n');

      const trending = await client.getTrending({
        max: 5,
        lang: 'en',
        cat: 'Technology',
      });

      if (trending.feeds && trending.feeds.length > 0) {
        console.log(`Found ${trending.feeds.length} trending podcasts:\n`);

        trending.feeds.forEach((feed, index) => {
          console.log(`${index + 1}. ${feed.title}`);
          console.log(`   by ${feed.author}`);
          console.log(`   RSS Feed: ${feed.url}`);
          console.log(`   ${feed.description?.substring(0, 100)}...`);
          console.log('');
        });
      }
    } else {
      console.log('No podcasts found. Try a different search term.');
    }

    console.log('✓ All examples completed successfully!');
    console.log('\n' + '='.repeat(70));
    console.log('Next steps:');
    console.log('  1. Copy any RSS feed URL from above');
    console.log('  2. Use pullapod-cli to download episodes:');
    console.log('     pullapod --feed <RSS_URL> --date YYYY-MM-DD');
    console.log('  3. See README.md for more pullapod-cli options');
    console.log('='.repeat(70));

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

void main();
