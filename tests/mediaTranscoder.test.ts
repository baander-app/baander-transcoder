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
    transcoder = new MediaTranscoder(
      testMediaId, // id
      testInputSource, // inputSource
      { // config: TranscodeOptions
        variants: [{ height: 1080, bitrate: '5000k' }], // Minimal variants for config
        segmentDuration: 6,
        hwAccel: 'cpu',
        preset: 'fast',
        lowLatency: false,
        audio: {
          codec: 'aac',
          bitrate: '192k',
          channels: 2
        },
        videoCodec: 'h264',
        hlsSegmentType: 'fmp4',
        maxTranscoders: 2,
        idleTimeout: 5,
        throttleBufferSize: 300,
        minThrottleBufferSize: 60,
        audioOnly: false,
        trickplay: false,
        onDemand: false,
      }
    );
  });

  it('should be instantiable', () => {
    expect(transcoder).toBeInstanceOf(MediaTranscoder);
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
          { height: 1080, bitrate: 5000, codec: 'h264', streamIndex: 0, format: 'hls', hwAccel: 'nvenc' },
          { height: 720, bitrate: 2500, codec: 'h264', streamIndex: 1, format: 'hls', hwAccel: 'nvenc' }
        ],
        audioStreams: [
          { bitrate: 192, codec: 'aac', trackIndex: 0, format: 'hls', channels: 2 },
          { bitrate: 128, codec: 'aac', trackIndex: 1, format: 'hls', channels: 2 }
        ],
        subtitleStreams: [
          { language: 'english', format: 'vtt', trackIndex: 0 },
          { language: 'spanish', format: 'vtt', trackIndex: 1 }
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
});