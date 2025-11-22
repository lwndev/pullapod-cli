/**
 * Tests for episodes formatter
 */

import {
  formatDuration,
  formatPublishDate,
  formatDescription,
  formatEpisode,
  formatEpisodesList,
} from '../../../src/formatters/episodes-formatter';
import { PodcastEpisode } from '../../../src/clients/podcast-index-types';

describe('episodes formatter', () => {
  const mockEpisode: PodcastEpisode = {
    id: 1,
    title: 'Test Episode',
    link: 'https://example.com/episode1',
    description: '<p>This is a <strong>test</strong> episode with HTML tags.</p>',
    guid: 'episode1',
    datePublished: 1705320000, // Jan 15, 2024 12:00 PM UTC
    datePublishedPretty: 'January 15, 2024 12:00pm',
    dateCrawled: 1705320000,
    enclosureUrl: 'https://example.com/episode1.mp3',
    enclosureType: 'audio/mpeg',
    enclosureLength: 52428800,
    duration: 3120, // 52 minutes
    explicit: 0,
    episode: 1,
    image: 'https://example.com/episode1.jpg',
    feedItunesId: 123456,
    feedImage: 'https://example.com/podcast.jpg',
    feedId: 1,
    feedTitle: 'Test Podcast',
    feedLanguage: 'en',
  };

  describe('formatDuration', () => {
    it('should format seconds (< 60)', () => {
      expect(formatDuration(45)).toBe('45 sec');
      expect(formatDuration(1)).toBe('1 sec');
      expect(formatDuration(59)).toBe('59 sec');
    });

    it('should format minutes (60-3599)', () => {
      expect(formatDuration(60)).toBe('1 min');
      expect(formatDuration(120)).toBe('2 min');
      expect(formatDuration(3120)).toBe('52 min');
      expect(formatDuration(3599)).toBe('59 min');
    });

    it('should format hours and minutes (>= 3600)', () => {
      expect(formatDuration(3600)).toBe('1h');
      expect(formatDuration(3660)).toBe('1h 1min');
      expect(formatDuration(4980)).toBe('1h 23min');
      expect(formatDuration(7200)).toBe('2h');
      expect(formatDuration(7380)).toBe('2h 3min');
    });

    it('should handle zero or invalid durations', () => {
      expect(formatDuration(0)).toBe('N/A');
      expect(formatDuration(-1)).toBe('N/A');
    });
  });

  describe('formatPublishDate', () => {
    it('should format Unix timestamp to readable date', () => {
      // Use midday timestamps to avoid timezone issues
      const jan15Midday = 1705320000; // Jan 15, 2024 12:00 PM UTC
      const jan8Midday = 1704715200; // Jan 8, 2024 12:00 PM UTC

      const result1 = formatPublishDate(jan15Midday);
      const result2 = formatPublishDate(jan8Midday);

      // Check that it contains the expected format elements
      expect(result1).toMatch(/Jan.*15.*2024/);
      expect(result2).toMatch(/Jan.*8.*2024/);
    });

    it('should handle invalid timestamps', () => {
      expect(formatPublishDate(0)).toBe('Unknown date');
    });
  });

  describe('formatDescription', () => {
    it('should strip HTML tags', () => {
      const html = '<p>This is a <strong>test</strong> episode.</p>';
      const result = formatDescription(html, false);
      expect(result).toContain('This is a test episode.');
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('<strong>');
    });

    it('should truncate to ~150 characters by default', () => {
      const longText = 'A'.repeat(200);
      const result = formatDescription(longText, false);
      expect(result.length).toBeLessThanOrEqual(153); // 150 + "..."
      expect(result).toContain('...');
    });

    it('should not truncate when full=true', () => {
      const longText = 'A'.repeat(200);
      const result = formatDescription(longText, true);
      expect(result.length).toBe(200);
      expect(result).not.toContain('...');
    });

    it('should truncate at word boundaries', () => {
      const text = 'This is a very long description that should be truncated at a word boundary and not in the middle of a word because that would look very unprofessional.';
      const result = formatDescription(text, false);
      // Should not cut mid-word
      expect(result).toMatch(/\s\.\.\.$|[a-z]\.\.\.$|[A-Z]\.\.\.$/);
      expect(result).not.toMatch(/[a-z][A-Z]/); // No mid-word cuts
    });

    it('should handle empty or missing descriptions', () => {
      expect(formatDescription('', false)).toBe('No description available');
      expect(formatDescription(null as any, false)).toBe('No description available');
    });

    it('should handle HTML-only descriptions (no actual content)', () => {
      const htmlOnly = '<p></p><br/><div></div>';
      const result = formatDescription(htmlOnly, false);
      expect(result).toBe('No description available');
    });

    it('should decode HTML entities', () => {
      const html = 'This &amp; that, &quot;quoted&quot;, &lt;tag&gt;';
      const result = formatDescription(html, false);
      expect(result).toContain('This & that');
      expect(result).toContain('"quoted"');
      expect(result).toContain('<tag>');
    });
  });

  describe('formatEpisode', () => {
    it('should format a complete episode', () => {
      const result = formatEpisode(mockEpisode, 1, false);

      expect(result).toContain('1. Test Episode');
      expect(result).toMatch(/Published:.*Jan.*15.*2024/);
      expect(result).toContain('Duration: 52 min');
      expect(result).toContain('URL: https://example.com/episode1.mp3');
      expect(result).toContain('This is a test episode with HTML tags.');
    });

    it('should show full description when showFullDescription=true', () => {
      const longDesc = 'A'.repeat(200);
      const episodeWithLongDesc = { ...mockEpisode, description: longDesc };

      const truncated = formatEpisode(episodeWithLongDesc, 1, false);
      const full = formatEpisode(episodeWithLongDesc, 1, true);

      expect(truncated).toContain('...');
      expect(full).not.toContain('...');
      expect(full.length).toBeGreaterThan(truncated.length);
    });

    it('should properly indent all fields', () => {
      const result = formatEpisode(mockEpisode, 1, false);
      const lines = result.split('\n');

      // First line (title) should not be indented
      expect(lines[0]).toMatch(/^1\. /);

      // All other lines should be indented with 3 spaces
      for (let i = 1; i < lines.length; i++) {
        expect(lines[i]).toMatch(/^ {3}/);
      }
    });

    it('should handle episodes with missing fields', () => {
      const incompleteEpisode = {
        ...mockEpisode,
        duration: 0,
        description: '',
      };

      const result = formatEpisode(incompleteEpisode, 1, false);

      expect(result).toContain('Duration: N/A');
      expect(result).toContain('No description available');
    });
  });

  describe('formatEpisodesList', () => {
    const mockEpisodes: PodcastEpisode[] = [
      mockEpisode,
      {
        ...mockEpisode,
        id: 2,
        title: 'Episode 2',
        datePublished: 1704672000,
      },
    ];

    it('should format a list of episodes with header and footer', () => {
      const result = formatEpisodesList(mockEpisodes, 'Test Podcast', false);

      expect(result).toContain('Recent episodes from "Test Podcast":');
      expect(result).toContain('1. Test Episode');
      expect(result).toContain('2. Episode 2');
      expect(result).toContain('---');
      expect(result).toContain('Showing 2 episodes');
      expect(result).toContain('Download with:');
    });

    it('should handle empty episodes list', () => {
      const result = formatEpisodesList([], 'Test Podcast', false);
      expect(result).toBe('No episodes found.');
    });

    it('should show "all available" when fewer episodes than requested', () => {
      const result = formatEpisodesList(mockEpisodes, 'Test Podcast', false, 10);
      expect(result).toContain('Showing 2 episodes (all available)');
    });

    it('should show "use --max to show more" when no max specified', () => {
      const result = formatEpisodesList(mockEpisodes, 'Test Podcast', false);
      expect(result).toContain('use --max to show more');
    });

    it('should not show "use --max" when requestedMax is provided', () => {
      const result = formatEpisodesList(mockEpisodes, 'Test Podcast', false, 2);
      expect(result).not.toContain('use --max to show more');
    });

    it('should pass full description flag to episode formatter', () => {
      const longDesc = 'A'.repeat(200);
      const episodesWithLongDesc = mockEpisodes.map((ep) => ({
        ...ep,
        description: longDesc,
      }));

      const truncated = formatEpisodesList(episodesWithLongDesc, 'Test Podcast', false);
      const full = formatEpisodesList(episodesWithLongDesc, 'Test Podcast', true);

      expect(truncated).toContain('...');
      expect(full).not.toContain('...');
    });

    it('should include download instructions', () => {
      const result = formatEpisodesList(mockEpisodes, 'Test Podcast', false);
      expect(result).toContain('Download with: pullapod download --feed <feed-url> --date YYYY-MM-DD --name "episode title"');
    });

    it('should number episodes starting from 1', () => {
      const result = formatEpisodesList(mockEpisodes, 'Test Podcast', false);
      expect(result).toContain('1. Test Episode');
      expect(result).toContain('2. Episode 2');
      expect(result).not.toContain('0.');
    });

    it('should add blank lines between episodes', () => {
      const result = formatEpisodesList(mockEpisodes, 'Test Podcast', false);
      const lines = result.split('\n');

      // Find episode titles
      const episode1Index = lines.findIndex((line) => line.includes('1. Test Episode'));
      const episode2Index = lines.findIndex((line) => line.includes('2. Episode 2'));

      // Check there are multiple lines between episodes (including blank line)
      expect(episode2Index - episode1Index).toBeGreaterThan(1);
    });
  });
});
