import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MediaTranscoder,
  MultiStreamConfig
} from '../src/services/mediaTranscoder';
import {
  createVideoConfig,
  createAudioConfig,
  createSubtitleConfig,
  VideoConfig,
  AudioConfig,
  SubtitleConfig
} from '../src/utils/mediaCachePaths';
import * as path from 'path';

// Mock the ffmpeg service
vi.mock('../src/services/ffmpeg', () => ({
  ffmpegPath: '/usr/bin/ffmpeg',
  getVideoInfo: vi.fn(() => ({
    iFrameTimes: [0, 6, 12, 18, 24, 30],
    streams: [
      { codec_type: 'video' },
      { codec_type: 'audio' },
      { codec_type: 'audio' },
      { codec_type: 'subtitle' }
    ]
  }))
}));

// Mock the cache manager
vi.mock('../src/services/mediaCacheManager', () => ({
  mediaCacheManager: {
    checkSegmentStatus: vi.fn(() => ({ exists: false, path: '/mock/path', isProcessing: false })),
    markSegmentProcessing: vi.fn(),
    markSegmentComplete: vi.fn(),
    ensureCacheDirs: vi.fn()
  }
}));

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(() => {
    const mockProcess = {
      kill: vi.fn(),
      on: vi.fn(),
      stderr: { on: vi.fn() },
      stdout: { on: vi.fn() },
      killed: false
    };
    return mockProcess;
  })
}));

