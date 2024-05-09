import dotenv from 'dotenv-flow';
import * as path from 'node:path';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

export const config = dotenv.config();
export const isProduction = process.env.NODE_ENV === 'production';
export const envs = process.env;
export const FFMPEG_PATH = 'C:\\Users\\Martin\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe';
export const CACHE_DIR = 'D:\\bt2\\cache';

export const STREAM_SEGMENT_GAP = process.env.STREAM_SEGMENT_GAP || 5;
export const STREAM_MAX_SEGMENTS = process.env.STREAM_MAX_SEGMENTS || 10;