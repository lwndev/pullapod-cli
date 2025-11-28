/**
 * Formatter for info command output
 * Formats podcast feed information from Podcast Index API into human-readable CLI output
 */

import { PodcastFeed } from '../clients/podcast-index-types';
import { stripHtml, formatNumber } from '../utils/format';
import { formatLanguage } from '../utils/language';

/**
 * Feed health status
 */
export type FeedStatus = 'active' | 'inactive' | 'dead';

/**
 * Status display configuration
 */
const STATUS_DISPLAY: Record<FeedStatus, { label: string; symbol: string }> = {
  active: { label: 'Active', symbol: '✓' },
  inactive: { label: 'Inactive', symbol: '⚠' },
  dead: { label: 'Dead', symbol: '✗' },
};

/**
 * Number of seconds in 90 days (for determining feed activity)
 */
const NINETY_DAYS_SECONDS = 90 * 24 * 60 * 60;

/**
 * Determine feed health status based on dead flag and last publish time
 * @param feed - Podcast feed data
 * @returns Feed status: 'active', 'inactive', or 'dead'
 */
export function determineFeedStatus(feed: PodcastFeed): FeedStatus {
  // Check if marked as dead
  if (feed.dead === 1) {
    return 'dead';
  }

  // Use newestItemPublishTime (actual episode publish date) when available, falling back
  // to lastUpdateTime (feed crawl date). The newestItemPublishTime is more accurate for
  // determining feed activity since lastUpdateTime reflects crawler activity, not content updates.
  const lastPublishTime = feed.newestItemPublishTime || feed.lastUpdateTime;

  if (!lastPublishTime) {
    return 'inactive';
  }

  const now = Math.floor(Date.now() / 1000);
  const ageSeconds = now - lastPublishTime;

  // Active if within 90 days
  if (ageSeconds <= NINETY_DAYS_SECONDS) {
    return 'active';
  }

  return 'inactive';
}

/**
 * Format feed status for display
 * @param status - Feed status
 * @returns Formatted status string with symbol
 */
export function formatFeedStatus(status: FeedStatus): string {
  const display = STATUS_DISPLAY[status];
  return `${display.label} ${display.symbol}`;
}

/**
 * Format Unix timestamp to human-readable date with relative time
 * Format: "Jan 15, 2024 (2 days ago)"
 * @param timestamp - Unix timestamp
 * @returns Formatted date string
 */
export function formatLastUpdate(timestamp: number): string {
  if (!timestamp) {
    return 'Unknown';
  }

  const date = new Date(timestamp * 1000);
  const dateStr = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const relativeTime = formatRelativeTime(timestamp);

  return `${dateStr} (${relativeTime})`;
}

/**
 * Format Unix timestamp to relative time
 * Examples: "2 days ago", "3 weeks ago", "1 month ago"
 *
 * Note: Month and year calculations use fixed approximations (30 days/month, 365 days/year)
 * for simplicity. This provides reasonable accuracy for display purposes without the
 * complexity of calendar-aware calculations.
 *
 * @param timestamp - Unix timestamp
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) {
    return 'unknown';
  }

  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 0) {
    return 'in the future';
  }

  const seconds = diff;
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  // Approximations: 30 days/month, 365 days/year (sufficient for relative time display)
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years >= 1) {
    return years === 1 ? '1 year ago' : `${years} years ago`;
  }
  if (months >= 1) {
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
  if (weeks >= 1) {
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  if (days >= 1) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }
  if (hours >= 1) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  if (minutes >= 1) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }

  return 'just now';
}

/**
 * Format categories for display
 * Handles the categories object from Podcast Index API
 * @param categories - Categories object {id: name}
 * @returns Formatted categories string
 */
export function formatCategories(categories: Record<string, string> | undefined): string[] {
  if (!categories || Object.keys(categories).length === 0) {
    return ['Uncategorized'];
  }

  // Categories are stored as {id: name} pairs
  return Object.values(categories);
}

/**
 * Format explicit content flag
 * @param explicit - Explicit flag (boolean or number)
 * @returns "Explicit" or "Clean"
 */
export function formatExplicit(explicit: boolean | number | undefined): string {
  if (explicit === true || explicit === 1) {
    return 'Explicit';
  }
  return 'Clean';
}

