import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Transcoder, setTranscodeOptions } from '../../src/services/transcoder';
import { TranscodeOptions } from '../../src/config';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Mock dependencies
vi.mock('fs');
vi.mock('../../src/state');

const mockConfig: TranscodeOptions = {
  variants: [{ height: 720, bitrate: '2500k' }],
  preset: 'veryfast',
  audio: { codec: 'aac', bitrate: '128k', channels: 2 },
  trickplay: false,
  onDemand: false,
  idleTimeout: 5,
  throttleBufferSize: 300,
  minThrottleBufferSize: 60,
  segmentDuration: 5,
  hwAccel: 'cpu',
  videoCodec: 'h264',
  hlsSegmentType: 'mpegts',
  lowLatency: false,
  audioOnly: false,
  maxTranscoders: 2,
};

describe('Transcoder Service', () => {
  let transcoder: Transcoder;
  const originalProcessSend = process.send;
  const mockProcessSend = vi.fn();

  beforeEach(() => {
    process.send = mockProcessSend;
    setTranscodeOptions(mockConfig);
    transcoder = new Transcoder('test-id', 'test-file.mp4', mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.send = originalProcessSend;
    vi.restoreAllMocks();
  });

  it('should update maxSegment when segments are available', () => {
    const sessionId = 'test-session';
    // Manually inject a session
    (transcoder as any).sessions.set(sessionId, {
      id: sessionId,
      startSegment: 0,
      height: 720,
      format: 'hls',
      lastUsed: Date.now(),
      isPaused: false,
      maxSegment: -1,
    });

    transcoder.onSegmentAvailable(sessionId, 'video_0.ts');
    let session = (transcoder as any).sessions.get(sessionId);
    expect(session.maxSegment).toBe(0);

    transcoder.onSegmentAvailable(sessionId, 'video_10.ts');
    session = (transcoder as any).sessions.get(sessionId);
    expect(session.maxSegment).toBe(10);

    // Should not decrease
    transcoder.onSegmentAvailable(sessionId, 'video_5.ts');
    session = (transcoder as any).sessions.get(sessionId);
    expect(session.maxSegment).toBe(10);
  });

  it('should parse complex filenames correctly', () => {
    const sessionId = 'test-session';
    (transcoder as any).sessions.set(sessionId, {
      id: sessionId,
      startSegment: 0,
      height: 720,
      format: 'dash',
      lastUsed: Date.now(),
      isPaused: false,
      maxSegment: -1,
    });

    transcoder.onSegmentAvailable(sessionId, 'chunk-0-15.m4s');
    const session = (transcoder as any).sessions.get(sessionId);
    expect(session.maxSegment).toBe(15);
  });

  it('should send pauseSession when buffer exceeds throttleBufferSize', () => {
    const sessionId = 'test-session';
    (transcoder as any).sessions.set(sessionId, {
      id: sessionId,
      startSegment: 0,
      height: 720,
      format: 'hls',
      lastUsed: Date.now(),
      isPaused: false,
      maxSegment: 70, // 70 segments * 5s = 350s > 300s
    });

    // Request segment 0. Buffer = 70 - 0 = 70 segs = 350s.
    (transcoder as any).checkThrottling(sessionId, 'dir', 0, 'hls');

    expect(mockProcessSend).toHaveBeenCalledWith({
      type: 'pauseSession',
      sessionId: sessionId
    });
    const session = (transcoder as any).sessions.get(sessionId);
    expect(session.isPaused).toBe(true);
  });

  it('should NOT send pauseSession when buffer is within limits', () => {
    const sessionId = 'test-session';
    (transcoder as any).sessions.set(sessionId, {
      id: sessionId,
      startSegment: 0,
      height: 720,
      format: 'hls',
      lastUsed: Date.now(),
      isPaused: false,
      maxSegment: 10, // 50s < 300s
    });

    (transcoder as any).checkThrottling(sessionId, 'dir', 0, 'hls');

    expect(mockProcessSend).not.toHaveBeenCalledWith({
      type: 'pauseSession',
      sessionId: sessionId
    });
    const session = (transcoder as any).sessions.get(sessionId);
    expect(session.isPaused).toBe(false);
  });

  it('should send resumeSession when buffer drops below minThrottleBufferSize', () => {
    const sessionId = 'test-session';
    (transcoder as any).sessions.set(sessionId, {
      id: sessionId,
      startSegment: 0,
      height: 720,
      format: 'hls',
      lastUsed: Date.now(),
      isPaused: true, // Currently paused
      maxSegment: 10, // 10 segments * 5s = 50s < 60s
    });

    // Request segment 0. Buffer = 50s.
    (transcoder as any).checkThrottling(sessionId, 'dir', 0, 'hls');

    expect(mockProcessSend).toHaveBeenCalledWith({
      type: 'resumeSession',
      sessionId: sessionId
    });
    const session = (transcoder as any).sessions.get(sessionId);
    expect(session.isPaused).toBe(false);
  });

  it('should NOT send resumeSession when buffer is above minThrottleBufferSize', () => {
    const sessionId = 'test-session';
    (transcoder as any).sessions.set(sessionId, {
      id: sessionId,
      startSegment: 0,
      height: 720,
      format: 'hls',
      lastUsed: Date.now(),
      isPaused: true,
      maxSegment: 20, // 100s > 60s
    });

    (transcoder as any).checkThrottling(sessionId, 'dir', 0, 'hls');

    expect(mockProcessSend).not.toHaveBeenCalledWith({
      type: 'resumeSession',
      sessionId: sessionId
    });
    const session = (transcoder as any).sessions.get(sessionId);
    expect(session.isPaused).toBe(true);
  });

  describe('Intelligent Session Restart', () => {
    it('should restart session with headroom when requested segment is far ahead (beyond RESTART_THRESHOLD)', async () => {
      const sessionId = crypto.createHash('sha1').update('test-file.mp4-720-hls-0-').digest('hex');
      const farAheadSegmentNumber = 30; // Beyond RESTART_THRESHOLD (24)
      const expectedRestartSegment = 27; // 30 - 3 (RESTART_HEADROOM)

      // Add an existing session that's far behind
      (transcoder as any).sessions.set(sessionId, {
        id: sessionId,
        startSegment: 0,
        height: 720,
        format: 'hls',
        lastUsed: Date.now(),
        isPaused: false,
        maxSegment: 0, // Only segment 0 is available
      });

      // Add to Transcoder.instances map as well
      (Transcoder as any).instances.set(sessionId, transcoder);

      // Mock the ensureSession method to avoid actual session creation
      const ensureSessionSpy = vi.spyOn(transcoder as any, 'ensureSession').mockResolvedValue(undefined);

      // Mock process.send to track stopSession calls
      vi.clearAllMocks();

      // This should trigger the restart logic
      try {
        await (transcoder as any).getOrStartSession(720, 'hls', farAheadSegmentNumber, false);
      } catch (e) {
        // We expect this to fail since we're mocking ensureSession
      }

      // Should have sent stopSession for the old session
      expect(mockProcessSend).toHaveBeenCalledWith({
        type: 'stopSession',
        sessionId: sessionId
      });

      // Should have called ensureSession to create new session with headroom (3 segments before requested)
      expect(ensureSessionSpy).toHaveBeenCalledWith(720, 'hls', expectedRestartSegment);

      // Old session should have been cleaned up
      expect((transcoder as any).sessions.has(sessionId)).toBe(false);
      expect((Transcoder as any).instances.has(sessionId)).toBe(false);

      ensureSessionSpy.mockRestore();
    });

    it('should reuse session when requested segment is within LOOKAHEAD_THRESHOLD', async () => {
      const sessionId = crypto.createHash('sha1').update('test-file.mp4-720-hls-0-').digest('hex');
      const segmentNumber = 10; // Within LOOKAHEAD_THRESHOLD (12)

      // Add an existing session that's not too far behind
      (transcoder as any).sessions.set(sessionId, {
        id: sessionId,
        startSegment: 0,
        height: 720,
        format: 'hls',
        lastUsed: Date.now(),
        isPaused: false,
        maxSegment: 0, // Only segment 0 is available
      });

      // Should not restart the session
      const session = await (transcoder as any).getOrStartSession(720, 'hls', segmentNumber, false);

      expect(session.id).toBe(sessionId);
      expect(mockProcessSend).not.toHaveBeenCalledWith({
        type: 'stopSession',
        sessionId: sessionId
      });
    });

    it('should skip session but not restart when requested segment is between LOOKAHEAD_THRESHOLD and RESTART_THRESHOLD', async () => {
      const sessionId = crypto.createHash('sha1').update('test-file.mp4-720-hls-0-').digest('hex');
      const segmentNumber = 18; // Between LOOKAHEAD_THRESHOLD (12) and RESTART_THRESHOLD (24)

      // Add an existing session
      (transcoder as any).sessions.set(sessionId, {
        id: sessionId,
        startSegment: 0,
        height: 720,
        format: 'hls',
        lastUsed: Date.now(),
        isPaused: false,
        maxSegment: 0, // Only segment 0 is available
      });

      // Mock ensureSession to track new session creation
      const ensureSessionSpy = vi.spyOn(transcoder as any, 'ensureSession').mockResolvedValue(undefined);

      try {
        await (transcoder as any).getOrStartSession(720, 'hls', segmentNumber, false);
      } catch (e) {
        // Expected to fail due to mocking
      }

      // Should not have stopped the old session
      expect(mockProcessSend).not.toHaveBeenCalledWith({
        type: 'stopSession',
        sessionId: sessionId
      });

      // Should have created a new session at the requested segment
      expect(ensureSessionSpy).toHaveBeenCalledWith(720, 'hls', segmentNumber);

      ensureSessionSpy.mockRestore();
    });

    it('should prevent multiple concurrent session creation for same parameters', async () => {
      // Mock the createSession method to simulate slow session creation
      let createSessionCallCount = 0;
      const createSessionSpy = vi.spyOn(transcoder as any, 'createSession').mockImplementation(async (sessionId, height, format, startSegment, hashInput) => {
        createSessionCallCount++;
        // Simulate slow session creation (50ms delay)
        await new Promise(resolve => setTimeout(resolve, 50));

        // Manually add the session to the map (normally done in createSession)
        (transcoder as any).sessions.set(sessionId, {
          id: sessionId,
          startSegment,
          height,
          format,
          lastUsed: Date.now(),
          isPaused: false,
          maxSegment: -1,
        });

        return Promise.resolve();
      });

      // Start multiple concurrent requests for the same session
      const promises = [
        (transcoder as any).ensureSession(720, 'hls', 10),
        (transcoder as any).ensureSession(720, 'hls', 10),
        (transcoder as any).ensureSession(720, 'hls', 10),
        (transcoder as any).ensureSession(720, 'hls', 10),
        (transcoder as any).ensureSession(720, 'hls', 10),
      ];

      // Wait for all to complete
      await Promise.allSettled(promises);

      // Should have called createSession only once despite 5 concurrent requests
      expect(createSessionCallCount).toBe(1);

      // Should have exactly one session in the sessions map
      expect((transcoder as any).sessions.size).toBe(1);

      createSessionSpy.mockRestore();
    });

    it('should enforce maxTranscoders limit', async () => {
      // Import the getTranscoder function and transcoders map
      const { getTranscoder, transcoders } = await import('../../src/services/transcoder');

      // Set transcodeOptions to have a max of 2 transcoders
      setTranscodeOptions({
        ...mockConfig,
        maxTranscoders: 2,
      });

      // Clear any existing transcoders
      transcoders.clear();

      // Should be able to create first transcoder
      const transcoder1 = getTranscoder('video1', '/path/to/video1.mp4');
      expect(transcoder1).toBeDefined();
      expect(transcoders.size).toBe(1);

      // Should be able to create second transcoder
      const transcoder2 = getTranscoder('video2', '/path/to/video2.mp4');
      expect(transcoder2).toBeDefined();
      expect(transcoders.size).toBe(2);

      // Should NOT be able to create third transcoder (limit is 2)
      expect(() => {
        getTranscoder('video3', '/path/to/video3.mp4');
      }).toThrow('Maximum number of concurrent transcoders reached (2). Please try again later.');

      expect(transcoders.size).toBe(2); // Still only 2 transcoders
    });

    it('should reuse existing transcoder without counting towards limit', async () => {
      // Import the getTranscoder function and transcoders map
      const { getTranscoder, transcoders } = await import('../../src/services/transcoder');

      // Set transcodeOptions to have a max of 2 transcoders
      setTranscodeOptions({
        ...mockConfig,
        maxTranscoders: 2,
      });

      // Clear any existing transcoders
      transcoders.clear();

      // Create first transcoder
      const transcoder1 = getTranscoder('video1', '/path/to/video1.mp4');
      expect(transcoder1).toBeDefined();
      expect(transcoders.size).toBe(1);

      // Get the same transcoder again (should reuse, not create new)
      const transcoder1Again = getTranscoder('video1', '/path/to/video1.mp4');
      expect(transcoder1Again).toBe(transcoder1); // Same instance
      expect(transcoders.size).toBe(1); // Still only 1 transcoder

      // Should be able to create second transcoder since we only have 1 unique transcoder
      const transcoder2 = getTranscoder('video2', '/path/to/video2.mp4');
      expect(transcoder2).toBeDefined();
      expect(transcoders.size).toBe(2);

      // Should NOT be able to create third transcoder
      expect(() => {
        getTranscoder('video3', '/path/to/video3.mp4');
      }).toThrow('Maximum number of concurrent transcoders reached (2). Please try again later.');
    });
  });
});
