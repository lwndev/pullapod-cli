/**
 * Tests for favorite formatter
 */

import {
  formatDateAdded,
  formatFavoriteItem,
  formatFavoritesList,
  formatEmptyList,
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
} from '../../../src/formatters/favorite-formatter';
import { FavoriteFeed } from '../../../src/storage/favorites';

describe('favorite formatter', () => {
  const mockFeed1: FavoriteFeed = {
    name: 'JavaScript Jabber',
    url: 'https://feeds.fireside.fm/javascriptjabber/rss',
    feedId: 920666,
    dateAdded: '2024-01-10T12:00:00Z',
  };

  const mockFeed2: FavoriteFeed = {
    name: 'Syntax FM',
    url: 'https://feed.syntax.fm/rss',
    feedId: 123456,
    dateAdded: '2024-01-09T12:00:00Z',
  };

  describe('formatDateAdded', () => {
    it('should format ISO date to readable format', () => {
      const result = formatDateAdded('2024-01-10T12:00:00Z');
      expect(result).toMatch(/Jan\s+10,\s+2024/);
    });
  });

  describe('formatFavoriteItem', () => {
    it('should format single favorite with index', () => {
      const result = formatFavoriteItem(mockFeed1, 1);
      expect(result).toContain('1. JavaScript Jabber');
      expect(result).toContain('Feed: https://feeds.fireside.fm/javascriptjabber/rss');
      expect(result).toContain('Added:');
    });
  });

  describe('formatFavoritesList', () => {
    it('should format list of favorites', () => {
      const result = formatFavoritesList([mockFeed1, mockFeed2]);
      expect(result).toContain('Your saved podcasts (2)');
      expect(result).toContain('1. JavaScript Jabber');
      expect(result).toContain('2. Syntax FM');
    });

    it('should return empty list message for empty array', () => {
      const result = formatFavoritesList([]);
      expect(result).toContain('No saved podcasts');
    });

    it('should use singular for single podcast', () => {
      const result = formatFavoritesList([mockFeed1]);
      expect(result).toContain('Your saved podcast (1)');
    });
  });

  describe('formatEmptyList', () => {
    it('should include add command suggestion', () => {
      const result = formatEmptyList();
      expect(result).toContain('No saved podcasts yet');
      expect(result).toContain('pullapod favorite add');
    });
  });

  describe('formatAddSuccess', () => {
    it('should format add success message', () => {
      const result = formatAddSuccess(mockFeed1, 3);
      expect(result).toContain('Added "JavaScript Jabber" to favorites');
      expect(result).toContain('Feed URL: https://feeds.fireside.fm/javascriptjabber/rss');
      expect(result).toContain('Feed ID: 920666');
      expect(result).toContain('Total favorites: 3');
    });
  });

  describe('formatAddDuplicate', () => {
    it('should format duplicate error message', () => {
      const result = formatAddDuplicate(mockFeed1);
      expect(result).toContain('Error: Feed already exists');
      expect(result).toContain('Existing entry: "JavaScript Jabber"');
      expect(result).toContain('Feed URL:');
    });
  });

  describe('formatRemoveConfirmation', () => {
    it('should format remove confirmation prompt', () => {
      const result = formatRemoveConfirmation(mockFeed1);
      expect(result).toContain('Remove "JavaScript Jabber"?');
      expect(result).toContain('(y/n)');
    });
  });

  describe('formatRemoveSuccess', () => {
    it('should format remove success message', () => {
      const result = formatRemoveSuccess(mockFeed1, 2);
      expect(result).toContain('Removed "JavaScript Jabber" from favorites');
      expect(result).toContain('Remaining favorites: 2');
    });
  });

  describe('formatRemoveCancelled', () => {
    it('should return cancellation message', () => {
      const result = formatRemoveCancelled();
      expect(result).toBe('Removal cancelled');
    });
  });

  describe('formatMultipleMatches', () => {
    it('should format multiple matches message', () => {
      const result = formatMultipleMatches([mockFeed1, mockFeed2]);
      expect(result).toContain('Found 2 matching favorites');
      expect(result).toContain('1. JavaScript Jabber');
      expect(result).toContain('2. Syntax FM');
    });
  });

  describe('formatNoMatches', () => {
    it('should format no matches message', () => {
      const result = formatNoMatches('nonexistent');
      expect(result).toContain('No favorite found matching "nonexistent"');
    });
  });

  describe('formatClearConfirmation', () => {
    it('should format clear confirmation for multiple', () => {
      const result = formatClearConfirmation(3);
      expect(result).toContain('Remove all 3 favorites?');
      expect(result).toContain('cannot be undone');
      expect(result).toContain("Type 'yes' to confirm");
    });

    it('should use singular for one favorite', () => {
      const result = formatClearConfirmation(1);
      expect(result).toContain('Remove all 1 favorite?');
    });
  });

  describe('formatClearSuccess', () => {
    it('should format clear success message', () => {
      const result = formatClearSuccess(3);
      expect(result).toContain('Removed 3 favorites');
      expect(result).toContain('Favorites list is now empty');
    });

    it('should use singular for one favorite', () => {
      const result = formatClearSuccess(1);
      expect(result).toContain('Removed 1 favorite');
    });
  });

  describe('formatClearCancelled', () => {
    it('should return cancellation message', () => {
      const result = formatClearCancelled();
      expect(result).toBe('Clear cancelled');
    });
  });

  describe('formatClearEmpty', () => {
    it('should return already empty message', () => {
      const result = formatClearEmpty();
      expect(result).toContain('already empty');
    });
  });
});
