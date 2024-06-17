import dotenv from 'dotenv-flow';
import * as path from 'node:path';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

export const config = dotenv.config();
export const isProduction = process.env.NODE_ENV === 'production';
export const envs = process.env;
export const FFMPEG_PATH = 'C:\\Users\\Martin\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe';
export const CACHE_DIR = 'D:\\baander-transcoder\\cache';

export const STREAM_SEGMENT_GAP = process.env.STREAM_SEGMENT_GAP || 5;
export const STREAM_MAX_SEGMENTS = process.env.STREAM_MAX_SEGMENTS || 10;

export const KEYFRAMES_DIR = path.join(process.cwd(), 'storage', 'keyframes');
export const MEDIA_REPORTS_DIR = path.join(process.cwd(), 'storage', 'media-reports');
export const TRANSCODE_DIR = path.join(process.cwd(), 'storage', 'transcodes');
export const MAX_TRANSCODES = process.env.MAX_TRANSCODES ? parseInt(process.env.MAX_TRANSCODES) : 3;