/**
 * Format medium/content type
 * @param medium - Medium string from API
 * @returns Formatted medium string
 */
export function formatMedium(medium: string | undefined): string {
  if (!medium) {
    return 'Podcast';
  }

  // Capitalize first letter
  return medium.charAt(0).toUpperCase() + medium.slice(1);
}

/**
 * Format podcast description
 * Strip HTML and handle missing descriptions
 * @param description - Raw description string
 * @returns Cleaned description
 */
export function formatDescription(description: string | undefined): string {
  if (!description) {
    return 'No description available';
  }

  const cleaned = stripHtml(description);

  if (!cleaned) {
    return 'No description available';
  }

  return cleaned;
}

/**
 * Format the complete podcast info output
 * @param feed - Podcast feed data
 * @returns Formatted multi-line string
 */
export function formatPodcastInfo(feed: PodcastFeed): string {
  const lines: string[] = [];

  // Header
  lines.push('Podcast Information:');
  lines.push('');

  // Basic info with aligned labels (14 character padding)
  lines.push(`Title:        ${feed.title || 'Unknown'}`);
  lines.push(`Author:       ${feed.author || feed.ownerName || 'Unknown'}`);
  lines.push(`Language:     ${formatLanguage(feed.language)}`);
  lines.push(`Episodes:     ${feed.episodeCount !== undefined ? formatNumber(feed.episodeCount) + ' total' : 'Unknown'}`);
  lines.push(`Feed ID:      ${feed.id}`);

  // iTunes ID (optional)
  if (feed.itunesId) {
    lines.push(`iTunes ID:    ${feed.itunesId}`);
  }

  lines.push(`Feed URL:     ${feed.url}`);

  // Website (optional)
  if (feed.link) {
    lines.push(`Website:      ${feed.link}`);
  }

  // Artwork
  const artworkUrl = feed.artwork || feed.image;
  if (artworkUrl) {
    lines.push(`Artwork:      ${artworkUrl}`);
  } else {
    lines.push(`Artwork:      No artwork available`);
  }

  // Description section
  lines.push('');
  lines.push('Description:');
  const description = formatDescription(feed.description);
  // Wrap description lines for readability (max 80 chars)
  const wrappedDescription = wrapText(description, 80);
  wrappedDescription.forEach(line => lines.push(line));

  // Categories
  lines.push('');
  const categories = formatCategories(feed.categories);
  lines.push(`Categories:   ${categories[0]}`);
  categories.slice(1).forEach(cat => {
    lines.push(`              ${cat}`);
  });

  // Content type and explicit flag
  const medium = formatMedium(feed.medium);
  const explicit = formatExplicit(feed.explicit);
  lines.push(`Content:      ${medium} (${explicit})`);

  // Last update and status - prefer newestItemPublishTime (actual episode date) over lastUpdateTime (crawl date)
  const lastPublishTime = feed.newestItemPublishTime || feed.lastUpdateTime;
  lines.push(`Last Updated: ${formatLastUpdate(lastPublishTime)}`);

  const status = determineFeedStatus(feed);
  lines.push(`Status:       ${formatFeedStatus(status)}`);

  // Footer with user guidance
  lines.push('');
  lines.push('---');
  lines.push('Download episodes: pullapod download --feed <feed-url> --date YYYY-MM-DD');
  lines.push('Preview episodes:  pullapod episodes <feed-url>');

  return lines.join('\n');
}

/**
 * Wrap text to specified width
 * Handles edge cases where individual words (URLs, long compound words) exceed max width
 * by breaking them at the boundary.
 * @param text - Text to wrap
 * @param maxWidth - Maximum line width
 * @returns Array of wrapped lines
 */
function wrapText(text: string, maxWidth: number): string[] {
  if (!text) {
    return [];
  }

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    // Handle words that exceed maxWidth by breaking them
    if (word.length > maxWidth) {
      // Flush current line if not empty
      if (currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = '';
      }
      // Break the long word into chunks
      for (let i = 0; i < word.length; i += maxWidth) {
        lines.push(word.slice(i, i + maxWidth));
      }
    } else if (currentLine.length === 0) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}
