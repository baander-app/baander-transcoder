import * as fs from 'fs/promises';
import * as path from 'path';
import { startThumbnailing } from '../workers/segmenter';
import { logger } from './logger';
import { getVideoInfo } from './ffmpeg';

export async function generateTrickplay(input: string, outputDir: string, interval = 10): Promise<void> {
  try {
    // Check if playlist exists to avoid re-generation
    const playlistPath = path.join(outputDir, 'tiles.m3u8');
    try {
        await fs.access(playlistPath);
        // Check if input is newer?
        const statInput = await fs.stat(input);
        const statPlaylist = await fs.stat(playlistPath);
        if (statPlaylist.mtime > statInput.mtime) {
            return; // Up to date
        }
    } catch (e) {}

    logger.info(`Generating trickplay for ${input} in ${outputDir}`);
    
    await fs.mkdir(outputDir, { recursive: true });

    // 1. Generate Thumbs
    await new Promise<void>((resolve, reject) => {
        const proc = startThumbnailing(input, outputDir, interval);
        proc.on('close', (code: number) => {
            if (code === 0) resolve();
            else reject(new Error(`Thumbnail generation exited with code ${code}`));
        });
        proc.on('error', (err: Error) => reject(err));
    });
    
    // 2. Generate Playlist
    const info = await getVideoInfo(input);
    const duration = info.duration;
    const numSegments = Math.ceil(duration / interval);
    
    let m3u8 = '#EXTM3U\n';
    m3u8 += '#EXT-X-VERSION:7\n';
    m3u8 += `#EXT-X-TARGETDURATION:${interval}\n`;
    m3u8 += '#EXT-X-MEDIA-SEQUENCE:0\n';
    m3u8 += '#EXT-X-PLAYLIST-TYPE:VOD\n';
    m3u8 += '#EXT-X-IMAGES-ONLY\n';
    
    for (let i = 1; i <= numSegments; i++) {
        m3u8 += `#EXTINF:${interval.toFixed(6)},\n`;
        m3u8 += `thumb_${i}.jpg\n`;
    }
    m3u8 += '#EXT-X-ENDLIST\n';
    
    await fs.writeFile(playlistPath, m3u8);
    logger.info(`Trickplay generation complete for ${input}`);

  } catch (err) {
      logger.error(`Trickplay generation failed for ${input}: ${err}`);
      throw err;
  }
}
