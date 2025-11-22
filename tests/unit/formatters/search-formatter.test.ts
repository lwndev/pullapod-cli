/**
 * Tests for search result formatter
 */

import { formatSearchResults, formatPodcastFeedCompact } from '../../../src/formatters/search-formatter';
import { PodcastFeed } from '../../../src/clients/podcast-index-types';

describe('search formatter', () => {
  const mockFeed: PodcastFeed = {
    id: 1,
    title: 'JavaScript Jabber',
    url: 'https://feeds.fireside.fm/javascriptjabber/rss',
    originalUrl: 'https://feeds.fireside.fm/javascriptjabber/rss',
    link: 'https://javascriptjabber.com',
    description: '<p>Weekly panel discussion about JavaScript, front-end development, and the life of a software developer.</p>',
    author: 'Devchat.tv',
    ownerName: 'Charles Max Wood',
    image: 'https://example.com/image.jpg',
    artwork: 'https://example.com/artwork.jpg',
    lastUpdateTime: 1234567890,
    lastCrawlTime: 1234567890,
    lastParseTime: 1234567890,
    lastGoodHttpStatusTime: 1234567890,
    lastHttpStatus: 200,
    contentType: 'application/rss+xml',
    language: 'en',
    type: 0,
    dead: 0,
    crawlErrors: 0,
    parseErrors: 0,
    categories: {},
    locked: 0,
    explicit: false,
    episodeCount: 547,
  };

  describe('formatSearchResults', () => {
    it('should format empty results', () => {
      const result = formatSearchResults([]);
      expect(result).toContain('No podcasts found');
      expect(result).toContain('Try:');
    });

    it('should format single result', () => {
      const result = formatSearchResults([mockFeed]);
      expect(result).toContain('Found 1 podcast');
      expect(result).toContain('JavaScript Jabber');
      expect(result).toContain('by Devchat.tv');
      expect(result).toContain('Episodes: 547');
      expect(result).toContain('Language: en');
      expect(result).toContain('Feed: https://feeds.fireside.fm/javascriptjabber/rss');
      expect(result).toContain('Tip: Download episodes with');
    });

    it('should format multiple results', () => {
      const feeds = [
        mockFeed,
        { ...mockFeed, id: 2, title: 'Second Podcast', episodeCount: 100 },
      ];
      const result = formatSearchResults(feeds);
      expect(result).toContain('Found 2 podcasts');
      expect(result).toContain('1. JavaScript Jabber');
      expect(result).toContain('2. Second Podcast');
    });

    it('should strip HTML from description', () => {
      const result = formatSearchResults([mockFeed]);
      expect(result).not.toContain('<p>');
      expect(result).toContain('Weekly panel discussion');
    });

    it('should truncate long descriptions', () => {
      const longDescription = 'A '.repeat(150) + 'podcast';
      const feedWithLongDesc = { ...mockFeed, description: longDescription };
      const result = formatSearchResults([feedWithLongDesc], { descriptionLength: 50 });
      expect(result).toContain('...');
    });

    it('should handle missing episode count', () => {
      const feedNoEpisodes = { ...mockFeed, episodeCount: undefined };
      const result = formatSearchResults([feedNoEpisodes]);
      expect(result).toContain('JavaScript Jabber');
      expect(result).not.toContain('Episodes:');
    });

    it('should handle missing author', () => {
      const feedNoAuthor = { ...mockFeed, author: '', ownerName: '' };
      const result = formatSearchResults([feedNoAuthor]);
      expect(result).toContain('JavaScript Jabber');
      expect(result).not.toContain('by');
    });

    it('should use ownerName when author is missing', () => {
      const feedWithOwner = { ...mockFeed, author: '' };
      const result = formatSearchResults([feedWithOwner]);
      expect(result).toContain('by Charles Max Wood');
    });
  });

  describe('formatPodcastFeedCompact', () => {
    it('should format podcast in compact form', () => {
      const result = formatPodcastFeedCompact(mockFeed);
      expect(result).toContain('JavaScript Jabber');
      expect(result).toContain('by Devchat.tv');
      expect(result).toContain('547 episodes');
    });

    it('should handle missing fields', () => {
      const minimalFeed = { ...mockFeed, author: '', episodeCount: undefined };
      const result = formatPodcastFeedCompact(minimalFeed);
      expect(result).toBe('JavaScript Jabber');
    });
  });
});
