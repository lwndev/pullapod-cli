export interface PodcastEpisode {
  title: string;
  publishDate: Date;
  enclosureUrl: string;
  description?: string;
  artwork?: string;
  podcastTitle: string;
  duration?: string;
}

export interface FilterOptions {
  date?: string;
  startDate?: string;
  endDate?: string;
  name?: string;
}

export interface DownloadOptions {
  outputDir: string;
  feedUrl: string;
  filterOptions: FilterOptions;
}
