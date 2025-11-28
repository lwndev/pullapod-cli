/**
 * Formatter for favorite command output
 * Formats favorites data for human-readable CLI output
 */

import { FavoriteFeed } from '../storage/favorites';
import { pluralize } from '../utils/format';

/**
 * Format date for display
 * Format: "Jan 10, 2024"
 */
export function formatDateAdded(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a single favorite for list display
 */
export function formatFavoriteItem(feed: FavoriteFeed, index: number): string {
  const lines: string[] = [];
  lines.push(`${index}. ${feed.name}`);
  lines.push(`   Feed: ${feed.url}`);
  lines.push(`   Added: ${formatDateAdded(feed.dateAdded)}`);
  return lines.join('\n');
}

/**
 * Format the list of favorites
 */
export function formatFavoritesList(feeds: FavoriteFeed[]): string {
  if (feeds.length === 0) {
    return formatEmptyList();
  }

  const lines: string[] = [];
  const countText = pluralize(feeds.length, 'podcast', 'podcasts');
  lines.push(`Your saved ${countText} (${feeds.length}):`);
  lines.push('');

  feeds.forEach((feed, idx) => {
    lines.push(formatFavoriteItem(feed, idx + 1));
    if (idx < feeds.length - 1) {
      lines.push('');
    }
  });

  return lines.join('\n');
}

/**
 * Format empty list message
 */
export function formatEmptyList(): string {
  const lines: string[] = [];
  lines.push('No saved podcasts yet.');
  lines.push('');
  lines.push('Add favorites with: pullapod favorite add <feed-url>');
  return lines.join('\n');
}

/**
 * Format add success message
 */
export function formatAddSuccess(feed: FavoriteFeed, totalCount: number): string {
  const lines: string[] = [];
  lines.push(`Added "${feed.name}" to favorites`);
  lines.push(`Feed URL: ${feed.url}`);
  lines.push(`Feed ID: ${feed.feedId}`);
  lines.push(`Total favorites: ${totalCount}`);
  return lines.join('\n');
}

/**
 * Format add duplicate error message
 */
export function formatAddDuplicate(existingFeed: FavoriteFeed): string {
  const lines: string[] = [];
  lines.push('Error: Feed already exists in favorites');
  lines.push('');
  lines.push(`Existing entry: "${existingFeed.name}"`);
  lines.push(`Feed URL: ${existingFeed.url}`);
  lines.push(`Added: ${formatDateAdded(existingFeed.dateAdded)}`);
  return lines.join('\n');
}

/**
 * Format remove confirmation prompt
 */
export function formatRemoveConfirmation(feed: FavoriteFeed): string {
  return `Remove "${feed.name}"? (y/n): `;
}

/**
 * Format remove success message
 */
export function formatRemoveSuccess(feed: FavoriteFeed, remainingCount: number): string {
  const lines: string[] = [];
  lines.push(`Removed "${feed.name}" from favorites`);
  lines.push(`Remaining favorites: ${remainingCount}`);
  return lines.join('\n');
}

/**
 * Format remove cancelled message
 */
export function formatRemoveCancelled(): string {
  return 'Removal cancelled';
}

/**
 * Format multiple matches error (ambiguous removal)
 */
export function formatMultipleMatches(matches: FavoriteFeed[]): string {
  const lines: string[] = [];
  lines.push(`Found ${matches.length} matching favorites. Please be more specific:`);
  lines.push('');
  matches.forEach((feed, idx) => {
    lines.push(`${idx + 1}. ${feed.name}`);
    lines.push(`   ${feed.url}`);
  });
  return lines.join('\n');
}

/**
 * Format no matches error
 */
export function formatNoMatches(query: string): string {
  return `No favorite found matching "${query}"`;
}

/**
 * Format clear confirmation prompt
 */
export function formatClearConfirmation(count: number): string {
  const lines: string[] = [];
  const favoritesText = pluralize(count, 'favorite', 'favorites');
  lines.push(`Remove all ${count} ${favoritesText}? This cannot be undone.`);
  lines.push("Type 'yes' to confirm: ");
  return lines.join('\n');
}

/**
 * Format clear success message
 */
export function formatClearSuccess(removedCount: number): string {
  const lines: string[] = [];
  const favoritesText = pluralize(removedCount, 'favorite', 'favorites');
  lines.push(`Removed ${removedCount} ${favoritesText}`);
  lines.push('Favorites list is now empty');
  return lines.join('\n');
}

/**
 * Format clear cancelled message
 */
export function formatClearCancelled(): string {
  return 'Clear cancelled';
}

/**
 * Format clear already empty message
 */
export function formatClearEmpty(): string {
  return 'Favorites list is already empty';
}
