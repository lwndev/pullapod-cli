import Parser from 'rss-parser';
import { PodcastEpisode } from './types';

export class PodcastParser {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      customFields: {
        feed: ['image'],
        item: [
          ['itunes:image', 'itunesImage'],
          ['itunes:duration', 'duration'],
          ['media:content', 'mediaContent'],
        ],
      },
      headers: {
        'User-Agent': 'pullapod/0.1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
  }

  /**
   * Fetches and parses a podcast RSS feed
   */
  async parseFeed(feedUrl: string): Promise<PodcastEpisode[]> {
    try {
      const feed = await this.parser.parseURL(feedUrl);
      const podcastTitle = feed.title || 'Unknown Podcast';

      // Get podcast-level artwork
      let podcastArtwork: string | undefined;
      if (feed.image?.url) {
        // Handle case where url might be an array
        podcastArtwork = Array.isArray(feed.image.url) ? feed.image.url[0] : feed.image.url;
      } else if (feed.itunes?.image) {
        podcastArtwork = feed.itunes.image;
      }

      const episodes: PodcastEpisode[] = feed.items
        .filter(item => item.enclosure?.url) // Only items with audio
        .map(item => {
          // Try to get episode-specific artwork, fall back to podcast artwork
          let artwork = podcastArtwork;
          if (item.itunes?.image) {
            artwork = item.itunes.image;
          } else if ((item as any).itunesImage?.href) {
            artwork = (item as any).itunesImage.href;
          }

          return {
            title: item.title || 'Untitled Episode',
            publishDate: item.pubDate ? new Date(item.pubDate) : new Date(),
            enclosureUrl: item.enclosure!.url,
            description: item.contentSnippet || item.content,
            artwork,
            podcastTitle,
            duration: (item as any).duration || item.itunes?.duration,
          };
        });

      return episodes;
    } catch (error) {
      throw new Error(`Failed to parse RSS feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
