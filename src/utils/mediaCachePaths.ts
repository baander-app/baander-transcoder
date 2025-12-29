import path from 'path';
import * as fs from 'node:fs';

export interface VideoConfig {
  height: number;
  bitrate: number;
  codec: string;
  streamIndex: number;
  format: 'hls' | 'dash';
  hwAccel?: 'nvenc' | 'qsv' | 'vaapi' | 'videotoolbox' | 'cpu';
  preset?: string;
  lowLatency?: boolean;
  isOriginal?: boolean; // For passthrough mode
  segmentType?: 'fmp4' | 'ts'; // Output segment type
}

export interface AudioConfig {
  bitrate: number;
  codec: string;
  trackIndex: number;
  format: 'hls' | 'dash';
  channels: number;
  segmentType?: 'fmp4' | 'ts';
}

export interface SubtitleConfig {
  language: string;
  format: 'vtt' | 'srt' | 'ass' | 'webvtt';
  trackIndex: number;
  encoding?: 'utf-8' | 'utf-16';
}

export interface SegmentRequest {
  mediaId: string;
  segmentNumber: number;
  config: VideoConfig | AudioConfig | SubtitleConfig;
}

export interface SegmentStatus {
  exists: boolean;
  path?: string;
  isProcessing?: boolean;
  error?: string;
}

export class MediaCachePaths {
  constructor(private readonly baseCacheDir: string = 'cache') {
  }

  // Video segment paths
  getVideoSegmentDir(mediaId: string, config: VideoConfig): string {
    const configDir = `${config.height}p_${config.bitrate}kbps_${config.codec}_${config.streamIndex}`;
    return path.join(this.baseCacheDir, mediaId, 'video', configDir);
  }

  getVideoSegmentPath(mediaId: string, config: VideoConfig, segmentNumber: number): string {
    const extension = config.segmentType === 'ts' ? 'ts' : 'm4s';
    return path.join(this.getVideoSegmentDir(mediaId, config), `seg${segmentNumber}.${extension}`);
  }

  // Audio segment paths
  getAudioSegmentDir(mediaId: string, config: AudioConfig): string {
    const configDir = `${config.bitrate}kbps_${config.codec}_${config.trackIndex}`;
    return path.join(this.baseCacheDir, mediaId, 'audio', configDir);
  }

  getAudioSegmentPath(mediaId: string, config: AudioConfig, segmentNumber: number): string {
    const extension = config.segmentType === 'ts' ? 'ts' : 'm4s';
    return path.join(this.getAudioSegmentDir(mediaId, config), `seg${segmentNumber}.${extension}`);
  }

  // Subtitle segment paths
  getSubtitleSegmentDir(mediaId: string, config: SubtitleConfig): string {
    const configDir = `${config.language}_${config.format}_${config.trackIndex}`;
    return path.join(this.baseCacheDir, mediaId, 'subtitles', configDir);
  }

  getSubtitleSegmentPath(mediaId: string, config: SubtitleConfig, segmentNumber: number): string {
    return path.join(this.getSubtitleSegmentDir(mediaId, config), `seg${segmentNumber}.${config.format}`);
  }

  // Manifest paths
  getManifestDir(mediaId: string): string {
    return path.join(this.baseCacheDir, mediaId, 'manifests');
  }

  getHlsManifestPath(mediaId: string, config: VideoConfig): string {
    const configDir = `${config.height}p_${config.bitrate}kbps_${config.codec}_${config.streamIndex}`;
    return path.join(this.getManifestDir(mediaId), 'hls', `${configDir}.m3u8`);
  }

  getDashManifestPath(mediaId: string, config: VideoConfig): string {
    const configDir = `${config.height}p_${config.bitrate}kbps_${config.codec}_${config.streamIndex}`;
    return path.join(this.getManifestDir(mediaId), 'dash', `${configDir}.mpd`);
  }

  getMultilanguageHlsMasterPath(mediaId: string): string {
    return path.join(this.getManifestDir(mediaId), 'hls', 'multilanguage_master.m3u8');
  }

  getMultilanguageDashManifestPath(mediaId: string): string {
    return path.join(this.getManifestDir(mediaId), 'dash', 'multilanguage.mpd');
  }

  // Init segment paths
  getVideoInitSegmentPath(mediaId: string, config: VideoConfig): string {
    const configDir = `${config.height}p_${config.bitrate}kbps_${config.codec}_${config.streamIndex}`;
    return path.join(this.getVideoSegmentDir(mediaId, config), 'init-v.mp4');
  }

  getAudioInitSegmentPath(mediaId: string, config: AudioConfig): string {
    const configDir = `${config.bitrate}kbps_${config.codec}_${config.trackIndex}`;
    return path.join(this.getAudioSegmentDir(mediaId, config), `init-a${config.trackIndex}.mp4`);
  }

  // Helper methods
  getMediaCacheDir(mediaId: string): string {
    return path.join(this.baseCacheDir, mediaId);
  }

  ensureCacheDirs(mediaId: string): void {
    const dirs = [
      path.join(this.baseCacheDir, mediaId, 'video'),
      path.join(this.baseCacheDir, mediaId, 'audio'),
      path.join(this.baseCacheDir, mediaId, 'subtitles'),
      path.join(this.baseCacheDir, mediaId, 'manifests', 'hls'),
      path.join(this.baseCacheDir, mediaId, 'manifests', 'dash'),
    ];

    dirs.forEach(dir => {
      fs.mkdirSync(dir, {recursive: true});
    });
  }
}

// Export singleton instance
export const mediaCachePaths = new MediaCachePaths();

// Utility functions for creating configs from transcode options
export function createVideoConfig(
  height: number,
  bitrate: number,
  codec: string,
  streamIndex: number = 0,
  format: 'hls' | 'dash' = 'hls',
): VideoConfig {
  return {height, bitrate, codec, streamIndex, format};
}

export function createAudioConfig(
  bitrate: number,
  codec: string,
  trackIndex: number = 0,
  format: 'hls' | 'dash' = 'hls',
  channels: number = 2,
): AudioConfig {
  return {bitrate, codec, trackIndex, format, channels};
}

export function createSubtitleConfig(
  language: string,
  format: 'vtt' | 'srt' | 'ass' | 'webvtt' = 'vtt',
  trackIndex: number = 0,
  encoding: 'utf-8' | 'utf-16' = 'utf-8',
): SubtitleConfig {
  return {language, format, trackIndex, encoding};
}