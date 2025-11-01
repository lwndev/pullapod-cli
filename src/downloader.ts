import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import cliProgress from 'cli-progress';
import { PodcastEpisode } from './types';
import { sanitizeForFilesystem, getFileExtension, formatBytes } from './utils';

export class Downloader {
  /**
   * Downloads an episode and its artwork
   */
  async downloadEpisode(
    episode: PodcastEpisode,
    outputDir: string
  ): Promise<{ audioPath: string; artworkPath?: string }> {
    // Create podcast-specific directory
    const podcastDir = path.join(
      outputDir,
      sanitizeForFilesystem(episode.podcastTitle)
    );

    if (!fs.existsSync(podcastDir)) {
      fs.mkdirSync(podcastDir, { recursive: true });
    }

    // Sanitize episode title for filename
    const safeTitle = sanitizeForFilesystem(episode.title);
    const audioExt = getFileExtension(episode.enclosureUrl);
    const audioPath = path.join(podcastDir, `${safeTitle}.${audioExt}`);

    console.log(`\nDownloading: ${episode.title}`);
    console.log(`Published: ${episode.publishDate.toLocaleDateString()}`);

    // Download audio file
    await this.downloadFile(episode.enclosureUrl, audioPath);

    // Download artwork if available
    let artworkPath: string | undefined;
    if (episode.artwork) {
      const artworkExt = getFileExtension(episode.artwork);
      artworkPath = path.join(podcastDir, `${safeTitle}.${artworkExt}`);

      try {
        console.log('Downloading artwork...');
        await this.downloadFile(episode.artwork, artworkPath, false);
      } catch (error) {
        console.warn('Failed to download artwork:', error instanceof Error ? error.message : 'Unknown error');
        artworkPath = undefined;
      }
    }

    return { audioPath, artworkPath };
  }

  /**
   * Downloads a file with progress indication
   */
  private async downloadFile(
    url: string,
    outputPath: string,
    showProgress = true
  ): Promise<void> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    let progressBar: cliProgress.SingleBar | null = null;

    if (showProgress && totalBytes > 0) {
      progressBar = new cliProgress.SingleBar({
        format: 'Progress |{bar}| {percentage}% | {value}/{total} {unit}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
      });

      const totalMB = totalBytes / (1024 * 1024);
      progressBar.start(Math.round(totalMB * 100) / 100, 0, { unit: 'MB' });
    }

    const writer = fs.createWriteStream(outputPath);
    let downloadedBytes = 0;

    const readable = Readable.fromWeb(response.body as any);

    readable.on('data', (chunk: Buffer) => {
      downloadedBytes += chunk.length;

      if (progressBar && totalBytes > 0) {
        const downloadedMB = downloadedBytes / (1024 * 1024);
        progressBar.update(Math.round(downloadedMB * 100) / 100);
      }
    });

    try {
      await pipeline(readable, writer);

      if (progressBar) {
        progressBar.stop();
      }

      console.log(`✓ Downloaded: ${path.basename(outputPath)} (${formatBytes(downloadedBytes)})`);
    } catch (error) {
      if (progressBar) {
        progressBar.stop();
      }

      // Clean up partial download
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }

      throw error;
    }
  }
}
