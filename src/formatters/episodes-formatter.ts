/**
 * Formatter for episodes command output
 * Formats episode data from Podcast Index API into human-readable CLI output
 */

import { PodcastEpisode } from '../clients/podcast-index-types';
import { stripHtml, truncateText } from '../utils/format';

/**
 * Format duration from seconds to human-readable format
 * Examples:
 *   0-59 seconds: "45 sec"
 *   60-3599 seconds: "52 min"
 *   3600+ seconds: "1h 23min"
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) {
    return 'N/A';
  }

  if (seconds < 60) {
    return `${Math.floor(seconds)} sec`;
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
}

/**
 * Format Unix timestamp to human-readable date
 * Format: "Jan 15, 2024"
 */
export function formatPublishDate(timestamp: number): string {
  if (!timestamp) {
    return 'Unknown date';
  }

  const date = new Date(timestamp * 1000); // Convert Unix timestamp to milliseconds
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format episode description
 * - Strip HTML tags
 * - Truncate to specified length unless full=true
 * - Handle missing descriptions
 */
export function formatDescription(
  description: string,
  full: boolean = false,
  maxLength: number = 150
): string {
  if (!description) {
    return 'No description available';
  }

  // Strip HTML tags
  const plainText = stripHtml(description);

  if (!plainText) {
    return 'No description available';
  }

  // Return full text if requested
  if (full) {
    return plainText;
  }

  // Truncate at word boundaries
  return truncateText(plainText, maxLength);
}

/**
 * Format a single episode for display
 */
export function formatEpisode(
  episode: PodcastEpisode,
  index: number,
  showFullDescription: boolean = false
): string {
  const lines: string[] = [];

  // Episode number and title
  const header = `${index}. ${episode.title}`;
  lines.push(header);

  // Published date
  lines.push(`   Published: ${formatPublishDate(episode.datePublished)}`);

  // Duration
  lines.push(`   Duration: ${formatDuration(episode.duration)}`);

  // Audio URL
  lines.push(`   URL: ${episode.enclosureUrl}`);

  // Description
  const description = formatDescription(
    episode.description,
    showFullDescription
  );

  // Indent description lines
  const descriptionLines = description.split('\n');
  descriptionLines.forEach((line) => {
    lines.push(`   ${line}`);
  });

  return lines.join('\n');
}

/**
 * Format complete episodes list output
 */
export function formatEpisodesList(
  episodes: PodcastEpisode[],
  podcastTitle: string,
  showFullDescription: boolean = false,
  requestedMax?: number
): string {
  if (!episodes || episodes.length === 0) {
    return 'No episodes found.';
  }

  const lines: string[] = [];

  // Header with podcast title
  lines.push(`Recent episodes from "${podcastTitle}":`);
  lines.push('');

  // Format each episode
  episodes.forEach((episode, index) => {
    lines.push(formatEpisode(episode, index + 1, showFullDescription));
    lines.push(''); // Blank line between episodes
  });

  // Footer
  lines.push('---');

  // Episode count info
  const countInfo =
    requestedMax && episodes.length < requestedMax
      ? `Showing ${episodes.length} episodes (all available)`
      : `Showing ${episodes.length} episodes${requestedMax ? '' : ' (use --max to show more)'}`;

  lines.push(countInfo);

  // Download instructions
  lines.push('Download with: pullapod download --feed <feed-url> --date YYYY-MM-DD --name "episode title"');

  return lines.join('\n');
}
