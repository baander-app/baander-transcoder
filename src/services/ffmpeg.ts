import * as child_process from 'child_process';
import * as fs from 'fs/promises';
import * as fssync from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as crypto from 'crypto';
import { mediaTranscodeOptions } from '../services/mediaTranscoder';
import { homeDir } from '../state';
import { getCacheDir, getIFrameCacheDir } from '../utils/paths';
import { logger } from './logger';
import { QueueManager } from '../queue/queueManager';
import { queueManager } from './queueManager';
import { sha256 } from '../utils/hash';

export let ffmpegPath = 'ffmpeg';
export let ffprobePath = 'ffprobe';

const MAX_PROBES = 5;
const PROBE_TIMEOUT = 1800; // 30 minutes

export function setFFmpegPaths(ffmpeg: string, ffprobe: string) {
  ffmpegPath = ffmpeg;
  ffprobePath = ffprobe;
}

const exec = util.promisify(child_process.exec);

function hashArgs(args: string[]): string {
  return crypto.createHash('sha1').update(args.join('\n')).digest('hex');
}

export const videoInfoCache = new Map<string, VideoInfo>();

interface PendingProbe {
  promise: Promise<VideoInfo>;
  resolve: (info: VideoInfo) => void;
  reject: (err: any) => void;
}

const pendingProbes = new Map<string, PendingProbe>();

const probeQueue = new QueueManager<string>({
  name: 'probes',
  concurrency: MAX_PROBES,
}, async (filePath, signal, updateProgress) => {
  try {
    const info = await executeProbe(filePath, signal);
    const pending = pendingProbes.get(filePath);
    if (pending) {
      pending.resolve(info);
    }
  } catch (err) {
    const pending = pendingProbes.get(filePath);
    if (pending) {
      pending.reject(err);
    }
    throw err;
  } finally {
    pendingProbes.delete(filePath);
  }
});

probeQueue.start();
queueManager.register('probes', probeQueue);

async function runCommand(command: string, args: string[], signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const spawnOptions: child_process.SpawnOptions = {
      shell: true,
      stdio: 'pipe',
    };
    if (signal) {
      spawnOptions.signal = signal;
    }

    const proc = child_process.spawn(command, args, spawnOptions);
    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    })
    ;
    proc.on('close', (code) => {
      if (signal?.aborted) return; // Already handled by error event usually, but just in case
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      if (err.name === 'AbortError') {
        reject(err);
      } else {
        reject(new Error(`Failed to spawn command: ${err.message}`));
      }
    });
  });
}

