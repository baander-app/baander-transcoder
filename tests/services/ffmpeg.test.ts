import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as ffmpegService from '../../src/services/ffmpeg';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import { Readable } from 'stream';

// Mock child_process
const mockSpawn = vi.fn();
vi.mock('child_process', () => ({
  spawn: (...args: any[]) => mockSpawn(...args),
  exec: vi.fn(),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  stat: vi.fn(),
  mkdir: vi.fn(),
}));

// Mock transcoder options
vi.mock('../../src/services/transcoder', () => ({
  transcodeOptions: {
    trickplay: false
  }
}));

vi.mock('../../src/services/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }
}));

// Helper to create a mock child process
function createMockProcess(stdoutData: string, exitCode = 0, delay = 0) {
  const proc = new EventEmitter() as any;
  proc.stdout = new Readable({
    read() {
      this.push(stdoutData);
      this.push(null);
    }
  });
  proc.stderr = new Readable({
    read() {
        this.push(null);
    }
  });
  
  // Simulate async execution
  setTimeout(() => {
    proc.emit('close', exitCode);
  }, delay);

  return proc;
}

describe('FFmpeg Service Probe Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset cache
    (ffmpegService.videoInfoCache as Map<any, any>).clear();
    
    // Default fs mocks
    (fs.stat as any).mockResolvedValue({ mtime: new Date() });
    (fs.readFile as any).mockRejectedValue(new Error('ENOENT')); // Cache miss on disk
    (fs.mkdir as any).mockResolvedValue(undefined);
    (fs.writeFile as any).mockResolvedValue(undefined);
  });

  it('should probe a file successfully', async () => {
    const mockOutput = JSON.stringify({
      format: { duration: "100.0" },
      streams: [{ codec_type: 'video', width: 1920, height: 1080, codec_name: 'h264' }]
    });

    mockSpawn.mockReturnValue(createMockProcess(mockOutput));

    const info = await ffmpegService.getVideoInfo('test.mp4');
    expect(info.duration).toBe(100);
    expect(mockSpawn).toHaveBeenCalledTimes(1);
  });

  it('should deduplicate concurrent requests for the same file', async () => {
    const mockOutput = JSON.stringify({
      format: { duration: "100.0" },
      streams: [{ codec_type: 'video', width: 1920, height: 1080, codec_name: 'h264' }]
    });

    mockSpawn.mockReturnValue(createMockProcess(mockOutput, 0, 50)); // Add delay

    const p1 = ffmpegService.getVideoInfo('duplicate.mp4');
    const p2 = ffmpegService.getVideoInfo('duplicate.mp4');

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBe(r2);
    expect(mockSpawn).toHaveBeenCalledTimes(1);
  });

  it('should limit concurrent probes', async () => {
    const mockOutput = JSON.stringify({
        format: { duration: "10.0" },
        streams: [{ codec_type: 'video', width: 100, height: 100, codec_name: 'h264' }]
    });

    // We want to control when the processes finish to test concurrency.
    // Instead of simple setTimeout, we'll use a manual trigger mechanism or just generic delay.
    // Given the simplicity, we'll rely on the fact that if we start 10 with delay, they should queue.
    
    // Actually, we can just spy on mockSpawn and see how many times it was called BEFORE we await the results,
    // but that's racy.
    // Better: Mock spawn to return a process that finishes quickly but we fire 10 requests immediately.
    
    // We can't easily pause execution inside the black box.
    // However, we can check the implementation of queue. 
    // Let's assume the max is 5 (hardcoded in source).
    
    // We will launch 10 probes with 200ms delay.
    // Check call count immediately (should be 5).
    
    let spawnCount = 0;
    mockSpawn.mockImplementation(() => {
        spawnCount++;
        return createMockProcess(mockOutput, 0, 100);
    });

    const promises = [];
    for (let i = 0; i < 10; i++) {
        promises.push(ffmpegService.getVideoInfo(`video${i}.mp4`));
    }

    // Allow fs.readFile/stat promises to resolve and queueing to happen
    await new Promise(r => setTimeout(r, 50));

    expect(mockSpawn).toHaveBeenCalledTimes(5);

    // We can't easily wait for the rest without controlling the mock processes, 
    // but verifying the cap is the most important part.
    // To cleanly exit, we can wait for all.
    await Promise.allSettled(promises);
  });

  it('should handle probe errors gracefully', async () => {
      mockSpawn.mockReturnValue(createMockProcess('', 1)); // Exit code 1
      
      await expect(ffmpegService.getVideoInfo('fail.mp4')).rejects.toThrow();
  });
});
