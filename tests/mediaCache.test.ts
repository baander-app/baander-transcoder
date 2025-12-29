import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'path';
import {
  mediaCachePaths,
  createVideoConfig,
  createAudioConfig,
  createSubtitleConfig,
  VideoConfig,
  AudioConfig,
  SubtitleConfig
} from '../src/utils/mediaCachePaths';
import { mediaCacheManager } from '../src/services/mediaCacheManager';

describe('Media Cache System', () => {
  const testMediaId = 'test-media-123';
  const testSegmentNumber = 30;

  describe('MediaCachePaths', () => {
    it('should generate correct video segment paths', () => {
      const config = createVideoConfig(1080, 5000, 'h264', 0, 'hls');
      const generatedPath = mediaCachePaths.getVideoSegmentPath(testMediaId, config, testSegmentNumber);
      const expectedPath = path.join('cache', testMediaId, 'video', '1080p_5000kbps_h264_0', 'seg30.m4s');

      expect(generatedPath).toBe(expectedPath);
    });

    it('should generate correct audio segment paths', () => {
      const config = createAudioConfig(192, 'aac', 0, 'hls', 2);
      const generatedPath = mediaCachePaths.getAudioSegmentPath(testMediaId, config, testSegmentNumber);
      const expectedPath = path.join('cache', testMediaId, 'audio', '192kbps_aac_0', 'seg30.m4s');

      expect(generatedPath).toBe(expectedPath);
    });

    it('should generate correct subtitle segment paths', () => {
      const config = createSubtitleConfig('english', 'vtt', 0, 'utf-8');
      const generatedPath = mediaCachePaths.getSubtitleSegmentPath(testMediaId, config, testSegmentNumber);
      const expectedPath = path.join('cache', testMediaId, 'subtitles', 'english_vtt_0', 'seg30.vtt');

      expect(generatedPath).toBe(expectedPath);
    });

    it('should generate different paths for different configurations', () => {
      const config1 = createVideoConfig(1080, 5000, 'h264', 0, 'hls');
      const config2 = createVideoConfig(720, 2500, 'h264', 0, 'hls');

      const path1 = mediaCachePaths.getVideoSegmentPath(testMediaId, config1, testSegmentNumber);
      const path2 = mediaCachePaths.getVideoSegmentPath(testMediaId, config2, testSegmentNumber);

      expect(path1).not.toBe(path2);
      expect(path1).toContain('1080p_5000kbps_h264_0');
      expect(path2).toContain('720p_2500kbps_h264_0');
    });

    it('should generate HLS manifest paths', () => {
      const config = createVideoConfig(1080, 5000, 'h264', 0, 'hls');
      const generatedManifestPath = mediaCachePaths.getHlsManifestPath(testMediaId, config);
      const expectedManifestPath = path.join('cache', testMediaId, 'manifests', 'hls', '1080p_5000kbps_h264_0.m3u8');

      expect(generatedManifestPath).toBe(expectedManifestPath);
    });
  });

  describe('MediaCacheManager', () => {
    beforeEach(() => {
      // Clear any processing state
      // Note: This would require access to private methods in a real implementation
    });

    it('should return non-existent status for missing segment', async () => {
      const config = createVideoConfig(1080, 5000, 'h264', 0, 'hls');
      const request = {
        mediaId: testMediaId,
        segmentNumber: testSegmentNumber,
        config
      };

      const status = await mediaCacheManager.checkSegmentStatus(request);

      expect(status.exists).toBe(false);
      expect(status.path).toBeDefined();
      expect(status.isProcessing).toBe(false);
    });

    it('should handle different segment types correctly', async () => {
      const videoConfig = createVideoConfig(1080, 5000, 'h264', 0, 'hls');
      const audioConfig = createAudioConfig(192, 'aac', 0, 'hls', 2);
      const subtitleConfig = createSubtitleConfig('english', 'vtt', 0, 'utf-8');

      const videoRequest = { mediaId: testMediaId, segmentNumber: testSegmentNumber, config: videoConfig };
      const audioRequest = { mediaId: testMediaId, segmentNumber: testSegmentNumber, config: audioConfig };
      const subtitleRequest = { mediaId: testMediaId, segmentNumber: testSegmentNumber, config: subtitleConfig };

      const videoStatus = await mediaCacheManager.checkSegmentStatus(videoRequest);
      const audioStatus = await mediaCacheManager.checkSegmentStatus(audioRequest);
      const subtitleStatus = await mediaCacheManager.checkSegmentStatus(subtitleRequest);

      // All should not exist initially
      expect(videoStatus.exists).toBe(false);
      expect(audioStatus.exists).toBe(false);
      expect(subtitleStatus.exists).toBe(false);

      // Paths should be different for different types (even when they don't exist)
      expect(videoStatus.path).toContain(path.sep + 'video' + path.sep);
      expect(audioStatus.path).toContain(path.sep + 'audio' + path.sep);
      expect(subtitleStatus.path).toContain(path.sep + 'subtitles' + path.sep);
    });

    it('should track processing segments correctly', async () => {
      const config = createVideoConfig(1080, 5000, 'h264', 0, 'hls');
      const request = {
        mediaId: testMediaId,
        segmentNumber: testSegmentNumber,
        config
      };

      // Mark as processing
      mediaCacheManager.markSegmentProcessing(request);

      const status = await mediaCacheManager.checkSegmentStatus(request);
      expect(status.isProcessing).toBe(true);

      // Mark as complete
      mediaCacheManager.markSegmentComplete(request);

      const statusAfterComplete = await mediaCacheManager.checkSegmentStatus(request);
      expect(statusAfterComplete.isProcessing).toBe(false);
    });
  });

  describe('Config Creation', () => {
    it('should create video configs with correct defaults', () => {
      const config = createVideoConfig(1080, 5000, 'h264');

      expect(config).toEqual({
        height: 1080,
        bitrate: 5000,
        codec: 'h264',
        streamIndex: 0,
        format: 'hls'
      });
    });

    it('should create audio configs with correct defaults', () => {
      const config = createAudioConfig(192, 'aac');

      expect(config).toEqual({
        bitrate: 192,
        codec: 'aac',
        trackIndex: 0,
        format: 'hls',
        channels: 2
      });
    });

    it('should create subtitle configs with correct defaults', () => {
      const config = createSubtitleConfig('english', 'vtt');

      expect(config).toEqual({
        language: 'english',
        format: 'vtt',
        trackIndex: 0,
        encoding: 'utf-8'
      });
    });
  });
});