/**
 * Podcast Index API Client
 * Implements authentication and methods for interacting with the Podcast Index API
 * Documentation: https://podcastindex-org.github.io/docs-api/
 */

import { createHash } from 'crypto';
import { BaseHttpClient, HttpClientConfig } from './base-client';
import {
  PodcastIndexResponse,
  PodcastFeed,
  PodcastEpisode,
  PodcastSearchParams,
  PodcastByTitleParams,
  EpisodesByFeedIdParams,
  EpisodesByFeedUrlParams,
  RecentEpisodesParams,
  RecentFeedsParams,
  TrendingParams,
  PodcastIndexStats,
  Category,
} from './podcast-index-types';

export interface PodcastIndexClientConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
  userAgent?: string;
}

/**
 * Client for the Podcast Index API
 * Handles authentication using Amazon-style request authorization
 */
export class PodcastIndexClient extends BaseHttpClient {
  private apiKey: string;
  private apiSecret: string;
  private userAgent: string;

  constructor(config: PodcastIndexClientConfig) {
    const baseUrl = config.baseUrl || 'https://api.podcastindex.org/api/1.0';
    const userAgent = config.userAgent || 'pullapod/1.0';

    super({
      baseUrl,
      headers: {
        'User-Agent': userAgent,
      },
    } as HttpClientConfig);

    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.userAgent = userAgent;
  }

  /**
   * Generate authentication headers for Podcast Index API
   * Uses Amazon-style request authorization with SHA-1 hash
   */
  private getAuthHeaders(): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const hash = createHash('sha1')
      .update(this.apiKey + this.apiSecret + timestamp)
      .digest('hex');

