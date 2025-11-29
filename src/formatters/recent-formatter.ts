/**
 * Formatter for recent command output
 * Formats aggregated episode data from multiple favorite feeds
 */

import { PodcastEpisode } from '../clients/podcast-index-types';
import { FavoriteFeed } from '../storage/favorites';
import { truncateText, pluralize } from '../utils/format';

/**
 * Maximum episode title length for display.
 * Keeps output compact while preserving readability.
 */
const DEFAULT_TITLE_MAX_LENGTH = 60;

/**
 * Result of fetching episodes from a single feed
 */
export interface FeedFetchResult {
  feed: FavoriteFeed;
  episodes: PodcastEpisode[];
  error?: string;
}

/**
 * Grouped episodes by podcast
 */
export interface PodcastGroup {
  feedName: string;
  feedUrl: string;
  episodes: PodcastEpisode[];
}

/**
 * Format Unix timestamp to short date format
 * Format: "Jan 15, 2024"
 */
export function formatShortDate(timestamp: number): string {
  if (!timestamp) {
    return 'Unknown date';
  }

  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Group episodes by podcast and sort by most recent.
 *
 * Filters out feeds with no episodes, sorts episodes within each group
 * by publish date (newest first), and sorts groups by the most recent
 * episode in each podcast.
 *
 * @param results - Array of fetch results from multiple feeds
 * @returns Array of podcast groups sorted by latest episode
 */
export function groupEpisodesByPodcast(results: FeedFetchResult[]): PodcastGroup[] {
  const groups: PodcastGroup[] = [];

  for (const result of results) {
    if (result.episodes.length > 0) {
      groups.push({
        feedName: result.feed.name,
        feedUrl: result.feed.url,
        episodes: result.episodes.sort((a, b) => b.datePublished - a.datePublished),
      });
    }
  }

  // Sort groups by most recent episode first
  groups.sort((a, b) => {
    const aLatest = a.episodes[0]?.datePublished || 0;
    const bLatest = b.episodes[0]?.datePublished || 0;
    return bLatest - aLatest;
  });

  return groups;
}

/**
 * Format a single episode line
 * Format: "  * Episode Title (Jan 15, 2024)"
 */
export function formatEpisodeLine(
  episode: PodcastEpisode,
  maxTitleLength = DEFAULT_TITLE_MAX_LENGTH
): string {
  const title = truncateText(episode.title, maxTitleLength);
  const date = formatShortDate(episode.datePublished);
  return `  * ${title} (${date})`;
}

/**
 * Format podcast group header
 * Format: "Podcast Name (3 new episodes)"
 */
export function formatGroupHeader(group: PodcastGroup): string {
  const count = group.episodes.length;
  const episodeWord = pluralize(count, 'episode');
  return `${group.feedName} (${count} new ${episodeWord})`;
}

/**
 * Format the complete recent episodes output for all feeds
 */
export function formatRecentOutput(
  results: FeedFetchResult[],
  days: number,
  feedFilter?: string
): string {
  const groups = groupEpisodesByPodcast(results);
  const lines: string[] = [];

  // Check for any fetch errors
  const errors = results.filter((r) => r.error);
  const totalEpisodes = groups.reduce((sum, g) => sum + g.episodes.length, 0);
  const podcastCount = groups.length;

  // Handle case where feed filter was applied
  if (feedFilter) {
    if (groups.length === 0) {
      if (totalEpisodes === 0 && errors.length === 0) {
        lines.push(`No new episodes from "${feedFilter}" in the last ${days} ${pluralize(days, 'day')}.`);
        lines.push('');
        lines.push(`Try: pullapod recent --days 30`);
        return lines.join('\n');
      }
    }

    // Single feed output format
    const group = groups[0];
    if (group) {
      lines.push(`Recent episodes from "${group.feedName}" (last ${days} ${pluralize(days, 'day')}):`);
      lines.push('');
      for (const episode of group.episodes) {
        lines.push(formatEpisodeLine(episode));
      }
      lines.push('');
      lines.push('---');
      lines.push(`${totalEpisodes} new ${pluralize(totalEpisodes, 'episode')}`);
      lines.push(`Download with: pullapod download --feed "${group.feedUrl}" --date YYYY-MM-DD`);
    }

    return lines.join('\n');
  }

  // Handle no new episodes case
  if (totalEpisodes === 0) {
    lines.push(`No new episodes from your saved podcasts in the last ${days} ${pluralize(days, 'day')}.`);
    lines.push('');
    lines.push(`Try: pullapod recent --days 30`);
    return lines.join('\n');
  }

  // Header
  lines.push(`Recent episodes from your saved podcasts (last ${days} ${pluralize(days, 'day')}):`);
  lines.push('');

  // Format each podcast group
  for (const group of groups) {
    lines.push(formatGroupHeader(group));
    for (const episode of group.episodes) {
      lines.push(formatEpisodeLine(episode));
    }
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push(
    `Total: ${totalEpisodes} new ${pluralize(totalEpisodes, 'episode')} across ${podcastCount} ${pluralize(podcastCount, 'podcast')}`
  );
  lines.push(`Download with: pullapod download --feed <feed-url> --date YYYY-MM-DD`);

  // Show warnings for failed feeds
  if (errors.length > 0) {
    lines.push('');
    lines.push(`Warning: ${errors.length} ${pluralize(errors.length, 'feed')} could not be fetched:`);
    for (const err of errors) {
      lines.push(`  - ${err.feed.name}: ${err.error}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format message when no favorites are configured
 */
export function formatNoFavorites(): string {
  const lines: string[] = [];
  lines.push('No saved podcasts found.');
  lines.push('');
  lines.push('Add favorites with: pullapod favorite add <feed-url>');
  lines.push('List favorites with: pullapod favorite list');
  return lines.join('\n');
}

/**
 * Format message when feed filter doesn't match any favorites
 */
export function formatFeedNotFound(query: string, availableFeeds: FavoriteFeed[]): string {
  const lines: string[] = [];
  lines.push(`No saved podcast matches "${query}".`);
  lines.push('');
  lines.push('Available feeds:');
  for (const feed of availableFeeds) {
    lines.push(`  - ${feed.name}`);
  }
  lines.push('');
  lines.push('Try: pullapod recent --feed "partial name"');
  return lines.join('\n');
}

/**
 * Format warning for large favorites list
 */
export function formatLargeFavoritesWarning(count: number): string {
  return `Note: Fetching from ${count} podcasts. This may take a moment. Consider using --feed to filter.`;
}
