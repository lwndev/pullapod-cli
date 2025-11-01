import { PodcastEpisode, FilterOptions } from './types';
import { parseDate, isDateInRange } from './utils';

export class EpisodeFilter {
  /**
   * Filters episodes based on provided criteria
   */
  filter(episodes: PodcastEpisode[], options: FilterOptions): PodcastEpisode[] {
    let filtered = [...episodes];

    // Filter by exact date
    if (options.date) {
      const targetDate = parseDate(options.date);
      if (!targetDate) {
        throw new Error(`Invalid date format: ${options.date}`);
      }

      filtered = filtered.filter(episode => {
        const episodeDate = new Date(episode.publishDate);
        return (
          episodeDate.getFullYear() === targetDate.getFullYear() &&
          episodeDate.getMonth() === targetDate.getMonth() &&
          episodeDate.getDate() === targetDate.getDate()
        );
      });
    }

    // Filter by date range
    if (options.startDate || options.endDate) {
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (options.startDate) {
        const parsedStart = parseDate(options.startDate);
        if (!parsedStart) {
          throw new Error(`Invalid start date format: ${options.startDate}`);
        }
        startDate = parsedStart;
      }

      if (options.endDate) {
        const parsedEnd = parseDate(options.endDate);
        if (!parsedEnd) {
          throw new Error(`Invalid end date format: ${options.endDate}`);
        }
        endDate = parsedEnd;
      }

      filtered = filtered.filter(episode =>
        isDateInRange(episode.publishDate, startDate, endDate)
      );
    }

    // Filter by episode name (case-insensitive, partial match)
    if (options.name) {
      const searchTerm = options.name.toLowerCase();
      filtered = filtered.filter(episode =>
        episode.title.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }

  /**
   * Sorts episodes by publish date (newest first)
   */
  sortByDate(episodes: PodcastEpisode[], descending = true): PodcastEpisode[] {
    return [...episodes].sort((a, b) => {
      const diff = a.publishDate.getTime() - b.publishDate.getTime();
      return descending ? -diff : diff;
    });
  }
}