    return {
      'User-Agent': this.userAgent,
      'X-Auth-Key': this.apiKey,
      'X-Auth-Date': timestamp.toString(),
      Authorization: hash,
    };
  }

  // ==================== Search Methods ====================

  /**
   * Search for podcasts by term
   * @param params Search parameters
   */
  async searchByTerm(
    params: PodcastSearchParams
  ): Promise<PodcastIndexResponse<PodcastFeed>> {
    const response = await this.get<PodcastIndexResponse<PodcastFeed>>(
      '/search/byterm',
      params as any,
      this.getAuthHeaders()
    );
    return response.data;
  }

  /**
   * Search for podcasts by title
   * @param params Search parameters
   */
  async searchByTitle(
    params: PodcastByTitleParams
  ): Promise<PodcastIndexResponse<PodcastFeed>> {
    const response = await this.get<PodcastIndexResponse<PodcastFeed>>(
      '/search/bytitle',
      params as any,
      this.getAuthHeaders()
    );
    return response.data;
  }

  // ==================== Podcast Methods ====================

  /**
   * Get podcast feed by ID
   * @param id Feed ID
   */
  async getPodcastById(id: number): Promise<PodcastIndexResponse<PodcastFeed>> {
    const response = await this.get<PodcastIndexResponse<PodcastFeed>>(
      '/podcasts/byfeedid',
      { id },
      this.getAuthHeaders()
    );
    return response.data;
  }

  /**
   * Get podcast feed by URL
   * @param url Feed URL
   */
  async getPodcastByUrl(url: string): Promise<PodcastIndexResponse<PodcastFeed>> {
    const response = await this.get<PodcastIndexResponse<PodcastFeed>>(
      '/podcasts/byfeedurl',
      { url },
      this.getAuthHeaders()
    );
    return response.data;
  }

  /**
   * Get podcast feed by iTunes ID
   * @param itunesId iTunes podcast ID
   */
  async getPodcastByItunesId(
    itunesId: number
  ): Promise<PodcastIndexResponse<PodcastFeed>> {
    const response = await this.get<PodcastIndexResponse<PodcastFeed>>(
      '/podcasts/byitunesid',
      { id: itunesId },
      this.getAuthHeaders()
    );
    return response.data;
  }

  /**
   * Get podcast feed by GUID
   * @param guid Podcast GUID
   */
  async getPodcastByGuid(guid: string): Promise<PodcastIndexResponse<PodcastFeed>> {
    const response = await this.get<PodcastIndexResponse<PodcastFeed>>(
      '/podcasts/byguid',
      { guid },
      this.getAuthHeaders()
    );
    return response.data;
  }

  /**
   * Get trending podcasts
   * @param params Optional parameters for filtering
   */
  async getTrending(
    params?: TrendingParams
  ): Promise<PodcastIndexResponse<PodcastFeed>> {
    const response = await this.get<PodcastIndexResponse<PodcastFeed>>(
      '/podcasts/trending',
      params as any,
      this.getAuthHeaders()
    );
    return response.data;
  }

  // ==================== Episode Methods ====================

  /**
   * Get episodes by feed ID
   * @param params Parameters including feed ID
   */
  async getEpisodesByFeedId(
    params: EpisodesByFeedIdParams
  ): Promise<PodcastIndexResponse<PodcastEpisode>> {
    const response = await this.get<PodcastIndexResponse<PodcastEpisode>>(
      '/episodes/byfeedid',
      params as any,
      this.getAuthHeaders()
    );
    return response.data;
  }

  /**
   * Get episodes by feed URL
   * @param params Parameters including feed URL
   */
  async getEpisodesByFeedUrl(
    params: EpisodesByFeedUrlParams
  ): Promise<PodcastIndexResponse<PodcastEpisode>> {
    const response = await this.get<PodcastIndexResponse<PodcastEpisode>>(
      '/episodes/byfeedurl',
      params as any,
      this.getAuthHeaders()
    );
    return response.data;
  }

  /**
   * Get episode by ID
   * @param id Episode ID
   */
  async getEpisodeById(id: number): Promise<PodcastIndexResponse<PodcastEpisode>> {
    const response = await this.get<PodcastIndexResponse<PodcastEpisode>>(
      '/episodes/byid',
      { id },
      this.getAuthHeaders()
    );
    return response.data;
  }

  /**
   * Get episode by GUID
   * @param guid Episode GUID
   * @param feedUrl Optional feed URL for disambiguation
   */
  async getEpisodeByGuid(
    guid: string,
    feedUrl?: string
  ): Promise<PodcastIndexResponse<PodcastEpisode>> {
    const params: any = { guid };
    if (feedUrl) {
      params.feedurl = feedUrl;
    }

    const response = await this.get<PodcastIndexResponse<PodcastEpisode>>(
      '/episodes/byguid',
      params,
      this.getAuthHeaders()
    );
    return response.data;
  }

  /**
   * Get random episodes
   * @param max Maximum number of episodes (default: 1)
   * @param lang Optional language filter
   * @param cat Optional category filter
   */
  async getRandomEpisodes(
    max: number = 1,
    lang?: string,
    cat?: string
  ): Promise<PodcastIndexResponse<PodcastEpisode>> {
    const params: any = { max };
    if (lang) params.lang = lang;
    if (cat) params.cat = cat;

    const response = await this.get<PodcastIndexResponse<PodcastEpisode>>(
      '/episodes/random',
      params,
      this.getAuthHeaders()
    );
    return response.data;
  }

  // ==================== Recent Methods ====================

  /**
   * Get recently added episodes
   * @param params Optional parameters for filtering
   */
  async getRecentEpisodes(
    params?: RecentEpisodesParams
  ): Promise<PodcastIndexResponse<PodcastEpisode>> {
    const response = await this.get<PodcastIndexResponse<PodcastEpisode>>(
      '/recent/episodes',
      params as any,
      this.getAuthHeaders()
    );
    return response.data;
  }

  /**
   * Get recently added feeds
   * @param params Optional parameters for filtering
   */
  async getRecentFeeds(
    params?: RecentFeedsParams
  ): Promise<PodcastIndexResponse<PodcastFeed>> {
    const response = await this.get<PodcastIndexResponse<PodcastFeed>>(
      '/recent/feeds',
      params as any,
      this.getAuthHeaders()
    );
    return response.data;
  }

  /**
   * Get new feeds (alias for getRecentFeeds)
   */
  async getNewFeeds(
    params?: RecentFeedsParams
  ): Promise<PodcastIndexResponse<PodcastFeed>> {
    const response = await this.get<PodcastIndexResponse<PodcastFeed>>(
      '/recent/newfeeds',
      params as any,
      this.getAuthHeaders()
    );
    return response.data;
  }

  // ==================== Stats & Categories ====================

  /**
   * Get Podcast Index statistics
   */
  async getStats(): Promise<PodcastIndexStats> {
    const response = await this.get<{ stats: PodcastIndexStats }>(
      '/stats/current',
      undefined,
      this.getAuthHeaders()
    );
    return response.data.stats;
  }

  /**
   * Get list of categories
   */
  async getCategories(): Promise<{ feeds: Category[] }> {
    const response = await this.get<{ feeds: Category[] }>(
      '/categories/list',
      undefined,
      this.getAuthHeaders()
    );
    return response.data;
  }

  // ==================== Hub/Add Methods ====================

  /**
   * Notify the index that a feed has been updated
   * @param feedUrl URL of the podcast feed
   */
  async notifyFeedUpdate(feedUrl: string): Promise<any> {
    const response = await this.get(
      '/hub/pubnotify',
      { url: feedUrl },
      this.getAuthHeaders()
    );
    return response.data;
  }

  /**
   * Add a new podcast feed to the index
   * Note: Requires appropriate API permissions
   * @param feedUrl URL of the podcast feed to add
   */
  async addFeed(feedUrl: string): Promise<any> {
    const response = await this.get(
      '/add/byfeedurl',
      { url: feedUrl },
      this.getAuthHeaders()
    );
    return response.data;
  }
}