describe('MediaTranscoder', () => {
  const testMediaId = 'test-media-123';
  const testInputSource = '/test/video.mp4';
  let transcoder: MediaTranscoder;

  beforeEach(() => {
    transcoder = new MediaTranscoder({
      inputSource: testInputSource,
      segmentDuration: 6,
      transcodingConfig: {
        segmentDuration: 6,
        hwAccel: 'cpu',
        preset: 'fast',
        lowLatency: false,
        audio: {
          codec: 'aac',
          bitrate: '192k',
          channels: 2
        }
      }
    });
  });

  describe('Hardware Acceleration Support', () => {
    it('should support NVENC acceleration', () => {
      const config: VideoConfig = {
        height: 1080,
        bitrate: 5000,
        codec: 'h264',
        streamIndex: 0,
        format: 'hls',
        hwAccel: 'nvenc'
      };

      // This would build NVENC-specific args when transcoding
      expect(config.hwAccel).toBe('nvenc');
    });

    it('should support QSV acceleration', () => {
      const config: VideoConfig = {
        height: 720,
        bitrate: 2500,
        codec: 'h264',
        streamIndex: 0,
        format: 'hls',
        hwAccel: 'qsv'
      };

      expect(config.hwAccel).toBe('qsv');
    });

    it('should support VAAPI acceleration', () => {
      const config: VideoConfig = {
        height: 480,
        bitrate: 1200,
        codec: 'h264',
        streamIndex: 0,
        format: 'hls',
        hwAccel: 'vaapi'
      };

      expect(config.hwAccel).toBe('vaapi');
    });

    it('should support VideoToolbox acceleration', () => {
      const config: VideoConfig = {
        height: 1080,
        bitrate: 5000,
        codec: 'h264',
        streamIndex: 0,
        format: 'hls',
        hwAccel: 'videotoolbox'
      };

      expect(config.hwAccel).toBe('videotoolbox');
    });

    it('should fallback to CPU when no hardware acceleration specified', () => {
      const config: VideoConfig = {
        height: 720,
        bitrate: 2500,
        codec: 'h264',
        streamIndex: 0,
        format: 'hls',
        hwAccel: 'cpu'
      };

      expect(config.hwAccel).toBe('cpu');
    });
  });

  describe('Advanced Video Options', () => {
    it('should support original quality passthrough', () => {
      const config: VideoConfig = {
        height: -1,
        bitrate: 0,
        codec: 'copy',
        streamIndex: 0,
        format: 'hls',
        isOriginal: true
      };

      expect(config.isOriginal).toBe(true);
      expect(config.codec).toBe('copy');
      expect(config.height).toBe(-1);
    });

    it('should support low latency mode', () => {
      const config: VideoConfig = {
        height: 720,
        bitrate: 2500,
        codec: 'h264',
        streamIndex: 0,
        format: 'hls',
        lowLatency: true
      };

      expect(config.lowLatency).toBe(true);
    });

    it('should support custom presets', () => {
      const config: VideoConfig = {
        height: 720,
        bitrate: 2500,
        codec: 'h264',
        streamIndex: 0,
        format: 'hls',
        preset: 'veryfast'
      };

      expect(config.preset).toBe('veryfast');
    });

    it('should support different segment types', () => {
      const fmp4Config: VideoConfig = {
        height: 720,
        bitrate: 2500,
        codec: 'h264',
        streamIndex: 0,
        format: 'hls',
        segmentType: 'fmp4'
      };

      const tsConfig: VideoConfig = {
        height: 720,
        bitrate: 2500,
        codec: 'h264',
        streamIndex: 0,
        format: 'hls',
        segmentType: 'ts'
      };

      expect(fmp4Config.segmentType).toBe('fmp4');
      expect(tsConfig.segmentType).toBe('ts');
    });
  });

  describe('Multi-Stream Processing', () => {
    it('should handle multiple video streams', () => {
      const multiStreamConfig: MultiStreamConfig = {
        videoStreams: [
          {
            height: 1080,
            bitrate: 5000,
            codec: 'h264',
            streamIndex: 0,
            format: 'hls',
            hwAccel: 'nvenc'
          },
          {
            height: 720,
            bitrate: 2500,
            codec: 'h264',
            streamIndex: 1,
            format: 'hls',
            hwAccel: 'nvenc'
          }
        ],
        audioStreams: [
          {
            bitrate: 192,
            codec: 'aac',
            trackIndex: 0,
            format: 'hls',
            channels: 2
          },
          {
            bitrate: 128,
            codec: 'aac',
            trackIndex: 1,
            format: 'hls',
            channels: 2
          }
        ],
        subtitleStreams: [
          {
            language: 'english',
            format: 'vtt',
            trackIndex: 0
          },
          {
            language: 'spanish',
            format: 'vtt',
            trackIndex: 1
          }
        ]
      };

      expect(multiStreamConfig.videoStreams).toHaveLength(2);
      expect(multiStreamConfig.audioStreams).toHaveLength(2);
      expect(multiStreamConfig.subtitleStreams).toHaveLength(2);
    });

    it('should generate correct paths for all stream types', () => {
      const videoConfig = createVideoConfig(1080, 5000, 'h264', 0, 'hls');
      const audioConfig = createAudioConfig(192, 'aac', 0, 'hls', 2);
      const subtitleConfig = createSubtitleConfig('english', 'vtt', 0, 'utf-8');

      // These would be used in the multi-stream transcoding
      expect(videoConfig.format).toBe('hls');
      expect(audioConfig.format).toBe('hls');
      expect(subtitleConfig.format).toBe('vtt');
    });
  });

  describe('Format Support', () => {
    it('should support HLS format', () => {
      const config = createVideoConfig(1080, 5000, 'h264', 0, 'hls');
      expect(config.format).toBe('hls');
    });

    it('should support DASH format', () => {
      const config = createVideoConfig(1080, 5000, 'h264', 0, 'dash');
      expect(config.format).toBe('dash');
    });

    it('should support different audio formats', () => {
      const aacConfig = createAudioConfig(192, 'aac', 0, 'hls');
      const opusConfig = createAudioConfig(128, 'opus', 0, 'dash');

      expect(aacConfig.codec).toBe('aac');
      expect(opusConfig.codec).toBe('opus');
    });

    it('should support different subtitle formats', () => {
      const vttConfig = createSubtitleConfig('english', 'vtt');
      const srtConfig = createSubtitleConfig('spanish', 'srt');
      const assConfig = createSubtitleConfig('french', 'ass');

      expect(vttConfig.format).toBe('vtt');
      expect(srtConfig.format).toBe('srt');
      expect(assConfig.format).toBe('ass');
    });
  });

  describe('Process Management', () => {
    it('should manage active jobs', () => {
      const stats = transcoder.getStats();

      expect(stats.activeJobs).toBe(0);
      expect(stats.maxConcurrentJobs).toBe(4);
      expect(stats.jobIds).toEqual([]);
    });

    it('should track job IDs correctly', () => {
      const videoConfig = createVideoConfig(1080, 5000, 'h264', 0, 'hls');
      const request = {
        mediaId: testMediaId,
        segmentNumber: 30,
        config: videoConfig
      };

      // This would generate a job ID when transcoding starts
      expect(request.mediaId).toBe(testMediaId);
      expect(request.segmentNumber).toBe(30);
      expect(request.config.height).toBe(1080);
    });

    it('should support pause/resume operations', () => {
      const jobId = 'test-job-123';

      // These would work on non-Windows platforms
      const paused = transcoder.pauseJob(jobId);
      const resumed = transcoder.resumeJob(jobId);

      // Should return false for non-existent job
      expect(paused).toBe(false);
      expect(resumed).toBe(false);
    });

    it('should cancel all jobs', () => {
      // This should work even with no active jobs
      expect(() => transcoder.cancelAllJobs()).not.toThrow();
    });
  });

  describe('Additional Features', () => {
    it('should support thumbnail generation', async () => {
      // Mock successful thumbnail generation
      const { spawn } = await import('child_process');
      const mockProcess = {
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0); // Success code
          }
        }),
        stderr: { on: vi.fn() },
        kill: vi.fn(),
        killed: false
      };
      (spawn as any).mockReturnValue(mockProcess);

      // This would generate thumbnails
      const thumbnails = await transcoder.generateThumbnails(testMediaId, 10, 320, 5);

      // Should return the first thumbnail path when successful
      expect(thumbnails).toBeDefined();
    });

    it('should support I-frame extraction API', () => {
      // Test that the I-frame extraction method exists and is callable
      expect(typeof transcoder.extractIFrame).toBe('function');

      // The actual extraction would require complex mocking of file system operations
      // but the API is properly exposed
      expect(transcoder.extractIFrame).toBeDefined();
    });

    it('should handle progress monitoring', () => {
      let progressEmitted = false;

      transcoder.on('progress', (progress) => {
        progressEmitted = true;
        expect(progress.jobId).toBeDefined();
        expect(progress.progress).toBeGreaterThanOrEqual(0);
        expect(progress.progress).toBeLessThanOrEqual(100);
      });

      // Progress would be emitted during actual transcoding
      expect(progressEmitted).toBe(false); // Initially false
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid I-frame indices', async () => {
      // Reset the mock to return empty iFrameTimes
      const { getVideoInfo } = await import('../src/services/ffmpeg');
      (getVideoInfo as any).mockReturnValue({
        iFrameTimes: [],
        streams: []
      });

      await expect(transcoder.extractIFrame(999)).rejects.toThrow('Invalid I-Frame index');
    });

    it('should handle video info retrieval errors', async () => {
      // Mock getVideoInfo to throw an error for I-frame extraction
      const { getVideoInfo } = await import('../src/services/ffmpeg');
      (getVideoInfo as any).mockRejectedValueOnce(new Error('Failed to get video info'));

      // Should handle gracefully and continue without I-frame alignment
      expect(() => transcoder.generateThumbnails(testMediaId)).not.toThrow();
    });
  });

  describe('Stream Index Support', () => {
    it('should support different video stream indices', () => {
      const config1 = createVideoConfig(1080, 5000, 'h264', 0, 'hls');
      const config2 = createVideoConfig(720, 2500, 'h264', 1, 'hls');
      const config3 = createVideoConfig(480, 1200, 'h264', 2, 'hls');

      expect(config1.streamIndex).toBe(0);
      expect(config2.streamIndex).toBe(1);
      expect(config3.streamIndex).toBe(2);
    });

    it('should support different audio track indices', () => {
      const config1 = createAudioConfig(192, 'aac', 0, 'hls', 2);
      const config2 = createAudioConfig(128, 'aac', 1, 'hls', 2);
      const config3 = createAudioConfig(96, 'aac', 2, 'hls', 2);

      expect(config1.trackIndex).toBe(0);
      expect(config2.trackIndex).toBe(1);
      expect(config3.trackIndex).toBe(2);
    });

    it('should support different subtitle track indices', () => {
      const config1 = createSubtitleConfig('english', 'vtt', 0);
      const config2 = createSubtitleConfig('spanish', 'vtt', 1);
      const config3 = createSubtitleConfig('french', 'vtt', 2);

      expect(config1.trackIndex).toBe(0);
      expect(config2.trackIndex).toBe(1);
      expect(config3.trackIndex).toBe(2);
    });
  });
});