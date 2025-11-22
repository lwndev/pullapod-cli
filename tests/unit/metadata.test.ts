import { MetadataEmbedder } from '../../src/metadata';
import { PodcastEpisode } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';
import NodeID3 from 'node-id3';

describe('MetadataEmbedder', () => {
  let embedder: MetadataEmbedder;
  const testDir = path.join(__dirname, 'test-metadata');

  beforeEach(() => {
    embedder = new MetadataEmbedder();

    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  const createMockEpisode = (overrides?: Partial<PodcastEpisode>): PodcastEpisode => ({
    title: 'Test Episode',
    publishDate: new Date(2024, 0, 15),
    enclosureUrl: 'https://example.com/audio.mp3',
    podcastTitle: 'Test Podcast',
    description: 'This is a test episode',
    ...overrides,
  });

  const createMockMP3File = (filePath: string): void => {
    // Create a minimal valid MP3 file structure
    // This is a very basic MP3 header
    const mp3Header = Buffer.from([
      0xFF, 0xFB, 0x90, 0x00, // MP3 sync word and header
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
    ]);

    fs.writeFileSync(filePath, mp3Header);
  };

  const createMockArtwork = (filePath: string): void => {
    // Create a minimal JPEG file
    const jpegHeader = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, // JPEG SOI and APP0
      0x00, 0x10, 0x4A, 0x46, // JFIF marker
      0x49, 0x46, 0x00, 0x01,
    ]);

    fs.writeFileSync(filePath, jpegHeader);
  };

  describe('embedMetadata', () => {
    it('should embed metadata into MP3 file', () => {
      const episode = createMockEpisode();
      const audioPath = path.join(testDir, 'test.mp3');
      const artworkPath = path.join(testDir, 'artwork.jpg');

      createMockMP3File(audioPath);
      createMockArtwork(artworkPath);

      embedder.embedMetadata(audioPath, artworkPath, episode);

      // Read back the tags
      const tags = NodeID3.read(audioPath);

      expect(tags.title).toBe('Test Episode');
      expect(tags.album).toBe('Test Podcast');
    });

    it('should embed artwork into MP3 file', () => {
      const episode = createMockEpisode();
      const audioPath = path.join(testDir, 'test.mp3');
      const artworkPath = path.join(testDir, 'artwork.jpg');

      createMockMP3File(audioPath);
      createMockArtwork(artworkPath);

      embedder.embedMetadata(audioPath, artworkPath, episode);

      // Read back the tags
      const tags = NodeID3.read(audioPath);

      expect(tags.image).toBeDefined();
      if (typeof tags.image !== 'string') {
        expect(tags.image?.mime).toBe('image/jpeg');
      }
    });

    it('should skip metadata embedding for non-MP3 files', () => {
      const episode = createMockEpisode();
      const audioPath = path.join(testDir, 'test.m4a');
      const artworkPath = path.join(testDir, 'artwork.jpg');

      fs.writeFileSync(audioPath, Buffer.from('fake m4a data'));
      createMockArtwork(artworkPath);

      // Should not throw
      embedder.embedMetadata(audioPath, artworkPath, episode);

      // File should remain unchanged
      const content = fs.readFileSync(audioPath);
      expect(content.toString()).toBe('fake m4a data');
    });

    it('should handle missing artwork gracefully', () => {
      const episode = createMockEpisode();
      const audioPath = path.join(testDir, 'test.mp3');

      createMockMP3File(audioPath);

      // Should not throw even without artwork
      embedder.embedMetadata(audioPath, undefined, episode);

      const tags = NodeID3.read(audioPath);
      expect(tags.title).toBe('Test Episode');
    });

    it('should handle non-existent artwork file', () => {
      const episode = createMockEpisode();
      const audioPath = path.join(testDir, 'test.mp3');
      const artworkPath = path.join(testDir, 'nonexistent.jpg');

      createMockMP3File(audioPath);

      // Should not throw
      embedder.embedMetadata(audioPath, artworkPath, episode);

      const tags = NodeID3.read(audioPath);
      expect(tags.title).toBe('Test Episode');
    });

    it('should embed description as comment', () => {
      const episode = createMockEpisode({
        description: 'This is a detailed description of the episode',
      });
      const audioPath = path.join(testDir, 'test.mp3');

      createMockMP3File(audioPath);

      embedder.embedMetadata(audioPath, undefined, episode);

      const tags = NodeID3.read(audioPath);
      expect(tags.comment).toBeDefined();
      if (typeof tags.comment !== 'string') {
        expect(tags.comment?.text).toContain('detailed description');
      }
    });

    it('should detect MIME type for PNG artwork', () => {
      const episode = createMockEpisode();
      const audioPath = path.join(testDir, 'test.mp3');
      const artworkPath = path.join(testDir, 'artwork.png');

      createMockMP3File(audioPath);
      // Create minimal PNG
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, // PNG signature
        0x0D, 0x0A, 0x1A, 0x0A,
      ]);
      fs.writeFileSync(artworkPath, pngHeader);

      embedder.embedMetadata(audioPath, artworkPath, episode);

      const tags = NodeID3.read(audioPath);
      if (tags.image && typeof tags.image !== 'string') {
        expect(tags.image.mime).toBe('image/png');
      }
    });

    it('should handle episodes without description', () => {
      const episode = createMockEpisode({ description: undefined });
      const audioPath = path.join(testDir, 'test.mp3');

      createMockMP3File(audioPath);

      embedder.embedMetadata(audioPath, undefined, episode);

      const tags = NodeID3.read(audioPath);
      expect(tags.title).toBe('Test Episode');
    });

    it('should handle various audio file extensions', () => {
      const episode = createMockEpisode();

      const extensions = ['mp3', 'MP3', 'Mp3'];

      for (const ext of extensions) {
        const audioPath = path.join(testDir, `test.${ext}`);
        createMockMP3File(audioPath);

        if (ext.toLowerCase() === 'mp3') {
          embedder.embedMetadata(audioPath, undefined, episode);
          const tags = NodeID3.read(audioPath);
          expect(tags.title).toBe('Test Episode');
        }

        // Clean up
        fs.unlinkSync(audioPath);
      }
    });

    it('should handle long descriptions', () => {
      const longDescription = 'A'.repeat(5000);
      const episode = createMockEpisode({ description: longDescription });
      const audioPath = path.join(testDir, 'test.mp3');

      createMockMP3File(audioPath);

      embedder.embedMetadata(audioPath, undefined, episode);

      const tags = NodeID3.read(audioPath);
      expect(tags.title).toBe('Test Episode');
    });

    it('should handle special characters in metadata', () => {
      const episode = createMockEpisode({
        title: 'Episode: Special & "Quoted" Characters',
        podcastTitle: 'Podcast™ with © Symbol',
        description: 'Description with émojis 🎵 and spëcial chars',
      });
      const audioPath = path.join(testDir, 'test.mp3');

      createMockMP3File(audioPath);

      embedder.embedMetadata(audioPath, undefined, episode);

      const tags = NodeID3.read(audioPath);
      expect(tags.title).toContain('Special');
    });

    it('should handle corrupt MP3 files gracefully', () => {
      const episode = createMockEpisode();
      const audioPath = path.join(testDir, 'corrupt.mp3');
      const artworkPath = path.join(testDir, 'artwork.jpg');

      // Create a corrupt/invalid MP3
      fs.writeFileSync(audioPath, Buffer.from('not a real mp3 file'));
      createMockArtwork(artworkPath);

      // Should not throw
      expect(() => {
        embedder.embedMetadata(audioPath, artworkPath, episode);
      }).not.toThrow();
    });
  });

  describe('MIME type detection', () => {
    it('should detect JPEG MIME type', () => {
      const episode = createMockEpisode();
      const audioPath = path.join(testDir, 'test.mp3');
      const artworkPath = path.join(testDir, 'artwork.jpg');

      createMockMP3File(audioPath);
      createMockArtwork(artworkPath);

      embedder.embedMetadata(audioPath, artworkPath, episode);

      const tags = NodeID3.read(audioPath);
      if (tags.image && typeof tags.image !== 'string') {
        expect(tags.image.mime).toBe('image/jpeg');
      }
    });

    it('should handle JPEG extension variations', () => {
      const episode = createMockEpisode();

      const extensions = ['jpg', 'jpeg', 'JPG', 'JPEG'];

      for (const ext of extensions) {
        const audioPath = path.join(testDir, 'test.mp3');
        const artworkPath = path.join(testDir, `artwork.${ext}`);

        createMockMP3File(audioPath);
        createMockArtwork(artworkPath);

        embedder.embedMetadata(audioPath, artworkPath, episode);

        const tags = NodeID3.read(audioPath);
        if (tags.image && typeof tags.image !== 'string') {
          expect(tags.image.mime).toBe('image/jpeg');
        }

        // Clean up
        fs.unlinkSync(audioPath);
        fs.unlinkSync(artworkPath);
      }
    });
  });
});
