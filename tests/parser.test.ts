import { PodcastParser } from '../src/parser';
import nock from 'nock';

describe('PodcastParser', () => {
  let parser: PodcastParser;

  beforeEach(() => {
    parser = new PodcastParser();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  const sampleRSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Test Podcast</title>
    <description>A test podcast</description>
    <image>
      <url>https://example.com/podcast-art.jpg</url>
    </image>
    <item>
      <title>Episode 1</title>
      <description>First episode</description>
      <pubDate>Fri, 25 Apr 2014 09:00:00 +0000</pubDate>
      <enclosure url="https://example.com/ep1.mp3" length="83968480" type="audio/mpeg"/>
      <itunes:duration>00:58:23</itunes:duration>
      <itunes:image href="https://example.com/ep1-art.jpg"/>
    </item>
    <item>
      <title>Episode 2</title>
      <description>Second episode</description>
      <pubDate>Thu, 17 Apr 2014 09:00:00 +0000</pubDate>
      <enclosure url="https://example.com/ep2.mp3" length="81795584" type="audio/mpeg"/>
      <itunes:duration>00:56:51</itunes:duration>
    </item>
  </channel>
</rss>`;

  describe('parseFeed', () => {
    it('should successfully parse a valid RSS feed', async () => {
      nock('https://example.com')
        .get('/feed.xml')
        .reply(200, sampleRSS, { 'Content-Type': 'application/rss+xml' });

      const episodes = await parser.parseFeed('https://example.com/feed.xml');

      expect(episodes).toHaveLength(2);
      expect(episodes[0].title).toBe('Episode 1');
      expect(episodes[0].enclosureUrl).toBe('https://example.com/ep1.mp3');
      expect(episodes[0].podcastTitle).toBe('Test Podcast');
    });

    it('should include User-Agent header in requests', async () => {
      const scope = nock('https://example.com', {
        reqheaders: {
          'user-agent': 'pullapod/0.1.0',
        },
      })
        .get('/feed.xml')
        .reply(200, sampleRSS);

      await parser.parseFeed('https://example.com/feed.xml');

      expect(scope.isDone()).toBe(true);
    });

    it('should fail when feed requires User-Agent but it is missing', async () => {
      // Simulate a server that rejects requests without User-Agent (406 Not Acceptable)
      nock('https://example.com')
        .get('/strict-feed.xml')
        .reply(function () {
          const userAgent = this.req.headers['user-agent'];
          if (!userAgent || userAgent === '') {
            return [406, 'Not Acceptable'];
          }
          return [200, sampleRSS];
        });

      // Our parser should succeed because it includes User-Agent
      const episodes = await parser.parseFeed('https://example.com/strict-feed.xml');
      expect(episodes).toHaveLength(2);
    });

    it('should parse episode-specific artwork', async () => {
      nock('https://example.com')
        .get('/feed.xml')
        .reply(200, sampleRSS);

      const episodes = await parser.parseFeed('https://example.com/feed.xml');

      expect(episodes[0].artwork).toBe('https://example.com/ep1-art.jpg');
    });

    it('should fall back to podcast artwork when episode artwork is missing', async () => {
      nock('https://example.com')
        .get('/feed.xml')
        .reply(200, sampleRSS);

      const episodes = await parser.parseFeed('https://example.com/feed.xml');

      expect(episodes[1].artwork).toBe('https://example.com/podcast-art.jpg');
    });

    it('should parse publish dates correctly', async () => {
      nock('https://example.com')
        .get('/feed.xml')
        .reply(200, sampleRSS);

      const episodes = await parser.parseFeed('https://example.com/feed.xml');

      expect(episodes[0].publishDate).toBeInstanceOf(Date);
      expect(episodes[0].publishDate.getFullYear()).toBe(2014);
      expect(episodes[0].publishDate.getMonth()).toBe(3); // April (0-indexed)
      expect(episodes[0].publishDate.getDate()).toBe(25);
    });

    it('should filter out items without enclosures', async () => {
      const rssWithoutEnclosure = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Podcast</title>
    <item>
      <title>Episode with Audio</title>
      <enclosure url="https://example.com/ep1.mp3" length="1000" type="audio/mpeg"/>
    </item>
    <item>
      <title>Episode without Audio</title>
      <description>Just a text entry</description>
    </item>
  </channel>
</rss>`;

      nock('https://example.com')
        .get('/feed.xml')
        .reply(200, rssWithoutEnclosure);

      const episodes = await parser.parseFeed('https://example.com/feed.xml');

      expect(episodes).toHaveLength(1);
      expect(episodes[0].title).toBe('Episode with Audio');
    });

    it('should handle feeds with missing titles gracefully', async () => {
      const rssWithoutTitles = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <enclosure url="https://example.com/ep1.mp3" length="1000" type="audio/mpeg"/>
    </item>
  </channel>
</rss>`;

      nock('https://example.com')
        .get('/feed.xml')
        .reply(200, rssWithoutTitles);

      const episodes = await parser.parseFeed('https://example.com/feed.xml');

      expect(episodes[0].title).toBe('Untitled Episode');
      expect(episodes[0].podcastTitle).toBe('Unknown Podcast');
    });

    it('should throw error for network failures', async () => {
      nock('https://example.com')
        .get('/feed.xml')
        .replyWithError('Network error');

      await expect(parser.parseFeed('https://example.com/feed.xml'))
        .rejects
        .toThrow('Failed to parse RSS feed');
    });

    it('should throw error for 404 responses', async () => {
      nock('https://example.com')
        .get('/feed.xml')
        .reply(404, 'Not Found');

      await expect(parser.parseFeed('https://example.com/feed.xml'))
        .rejects
        .toThrow('Failed to parse RSS feed');
    });

    it('should throw error for invalid XML', async () => {
      nock('https://example.com')
        .get('/feed.xml')
        .reply(200, 'Not valid XML', { 'Content-Type': 'text/plain' });

      await expect(parser.parseFeed('https://example.com/feed.xml'))
        .rejects
        .toThrow('Failed to parse RSS feed');
    });

    it('should parse duration metadata', async () => {
      nock('https://example.com')
        .get('/feed.xml')
        .reply(200, sampleRSS);

      const episodes = await parser.parseFeed('https://example.com/feed.xml');

      expect(episodes[0].duration).toBe('00:58:23');
    });
  });
});
