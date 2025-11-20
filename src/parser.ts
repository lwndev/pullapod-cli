import Parser from 'rss-parser';
import { PodcastEpisode } from './types';

interface CustomItem {
  itunesImage?: { $?: { href?: string }; href?: string } | string;
  duration?: string;
}

export class PodcastParser {
  private parser: Parser<Record<string, never>, CustomItem>;

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

      // Debug: Ensure feed was returned
      if (!feed) {
        throw new Error('Parser returned null or undefined feed');
      }
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
          if (item.itunesImage) {
            // itunesImage can be an object with attributes ($), direct href, or a string
            if (typeof item.itunesImage === 'object') {
              // xml2js puts attributes in $ property
              if ('$' in item.itunesImage && item.itunesImage.$?.href) {
                artwork = item.itunesImage.$.href;
              } else if ('href' in item.itunesImage && item.itunesImage.href) {
                artwork = item.itunesImage.href;
              }
            } else if (typeof item.itunesImage === 'string') {
              artwork = item.itunesImage;
            }
          }

          return {
            title: item.title || 'Untitled Episode',
            publishDate: item.pubDate ? new Date(item.pubDate) : new Date(),
            enclosureUrl: item.enclosure!.url,
            description: item.contentSnippet || item.content,
            artwork,
            podcastTitle,
            duration: item.duration,
          };
        });

      return episodes;
    } catch (error) {
      // Enhanced error reporting for debugging
      const errorDetails = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null
          ? JSON.stringify(error)
          : String(error);
      throw new Error(`Failed to parse RSS feed: ${errorDetails}`);
    }
  }
}
