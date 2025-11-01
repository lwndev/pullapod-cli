import * as fs from 'fs';
import NodeID3 from 'node-id3';
import { PodcastEpisode } from './types';

export class MetadataEmbedder {
  /**
   * Embeds artwork and metadata into an audio file
   */
  async embedMetadata(
    audioPath: string,
    artworkPath: string | undefined,
    episode: PodcastEpisode
  ): Promise<void> {
    const fileExtension = audioPath.toLowerCase().split('.').pop();

    // Only process MP3 files with node-id3
    if (fileExtension !== 'mp3') {
      console.log(`Skipping metadata embedding for .${fileExtension} file (only MP3 supported)`);
      return;
    }

    try {
      const tags: NodeID3.Tags = {
        title: episode.title,
        album: episode.podcastTitle,
        comment: {
          language: 'eng',
          text: episode.description || '',
        },
      };

      // Add artwork if available
      if (artworkPath && fs.existsSync(artworkPath)) {
        tags.image = {
          mime: this.getMimeType(artworkPath),
          type: {
            id: 3,
            name: 'front cover',
          },
          description: 'Cover',
          imageBuffer: fs.readFileSync(artworkPath),
        };
      }

      // Write tags to the file
      const success = NodeID3.write(tags, audioPath);

      if (success) {
        console.log('✓ Embedded artwork and metadata into audio file');
      } else {
        console.warn('⚠ Failed to embed metadata');
      }
    } catch (error) {
      console.warn('Failed to embed metadata:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Determines MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop();

    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };

    return mimeTypes[ext || ''] || 'image/jpeg';
  }
}
