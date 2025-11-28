/**
 * Tests for info formatter
 */

import {
  determineFeedStatus,
  formatFeedStatus,
  formatLastUpdate,
  formatRelativeTime,
  formatCategories,
  formatExplicit,
  formatMedium,
  formatDescription,
  formatPodcastInfo,
} from '../../../src/formatters/info-formatter';
import { PodcastFeed } from '../../../src/clients/podcast-index-types';

describe('info formatter', () => {
  const mockFeed: PodcastFeed = {
    id: 920666,
    title: 'JavaScript Jabber',
    url: 'https://feeds.fireside.fm/javascriptjabber/rss',
    originalUrl: 'https://feeds.fireside.fm/javascriptjabber/rss',
    link: 'https://javascriptjabber.com',
    description: '<p>Weekly panel discussion about <strong>JavaScript</strong>, front-end development, and frameworks.</p>',
    author: 'Devchat.tv',
    ownerName: 'Devchat.tv',
    image: 'https://cdn.fireside.fm/images/podcasts/artwork.jpg',
    artwork: 'https://cdn.fireside.fm/images/podcasts/artwork.jpg',
    lastUpdateTime: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
    lastCrawlTime: Math.floor(Date.now() / 1000),
    lastParseTime: Math.floor(Date.now() / 1000),
    lastGoodHttpStatusTime: Math.floor(Date.now() / 1000),
    lastHttpStatus: 200,
    contentType: 'application/rss+xml',
    itunesId: 496893300,
    language: 'en',
    type: 0,
    dead: 0,
    crawlErrors: 0,
    parseErrors: 0,
    categories: { '1': 'Technology', '2': 'Software Development' },
    locked: 0,
    explicit: false,
    podcastGuid: 'abc123',
    medium: 'podcast',
    episodeCount: 547,
  };

  describe('determineFeedStatus', () => {
    it('should return "dead" when dead flag is 1', () => {
      const deadFeed = { ...mockFeed, dead: 1 };
      expect(determineFeedStatus(deadFeed)).toBe('dead');
    });

    it('should return "active" for feed with recent episodes', () => {
      const activeFeed = {
        ...mockFeed,
        dead: 0,
        lastUpdateTime: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
      };
      expect(determineFeedStatus(activeFeed)).toBe('active');
    });

    it('should return "inactive" for feed with old episodes', () => {
      const inactiveFeed = {
        ...mockFeed,
        dead: 0,
        lastUpdateTime: Math.floor(Date.now() / 1000) - (100 * 24 * 60 * 60), // 100 days ago
      };
      expect(determineFeedStatus(inactiveFeed)).toBe('inactive');
    });

    it('should use newestItemPublishTime over lastUpdateTime when available', () => {
      const feedWithNewest = {
        ...mockFeed,
        dead: 0,
        lastUpdateTime: Math.floor(Date.now() / 1000) - (100 * 24 * 60 * 60), // 100 days ago
        newestItemPublishTime: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
      } as any;
      expect(determineFeedStatus(feedWithNewest)).toBe('active');
    });

    it('should return "inactive" when no timestamps available', () => {
      const feedWithNoTime = { ...mockFeed, dead: 0, lastUpdateTime: 0 };
      expect(determineFeedStatus(feedWithNoTime)).toBe('inactive');
    });
  });

  describe('formatFeedStatus', () => {
    it('should format active status with checkmark', () => {
      expect(formatFeedStatus('active')).toBe('Active ✓');
    });

    it('should format inactive status with warning symbol', () => {
      expect(formatFeedStatus('inactive')).toBe('Inactive ⚠');
    });

    it('should format dead status with X symbol', () => {
      expect(formatFeedStatus('dead')).toBe('Dead ✗');
    });
  });

  describe('formatLastUpdate', () => {
    it('should format timestamp with date and relative time', () => {
      const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
      const result = formatLastUpdate(oneDayAgo);
      expect(result).toMatch(/\w+ \d+, \d{4}/); // Date format
      expect(result).toContain('1 day ago');
    });

    it('should handle missing timestamp', () => {
      expect(formatLastUpdate(0)).toBe('Unknown');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format seconds as "just now"', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(formatRelativeTime(now)).toBe('just now');
      expect(formatRelativeTime(now - 30)).toBe('just now');
    });

    it('should format minutes', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(formatRelativeTime(now - 60)).toBe('1 minute ago');
      expect(formatRelativeTime(now - 120)).toBe('2 minutes ago');
      expect(formatRelativeTime(now - 3000)).toBe('50 minutes ago');
    });

    it('should format hours', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(formatRelativeTime(now - 3600)).toBe('1 hour ago');
      expect(formatRelativeTime(now - 7200)).toBe('2 hours ago');
    });

    it('should format days', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(formatRelativeTime(now - 86400)).toBe('1 day ago');
      expect(formatRelativeTime(now - 172800)).toBe('2 days ago');
    });

    it('should format weeks', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(formatRelativeTime(now - 604800)).toBe('1 week ago');
      expect(formatRelativeTime(now - 1209600)).toBe('2 weeks ago');
    });

    it('should format months', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(formatRelativeTime(now - 2592000)).toBe('1 month ago');
      expect(formatRelativeTime(now - 5184000)).toBe('2 months ago');
    });

    it('should format years', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(formatRelativeTime(now - 31536000)).toBe('1 year ago');
      expect(formatRelativeTime(now - 63072000)).toBe('2 years ago');
    });

    it('should handle invalid timestamps', () => {
      expect(formatRelativeTime(0)).toBe('unknown');
    });

    it('should handle future timestamps', () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      expect(formatRelativeTime(future)).toBe('in the future');
    });
  });

  describe('formatCategories', () => {
    it('should return category values as array', () => {
      const categories = { '1': 'Technology', '2': 'Education' };
      expect(formatCategories(categories)).toEqual(['Technology', 'Education']);
    });

    it('should return "Uncategorized" for empty categories', () => {
      expect(formatCategories({})).toEqual(['Uncategorized']);
      expect(formatCategories(undefined)).toEqual(['Uncategorized']);
    });
  });

  describe('formatExplicit', () => {
    it('should return "Explicit" for true', () => {
      expect(formatExplicit(true)).toBe('Explicit');
      expect(formatExplicit(1)).toBe('Explicit');
    });

    it('should return "Clean" for false or undefined', () => {
      expect(formatExplicit(false)).toBe('Clean');
      expect(formatExplicit(0)).toBe('Clean');
      expect(formatExplicit(undefined)).toBe('Clean');
    });
  });

  describe('formatMedium', () => {
    it('should capitalize medium string', () => {
      expect(formatMedium('podcast')).toBe('Podcast');
      expect(formatMedium('music')).toBe('Music');
      expect(formatMedium('video')).toBe('Video');
    });

    it('should default to "Podcast" for undefined', () => {
      expect(formatMedium(undefined)).toBe('Podcast');
    });
  });

  describe('formatDescription', () => {
    it('should strip HTML tags', () => {
      const html = '<p>This is a <strong>test</strong> description.</p>';
      const result = formatDescription(html);
      expect(result).toBe('This is a test description.');
    });

    it('should handle missing descriptions', () => {
      expect(formatDescription(undefined)).toBe('No description available');
      expect(formatDescription('')).toBe('No description available');
    });

    it('should handle HTML-only content', () => {
      expect(formatDescription('<p></p><br/>')).toBe('No description available');
    });
  });

  describe('formatPodcastInfo', () => {
    it('should include all required fields', () => {
      const result = formatPodcastInfo(mockFeed);

      expect(result).toContain('Podcast Information:');
      expect(result).toContain('Title:        JavaScript Jabber');
      expect(result).toContain('Author:       Devchat.tv');
      expect(result).toContain('Language:     English (en)');
      expect(result).toContain('Episodes:     547 total');
      expect(result).toContain('Feed ID:      920666');
      expect(result).toContain('iTunes ID:    496893300');
      expect(result).toContain('Feed URL:     https://feeds.fireside.fm/javascriptjabber/rss');
      expect(result).toContain('Website:      https://javascriptjabber.com');
      expect(result).toContain('Artwork:      https://cdn.fireside.fm/images/podcasts/artwork.jpg');
    });

    it('should include description section', () => {
      const result = formatPodcastInfo(mockFeed);
      expect(result).toContain('Description:');
      expect(result).toContain('Weekly panel discussion about JavaScript');
    });

    it('should include categories', () => {
      const result = formatPodcastInfo(mockFeed);
      expect(result).toContain('Categories:');
      expect(result).toContain('Technology');
    });

    it('should include content type and explicit flag', () => {
      const result = formatPodcastInfo(mockFeed);
      expect(result).toContain('Content:      Podcast (Clean)');
    });

    it('should include status', () => {
      const result = formatPodcastInfo(mockFeed);
      expect(result).toContain('Status:       Active ✓');
    });

    it('should include user guidance footer', () => {
      const result = formatPodcastInfo(mockFeed);
      expect(result).toContain('Download episodes: pullapod download --feed <feed-url> --date YYYY-MM-DD');
      expect(result).toContain('Preview episodes:  pullapod episodes <feed-url>');
    });

    it('should handle missing optional fields', () => {
      const minimalFeed: PodcastFeed = {
        ...mockFeed,
        itunesId: undefined,
        link: '',
        artwork: '',
        image: '',
        categories: {},
        episodeCount: undefined,
      };

      const result = formatPodcastInfo(minimalFeed);

      expect(result).not.toContain('iTunes ID:');
      expect(result).not.toContain('Website:');
      expect(result).toContain('Artwork:      No artwork available');
      expect(result).toContain('Uncategorized');
      expect(result).toContain('Episodes:     Unknown');
    });

    it('should use ownerName when author is missing', () => {
      const feedWithOwner: PodcastFeed = {
        ...mockFeed,
        author: '',
      };

      const result = formatPodcastInfo(feedWithOwner);
      expect(result).toContain('Author:       Devchat.tv');
    });

    it('should show "Unknown" for completely missing author', () => {
      const feedNoAuthor: PodcastFeed = {
        ...mockFeed,
        author: '',
        ownerName: '',
      };

      const result = formatPodcastInfo(feedNoAuthor);
      expect(result).toContain('Author:       Unknown');
    });
  });
});
