import { describe, it, expect, vi } from 'vitest';
import { 
  getSessionDir, 
  getVideoSegmentFilename, 
  getAudioSegmentFilename, 
  getSubtitleSegmentFilename, 
  getHlsInitFilename, 
  getDashChunkFilename, 
  getDashInitFilename,
  getDashManifestFilename,
  getIFrameCacheDir,
  getSegmentExtension
} from '../../src/utils/paths';
import * as path from 'path';

// Mock state to control homeDir
vi.mock('../../src/state', () => ({
  homeDir: '/test/home'
}));

describe('Path Utils', () => {
  it('should generate correct session directory', () => {
    const sessionId = 'test-session-123';
    const dir = getSessionDir(sessionId);
    // path.resolve might add drive letter on windows, but the structure should be correct
    expect(dir).toContain(path.normalize('cache/sessions/test-session-123'));
  });

  it('should generate correct iframe cache directory', () => {
    const dir = getIFrameCacheDir();
    expect(dir).toContain(path.normalize('cache/i-frames'));
  });

  it('should generate correct video segment filename', () => {
    expect(getVideoSegmentFilename(5, false)).toBe(`5.${getSegmentExtension(false)}`);
    expect(getVideoSegmentFilename(10, true)).toBe(`10.${getSegmentExtension(true)}`);
    expect(getVideoSegmentFilename('%d', false)).toBe(`%d.${getSegmentExtension(false)}`);
  });

  it('should generate correct audio segment filename', () => {
    expect(getAudioSegmentFilename(5, false)).toBe(`5.${getSegmentExtension(false)}`);
    expect(getAudioSegmentFilename(10, true)).toBe(`10.${getSegmentExtension(true)}`);
  });

  it('should generate correct subtitle segment filename', () => {
    expect(getSubtitleSegmentFilename(0, 5)).toBe('subtitle_0_5.vtt');
  });

  it('should generate correct HLS init filename', () => {
    expect(getHlsInitFilename(false)).toBe('init-v.mp4');
    expect(getHlsInitFilename(true, 0)).toBe('init-a0.mp4');
    expect(getHlsInitFilename(true, 1)).toBe('init-a1.mp4');
  });

  it('should generate correct DASH filenames', () => {
    expect(getDashChunkFilename(0, 5)).toBe('chunk-0-5.m4s');
    expect(getDashInitFilename(0)).toBe('init-0.m4s');
    expect(getDashManifestFilename()).toBe('manifest.mpd');
  });
});
