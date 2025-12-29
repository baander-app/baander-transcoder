import * as fs from 'fs/promises';
import * as fssync from 'fs';
import * as path from 'path';
import { Config } from '../config';
import { logger } from './logger';
import { getCacheDir } from '../utils/paths';

export async function validatePaths(config: Config) {
  const errors: string[] = [];

  // 1. Verify ffmpeg and ffprobe paths
  if (config.ffmpeg) {
    try {
      await fs.access(config.ffmpeg, fssync.constants.X_OK);
    } catch (e) {
      // It might be in PATH, try 'where' or 'which' is too complex cross-platform reliably without spawning
      // So we assume if it's just 'ffmpeg', it's in path. If it's a path, we check it.
      if (path.isAbsolute(config.ffmpeg) || config.ffmpeg.includes('/') || config.ffmpeg.includes('\\')) {
         errors.push(`FFmpeg executable not found or not executable at: ${config.ffmpeg}`);
      }
    }
  }

  if (config.ffprobe) {
    try {
      await fs.access(config.ffprobe, fssync.constants.X_OK);
    } catch (e) {
      if (path.isAbsolute(config.ffprobe) || config.ffprobe.includes('/') || config.ffprobe.includes('\\')) {
        errors.push(`FFprobe executable not found or not executable at: ${config.ffprobe}`);
      }
    }
  }

  // 2. Validate cache directory
  const cacheDir = getCacheDir();
  try {
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.access(cacheDir, fssync.constants.W_OK);
  } catch (e) {
    errors.push(`Cache directory is not writable or cannot be created: ${cacheDir}. Error: ${(e as Error).message}`);
  }

  // 3. Check log directory
  if (config.logging && config.logging.directory) {
     const logDir = path.resolve(config.logging.directory);
     try {
       await fs.mkdir(logDir, { recursive: true });
       await fs.access(logDir, fssync.constants.W_OK);
     } catch (e) {
       errors.push(`Log directory is not writable or cannot be created: ${logDir}. Error: ${(e as Error).message}`);
     }
  }

  if (errors.length > 0) {
    logger.error('Startup path validation failed:');
    errors.forEach(err => logger.error(`- ${err}`));
    // We strictly throw to prevent starting in a bad state
    throw new Error(`Startup path validation failed with ${errors.length} errors.`);
  }

  logger.info('Startup path validation passed.');
}
