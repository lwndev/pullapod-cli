import { EpisodeFilter } from '../../src/filter';
import { PodcastEpisode } from '../../src/types';

describe('EpisodeFilter', () => {
  let filter: EpisodeFilter;
  let episodes: PodcastEpisode[];

  beforeEach(() => {
    filter = new EpisodeFilter();

    // Create sample episodes
    episodes = [
      {
        title: 'Episode 1: Introduction',
        publishDate: new Date(2024, 0, 15), // Jan 15, 2024
        enclosureUrl: 'https://example.com/ep1.mp3',
        podcastTitle: 'Test Podcast',
        artwork: 'https://example.com/art1.jpg',
      },
      {
        title: 'Episode 2: Deep Dive',
        publishDate: new Date(2024, 0, 22), // Jan 22, 2024
        enclosureUrl: 'https://example.com/ep2.mp3',
        podcastTitle: 'Test Podcast',
        artwork: 'https://example.com/art2.jpg',
      },
      {
        title: 'Episode 3: Interview with Guest',
        publishDate: new Date(2024, 1, 5), // Feb 5, 2024
        enclosureUrl: 'https://example.com/ep3.mp3',
        podcastTitle: 'Test Podcast',
        artwork: 'https://example.com/art3.jpg',
      },
      {
        title: 'Episode 4: Q&A Session',
        publishDate: new Date(2024, 1, 20), // Feb 20, 2024
        enclosureUrl: 'https://example.com/ep4.mp3',
        podcastTitle: 'Test Podcast',
        artwork: 'https://example.com/art4.jpg',
      },
    ];
  });

  describe('filter by exact date', () => {
    it('should filter episodes by exact date', () => {
      const result = filter.filter(episodes, { date: '2024-01-15' });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Episode 1: Introduction');
    });

    it('should return empty array when no episodes match date', () => {
      const result = filter.filter(episodes, { date: '2024-03-01' });

      expect(result).toHaveLength(0);
    });

    it('should throw error for invalid date format', () => {
      expect(() => filter.filter(episodes, { date: 'invalid-date' }))
        .toThrow('Invalid date format');
    });

    it('should handle dates with different time components', () => {
      // Add an episode with a specific time
      const episodeWithTime: PodcastEpisode = {
        title: 'Episode with Time',
        publishDate: new Date(2024, 0, 15, 14, 30, 0), // Jan 15, 2024 at 2:30 PM
        enclosureUrl: 'https://example.com/ep.mp3',
        podcastTitle: 'Test Podcast',
      };

      const result = filter.filter([episodeWithTime], { date: '2024-01-15' });

      expect(result).toHaveLength(1);
    });

    it('should return all episodes published on the same date', () => {
      const episodesWithSameDate: PodcastEpisode[] = [
        {
          title: 'Morning Episode',
          publishDate: new Date(2024, 0, 15, 9, 0, 0), // Jan 15, 2024 9:00 AM
          enclosureUrl: 'https://example.com/morning.mp3',
          podcastTitle: 'Test Podcast',
        },
        {
          title: 'Afternoon Episode',
          publishDate: new Date(2024, 0, 15, 14, 0, 0), // Jan 15, 2024 2:00 PM
          enclosureUrl: 'https://example.com/afternoon.mp3',
          podcastTitle: 'Test Podcast',
        },
        {
          title: 'Evening Episode',
          publishDate: new Date(2024, 0, 15, 20, 0, 0), // Jan 15, 2024 8:00 PM
          enclosureUrl: 'https://example.com/evening.mp3',
          podcastTitle: 'Test Podcast',
        },
      ];

      const result = filter.filter(episodesWithSameDate, { date: '2024-01-15' });

      expect(result).toHaveLength(3);
      expect(result.map(ep => ep.title)).toContain('Morning Episode');
      expect(result.map(ep => ep.title)).toContain('Afternoon Episode');
      expect(result.map(ep => ep.title)).toContain('Evening Episode');
    });
  });

  describe('filter by date range', () => {
    it('should filter episodes within date range', () => {
      const result = filter.filter(episodes, {
        startDate: '2024-01-20',
        endDate: '2024-02-10',
      });

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Episode 2: Deep Dive');
      expect(result[1].title).toBe('Episode 3: Interview with Guest');
    });

    it('should include episodes on the start date', () => {
      const result = filter.filter(episodes, {
        startDate: '2024-01-15',
        endDate: '2024-01-20',
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Episode 1: Introduction');
    });

    it('should include episodes on the end date', () => {
      const result = filter.filter(episodes, {
        startDate: '2024-01-20',
        endDate: '2024-01-22',
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Episode 2: Deep Dive');
    });

    it('should handle only start date', () => {
      const result = filter.filter(episodes, {
        startDate: '2024-02-01',
      });

      expect(result).toHaveLength(2);
      expect(result.every(ep => ep.publishDate >= new Date(2024, 1, 1))).toBe(true);
    });

    it('should handle only end date', () => {
      const result = filter.filter(episodes, {
        endDate: '2024-01-31',
      });

      expect(result).toHaveLength(2);
      expect(result.every(ep => ep.publishDate <= new Date(2024, 0, 31))).toBe(true);
    });

    it('should throw error for invalid start date', () => {
      expect(() => filter.filter(episodes, {
        startDate: 'invalid',
        endDate: '2024-01-31',
      })).toThrow('Invalid start date format');
    });

    it('should throw error for invalid end date', () => {
      expect(() => filter.filter(episodes, {
        startDate: '2024-01-01',
        endDate: 'invalid',
      })).toThrow('Invalid end date format');
    });

    it('should return empty array when no episodes in range', () => {
      const result = filter.filter(episodes, {
        startDate: '2024-03-01',
        endDate: '2024-03-31',
      });

      expect(result).toHaveLength(0);
    });

    it('should return all episodes published on the same date within range', () => {
      const episodesWithSameDate: PodcastEpisode[] = [
        {
          title: 'Episode A',
          publishDate: new Date(2024, 0, 10), // Jan 10, 2024
          enclosureUrl: 'https://example.com/a.mp3',
          podcastTitle: 'Test Podcast',
        },
        {
          title: 'Episode B1',
          publishDate: new Date(2024, 0, 15, 9, 0, 0), // Jan 15, 2024 9:00 AM
          enclosureUrl: 'https://example.com/b1.mp3',
          podcastTitle: 'Test Podcast',
        },
        {
          title: 'Episode B2',
          publishDate: new Date(2024, 0, 15, 14, 0, 0), // Jan 15, 2024 2:00 PM
          enclosureUrl: 'https://example.com/b2.mp3',
          podcastTitle: 'Test Podcast',
        },
        {
          title: 'Episode C',
          publishDate: new Date(2024, 0, 20), // Jan 20, 2024
          enclosureUrl: 'https://example.com/c.mp3',
          podcastTitle: 'Test Podcast',
        },
      ];

      const result = filter.filter(episodesWithSameDate, {
        startDate: '2024-01-12',
        endDate: '2024-01-18',
      });

      // Should only return the two episodes from Jan 15
      expect(result).toHaveLength(2);
      expect(result.map(ep => ep.title)).toContain('Episode B1');
      expect(result.map(ep => ep.title)).toContain('Episode B2');
    });
  });

  describe('filter by name', () => {
    it('should filter episodes by name (case-insensitive)', () => {
      const result = filter.filter(episodes, { name: 'interview' });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Episode 3: Interview with Guest');
    });

    it('should filter episodes with partial match', () => {
      const result = filter.filter(episodes, { name: 'Episode' });

      expect(result).toHaveLength(4);
    });

    it('should handle uppercase search term', () => {
      const result = filter.filter(episodes, { name: 'DEEP DIVE' });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Episode 2: Deep Dive');
    });

    it('should return empty array when no matches', () => {
      const result = filter.filter(episodes, { name: 'Nonexistent' });

      expect(result).toHaveLength(0);
    });

    it('should handle special characters in search', () => {
      const result = filter.filter(episodes, { name: 'Q&A' });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Episode 4: Q&A Session');
    });
  });

  describe('combined filters', () => {
    it('should apply both date range and name filters', () => {
      const result = filter.filter(episodes, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        name: 'Episode',
      });

      expect(result).toHaveLength(2);
      expect(result.every(ep => ep.title.includes('Episode'))).toBe(true);
    });
  });

  describe('sortByDate', () => {
    it('should sort episodes by date descending (newest first)', () => {
      const sorted = filter.sortByDate(episodes);

      expect(sorted[0].title).toBe('Episode 4: Q&A Session');
      expect(sorted[sorted.length - 1].title).toBe('Episode 1: Introduction');
    });

    it('should sort episodes by date ascending (oldest first)', () => {
      const sorted = filter.sortByDate(episodes, false);

      expect(sorted[0].title).toBe('Episode 1: Introduction');
      expect(sorted[sorted.length - 1].title).toBe('Episode 4: Q&A Session');
    });

    it('should not modify original array', () => {
      const original = [...episodes];
      filter.sortByDate(episodes);

      expect(episodes).toEqual(original);
    });

    it('should handle empty array', () => {
      const sorted = filter.sortByDate([]);

      expect(sorted).toHaveLength(0);
    });

    it('should handle single episode', () => {
      const sorted = filter.sortByDate([episodes[0]]);

      expect(sorted).toHaveLength(1);
      expect(sorted[0]).toEqual(episodes[0]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty episodes array', () => {
      const result = filter.filter([], { name: 'test' });

      expect(result).toHaveLength(0);
    });

    it('should return all episodes when no filters applied', () => {
      const result = filter.filter(episodes, {});

      expect(result).toHaveLength(4);
    });

    it('should handle episodes without descriptions', () => {
      const episodeNoDesc: PodcastEpisode = {
        title: 'Episode without Description',
        publishDate: new Date(2024, 2, 1),
        enclosureUrl: 'https://example.com/ep.mp3',
        podcastTitle: 'Test Podcast',
      };

      const result = filter.filter([episodeNoDesc], { name: 'Description' });

      expect(result).toHaveLength(1);
    });
  });
});
