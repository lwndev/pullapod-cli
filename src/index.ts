#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import { readFileSync } from 'fs';
import { PodcastParser } from './parser';
import { EpisodeFilter } from './filter';
import { Downloader } from './downloader';
import { MetadataEmbedder } from './metadata';
import { FilterOptions } from './types';
import { registerSearchCommand } from './commands/search';

const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('pullapod')
  .description('Pull a Pod - Download podcast episodes from RSS feeds')
  .version(packageJson.version);

// Register search command
registerSearchCommand(program);

// Download command (default for backward compatibility)
program
  .command('download', { isDefault: true })
  .description('Download podcast episodes from RSS feed')
  .requiredOption('-f, --feed <url>', 'RSS feed URL')
  .option('-o, --output <directory>', 'Output directory (defaults to current directory)', process.cwd())
  .option('-d, --date <date>', 'Download episode from specific date (YYYY-MM-DD)')
  .option('-s, --start <date>', 'Start date for range download (YYYY-MM-DD)')
  .option('-e, --end <date>', 'End date for range download (YYYY-MM-DD)')
  .option('-n, --name <name>', 'Download episode by name (partial match)')
  .option('--no-metadata', 'Skip embedding artwork and metadata')
  .action(async (options) => {
    try {
      // Validate options
      const hasDateFilter = options.date || options.start || options.end || options.name;

      if (!hasDateFilter) {
        console.error('Error: You must specify at least one filter option:');
        console.error('  --date <date>         Download from specific date');
        console.error('  --start <date>        Start date for range');
        console.error('  --end <date>          End date for range');
        console.error('  --name <name>         Episode name to search for');
        process.exit(1);
      }

      if (options.date && (options.start || options.end)) {
        console.error('Error: Cannot use --date with --start or --end');
        process.exit(1);
      }

      // Parse feed
      console.log('Fetching podcast feed...');
      const parser = new PodcastParser();
      const episodes = await parser.parseFeed(options.feed);

      console.log(`Found ${episodes.length} episodes in feed`);

      // Filter episodes
      const filterOptions: FilterOptions = {
        date: options.date,
        startDate: options.start,
        endDate: options.end,
        name: options.name,
      };

      const filter = new EpisodeFilter();
      const filteredEpisodes = filter.filter(episodes, filterOptions);

      if (filteredEpisodes.length === 0) {
        console.log('No episodes match the specified criteria');
        process.exit(0);
      }

      console.log(`\nFound ${filteredEpisodes.length} matching episode(s):`);
      filteredEpisodes.forEach((ep, idx) => {
        console.log(`  ${idx + 1}. ${ep.title} (${ep.publishDate.toLocaleDateString()})`);
      });

      // Download episodes
      const downloader = new Downloader();
      const embedder = new MetadataEmbedder();

      for (const episode of filteredEpisodes) {
        const { audioPath, artworkPath } = await downloader.downloadEpisode(
          episode,
          options.output
        );

        // Embed metadata if enabled
        if (options.metadata) {
          embedder.embedMetadata(audioPath, artworkPath, episode);
        }
      }

      console.log(`\n✓ Successfully downloaded ${filteredEpisodes.length} episode(s)`);
      console.log(`Output directory: ${path.resolve(options.output)}`);
    } catch (error) {
      console.error('\nError:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();
