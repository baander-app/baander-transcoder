import * as path from 'path';
import { homeDir } from '../state';

// Helper to ensure we have a consistent home directory reference
// In a worker context, homeDir might need to be set if it's not the default.
// However, since we are passing absolute paths for sessions, this is mostly for i-frames or internal defaults.

export function getCacheDir(): string {
  return path.resolve(homeDir, 'cache');
}

export function getSessionDir(sessionId: string): string {
  return path.join(getCacheDir(), 'sessions', sessionId);
}

export function getIFrameCacheDir(): string {
  return path.join(getCacheDir(), 'i-frames');
}

export function getSegmentExtension(isFmp4: boolean): string {
  return isFmp4 ? 'm4s' : 'ts';
}

export function getVideoSegmentFilename(index: number | string, isFmp4: boolean): string {
  return `${index}.${getSegmentExtension(isFmp4)}`;
}

export function getAudioSegmentFilename(index: number | string, isFmp4: boolean): string {
  return `${index}.${getSegmentExtension(isFmp4)}`;
}

export function getSegmentPrefix(isAudio: boolean, streamIndex: number | string | undefined): string {
  if (isAudio && streamIndex !== undefined) {
    return `audio_${streamIndex}_`;
  } else if (!isAudio) {
    return `video_`;
  }
  return '';
}

export function getSubtitleSegmentFilename(streamIndex: number, index: number | string): string {
  return `subtitle_${streamIndex}_${index}.vtt`;
}

export function getHlsInitFilename(isAudio: boolean, streamIndex: number = 0): string {
  return isAudio ? `init-a${streamIndex}.mp4` : 'init-v.mp4';
}

export function getDashChunkFilename(streamId: number | string, index: number | string): string {
  // streamId 0 is usually video, 1 is audio (or depends on adaptation set)
  // But strictly following the naming convention used in transcoder.ts/segmenter.ts
  return `chunk-${streamId}-${index}.m4s`;
}

export function getDashInitFilename(streamId: number | string): string {
  return `init-${streamId}.m4s`;
}

export function getDashManifestFilename(): string {
  return 'manifest.mpd';
}

// Helper to normalize paths for consistency (though node's path functions usually do this)
export function normalizePath(p: string): string {
  return path.normalize(p);
}