async function executeProbe(filePath: string, signal?: AbortSignal): Promise<VideoInfo> {
  logger.debug(`Starting probe for ${filePath}`);
  const fileHash = sha256(filePath);
  const metadataPath = path.join(getIFrameCacheDir(), `${fileHash}.json`);

  return new Promise<VideoInfo>(async (resolve, reject) => {
    // We handle custom timeout here in addition to signal, but signal usually implies user cancelled or shutdown.
    // If TaskQueue handles concurrency, we might want a timeout relative to start of execution.
    const timer = setTimeout(() => {
      reject(new Error(`Probe timeout for ${filePath}`));
    }, PROBE_TIMEOUT * 1000);

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Aborted'));
      });
    }

    try {
      const stdout = await runCommand(ffprobePath, ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath], signal);
      const info = JSON.parse(stdout);
      if (!info.format || !info.format.duration) throw new Error('No duration');
      const videoStream = info.streams.find((s: any) => s.codec_type === 'video');
      if (!videoStream) throw new Error('No video stream');
      const duration = parseFloat(info.format.duration);
      const stat = await fs.stat(filePath);
      const vi: VideoInfo = {
        duration,
        lastModified: stat.mtime,
        width: videoStream.width,
        height: videoStream.height,
        codec: videoStream.codec_name,
        streams: info.streams,
        format: info.format,
      };

      if (videoStream.avg_frame_rate) {
        const [num, den] = videoStream.avg_frame_rate.split('/');
        if (den && parseInt(den) !== 0) {
          vi.frameRate = parseInt(num) / parseInt(den);
        }
      }

      if (mediaTranscodeOptions.trickplay) {
        const iframeOut = await runCommand(ffprobePath, [
          '-select_streams', 'v',
          '-show_packets',
          '-show_entries', 'packet=pts_time,flags',
          '-of', 'json',
          filePath,
        ], signal);
        const iframeData = JSON.parse(iframeOut);
        vi.iFrameTimes = iframeData.packets
          .filter((p: any) => p.flags && p.flags.includes('K'))
          .map((p: any) => parseFloat(p.pts_time));
      }

      // Save to metadata
      await fs.mkdir(path.dirname(metadataPath), {recursive: true});
      await fs.writeFile(metadataPath, JSON.stringify(vi));

      videoInfoCache.set(filePath, vi);
      clearTimeout(timer);
      resolve(vi);
    } catch (err) {
      clearTimeout(timer);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export async function getVideoInfo(filePath: string): Promise<VideoInfo> {
  if (videoInfoCache.has(filePath)) {
    return videoInfoCache.get(filePath)!;
  }

  const fileHash = sha256(filePath);
  const metadataPath = path.join(getIFrameCacheDir(), `${fileHash}.json`);

  try {
    const data = await fs.readFile(metadataPath, 'utf8');
    const cachedInfo = JSON.parse(data);
    const stat = await fs.stat(filePath);
    if (new Date(cachedInfo.lastModified).getTime() === stat.mtime.getTime()) {
      // Validate that cached info has the required streams data
      if (cachedInfo.streams && Array.isArray(cachedInfo.streams) && cachedInfo.streams.length > 0) {
        videoInfoCache.set(filePath, cachedInfo);
        return cachedInfo;
      }
    }
  } catch (e) {
    // Ignore cache miss/error
  }

  // Check if already pending
  if (pendingProbes.has(filePath)) {
    return pendingProbes.get(filePath)!.promise;
  }

  // Enqueue
  let resolve!: (info: VideoInfo) => void;
  let reject!: (err: any) => void;
  const promise = new Promise<VideoInfo>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  pendingProbes.set(filePath, {promise, resolve, reject});
  probeQueue.add(filePath, filePath);

  return promise;
}


export async function getFramePath(file: string, time: number): Promise<string> {
  const args = [
    '-timelimit', '15',
    '-loglevel', 'error',
    '-ss', `${time}.0`,
    '-i', file,
    '-vf', 'scale=320:-1',
    '-frames:v', '1',
    '-f', 'image2',
    'pipe:1',
  ];
  return await ensureCachedArtifact(args, 'frames');
}

export async function getCaptionPath(file: string): Promise<string> {
  const args = [
    '-i', file,
    '-f', 'webvtt',
    'pipe:1',
  ];
  return await ensureCachedArtifact(args, 'captions');
}

export async function getDownloadPath(file: string, start: string | null, duration: string | null): Promise<string> {
  if (!start || !duration) {
    return file;
  }
  const ext = path.extname(file);
  const base = path.basename(file, ext);
  const clipName = `${base}_${start}_${duration}${ext}`;
  const outFile = path.join(homeDir, clipName);

  if (fssync.existsSync(outFile)) {
    return outFile;
  }

  const args = ['-y', '-ss', start, '-t', duration, '-i', file, '-c:v', 'copy', '-c:a', 'copy', outFile];
  await runCommand(ffmpegPath, args);
  return outFile;
}

export async function startDirectStream(file: string, start?: string): Promise<child_process.ChildProcess> {
  const info = await getVideoInfo(file);
  const args = [];
  if (start) {
    args.push('-ss', start);
  }
  args.push('-i', file);

  // Video Codec Check
  const isH264 = info.codec === 'h264';
  if (isH264) {
    args.push('-c:v', 'copy');
  } else {
    args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23');
  }

  // Audio Codec Check
  const audioStream = info.streams.find(s => s.codec_type === 'audio');
  let isAudioCompatible = false;
  if (audioStream) {
    isAudioCompatible = ['aac', 'mp3'].includes(audioStream.codec_name);
  }

  if (isAudioCompatible) {
    args.push('-c:a', 'copy');
  } else {
    args.push('-c:a', 'aac', '-b:a', '128k', '-ac', '2');
  }

  args.push(
    '-movflags', 'frag_keyframe+empty_moov',
    '-f', 'mp4',
    'pipe:1',
  );

  return child_process.spawn(ffmpegPath, args);
}

async function ensureCachedArtifact(args: string[], cacheSubDir: string): Promise<string> {
  const key = hashArgs(args);
  const cachePath = path.join(getCacheDir(), cacheSubDir, key);
  if (fssync.existsSync(cachePath)) {
    return cachePath;
  }
  await fs.mkdir(path.dirname(cachePath), {recursive: true});
  const tempPath = `${cachePath}.tmp`;
  const cmd = [ffmpegPath, ...args];
  const proc = child_process.spawn(cmd[0], cmd.slice(1));
  const writeStream = fssync.createWriteStream(tempPath);
  proc.stdout.pipe(writeStream);

  // Capture stderr for debugging
  let stderr = '';
  proc.stderr.on('data', data => {
    stderr += data.toString();
  });

  return new Promise((resolve, reject) => {
    proc.on('close', async (code) => {
      if (code === 0) {
        try {
          await fs.rename(tempPath, cachePath);
          resolve(cachePath);
        } catch (err) {
          reject(new Error(`Failed to rename cache file: ${(err as Error).message}`));
        }
      } else {
        reject(new Error(`ffmpeg exited with code ${code}. Stderr: ${stderr}`));
      }
    });
    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
    });
    writeStream.on('error', (err) => {
      proc.kill();
      reject(new Error(`Write stream error: ${err.message}`));
    });
  });
}

export interface StreamInfo {
  index: number;
  codec_type: 'video' | 'audio' | 'subtitle';
  codec_name: string;
  codec_long_name?: string;
  profile?: string;
  level?: number;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  duration?: string;
  bit_rate?: string;
  channels?: number;
  channel_layout?: string;
  sample_rate?: string;
  tags?: Record<string, string>;
}

export interface VideoInfo {
  duration: number;
  lastModified: Date;
  width: number;
  height: number;
  codec: string;
  iFrameTimes?: number[];
  frameRate?: number;
  streams: StreamInfo[];
  format: {
    duration: string;
    size: string;
    bit_rate: string;
    format_name: string;
    tags?: Record<string, string>;
  };
}
