import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

export const IS_DEV = true;

export const SUPPORTED_VIDEO_CODECS = ['h264', 'h265', 'vp9', 'av1'] as const;
export const SUPPORTED_AUDIO_CODECS = ['aac', 'opus', 'mp3'] as const;

export type VideoCodec = typeof SUPPORTED_VIDEO_CODECS[number];
export type AudioCodec = typeof SUPPORTED_AUDIO_CODECS[number];

export interface RootFolder {
  id: string;
  title: string;
  path: string;
  scanInterval: number;
}

export interface TranscodeVariant {
  height: number;
  bitrate: string;
  original?: boolean; // Flag to indicate this is the original quality
  videoStreamIndex?: number; // Index of the video stream to use (defaults to 0)
}

export interface AudioOptions {
  codec: AudioCodec;
  bitrate: string;
  channels: number;
}

export interface TranscodeOptions {
  variants: TranscodeVariant[];
  preset: string;
  audio: AudioOptions;
  trickplay: boolean;
  onDemand: boolean;
  idleTimeout: number; // minutes
  throttleBufferSize: number; // seconds
  minThrottleBufferSize: number; // seconds
  segmentDuration: number; // seconds
  hwAccel: string; // 'cpu', 'nvenc', 'qsv', 'vaapi', 'videotoolbox'
  videoCodec: VideoCodec;
  hlsSegmentType: 'mpegts' | 'fmp4';
  lowLatency: boolean;
  audioOnly: boolean;
  maxTranscoders: number; // maximum concurrent transcoding sessions
}

export interface LoggingOptions {
  level: string;
  directory: string;
  maxSize: string;
  maxFiles: string;
}

export interface CleanupOptions {
  interval: number; // in seconds
  maxAge: number; // in seconds
  strategy: 'atime' | 'mtime';
}

export interface HttpOptions {
  rateLimit: {
    windowMs: number;
    max: number;
  };
  cacheTTL: number;
}

export interface Config {
  folders: RootFolder[];
  http?: HttpOptions;
  transcode?: TranscodeOptions;
  ffmpeg?: string;
  ffprobe?: string;
  logging?: LoggingOptions;
  cleanup?: CleanupOptions;
  iframePath?: string;
  metadataPath?: string;
  generateMetadataInterval?: number;
}

const MIN_SCAN_INTERVAL = 30;
const DEFAULT_SCAN_INTERVAL = 300;

export function getConfig(configPath: string): Config {
  const data = fs.readFileSync(configPath, 'utf8');
  const parsed: any = JSON.parse(data);

  return {
    folders: parsed.folders.map((folder: any) => {
      const expandedPath = path.resolve(folder.path.replace('~', os.homedir()));
      return {
        ...folder,
        path: expandedPath,
        id: crypto.createHash('sha1').update(expandedPath).digest('hex'),
        scanInterval: folder.scanInterval && folder.scanInterval > MIN_SCAN_INTERVAL ? folder.scanInterval : DEFAULT_SCAN_INTERVAL,
      };
    }),
    http: {
      rateLimit: {
        windowMs: parsed.http?.rateLimit?.windowMs || 60000,
        max: parsed.http?.rateLimit?.max || 100,
      },
      cacheTTL: parsed.http?.cacheTTL || 5,
    },
    transcode: {
      variants: parsed.transcode?.variants || [
        {height: 0, bitrate: '0k', original: true}, // Original quality
        {height: 1080, bitrate: '5000k'},
        {height: 720, bitrate: '2800k'},
        {height: 480, bitrate: '1400k'},
      ],
      preset: parsed.transcode?.preset || 'fast',
      audio: {
        codec: (SUPPORTED_AUDIO_CODECS.includes(parsed.transcode?.audio?.codec) ? parsed.transcode.audio.codec : 'aac'),
        bitrate: parsed.transcode?.audio?.bitrate || '192k',
        channels: parsed.transcode?.audio?.channels || 2,
      },
      trickplay: parsed.transcode?.trickplay || false,
      onDemand: parsed.transcode?.onDemand || false,
      idleTimeout: parsed.transcode?.idleTimeout || 5,
      throttleBufferSize: parsed.transcode?.throttleBufferSize || 300,
      minThrottleBufferSize: parsed.transcode?.minThrottleBufferSize || 60,
      segmentDuration: parsed.transcode?.segmentDuration || 5,
      hwAccel: parsed.transcode?.hwAccel || 'cpu',
      videoCodec: (SUPPORTED_VIDEO_CODECS.includes(parsed.transcode?.videoCodec) ? parsed.transcode.videoCodec : 'h264'),
      hlsSegmentType: parsed.transcode?.hlsSegmentType || 'fmp4',
      lowLatency: parsed.transcode?.lowLatency || false,
      audioOnly: parsed.transcode?.audioOnly || false,
      maxTranscoders: parsed.transcode?.maxTranscoders || 2,
    },
    ffmpeg: parsed.ffmpeg || 'ffmpeg',
    ffprobe: parsed.ffprobe || 'ffprobe',
    logging: {
      level: parsed.logging?.level || 'info',
      directory: parsed.logging?.directory || 'logs',
      maxSize: parsed.logging?.maxSize || '20m',
      maxFiles: parsed.logging?.maxFiles || '14d',
    },
    cleanup: {
      interval: parsed.cleanup?.interval || 600, // 10 minutes
      maxAge: parsed.cleanup?.maxAge || 86400, // 24 hours
      strategy: parsed.cleanup?.strategy || 'mtime',
    },
    iframePath: parsed.iframePath || 'metadata',
    metadataPath: parsed.metadataPath || 'trickplay',
    generateMetadataInterval: parsed.generateMetadataInterval || 3600,
  };
}