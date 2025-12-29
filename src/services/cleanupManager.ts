import * as fs from 'fs/promises';
import * as path from 'path';
import { CleanupOptions } from '../config';
import { logger } from './logger';
import { homeDir } from '../state';
import { getCacheDir } from '../utils/paths';

export class CleanupManager {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(private options: CleanupOptions) {}

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`Starting CleanupManager (interval: ${this.options.interval}s, maxAge: ${this.options.maxAge}s)`);
    this.runCleanup(); // Run immediately on start
    this.intervalId = setInterval(() => this.runCleanup(), this.options.interval * 1000);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info('CleanupManager stopped');
  }

  private async runCleanup() {
    logger.info('Running scheduled cleanup...');
    const cacheDir = getCacheDir();
    try {
      await this.cleanupDirectory(cacheDir);
      logger.info('Cleanup completed.');
    } catch (err) {
      logger.error(`Error during cleanup: ${err}`);
    }
  }

  private async cleanupDirectory(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await this.cleanupDirectory(fullPath);
          // Try to remove the directory if it's empty
          try {
             const files = await fs.readdir(fullPath);
             if (files.length === 0) {
                 await fs.rmdir(fullPath);
                 logger.debug(`Removed empty directory: ${fullPath}`);
             }
          } catch (e) {
              // Ignore error if directory is not empty or can't be removed
          }
        } else if (entry.isFile()) {
          await this.checkAndDeleteFile(fullPath);
        }
      }
    } catch (err) {
       // If directory doesn't exist (e.g. cache not created yet), just ignore
       if ((err as any).code !== 'ENOENT') {
           throw err;
       }
    }
  }

  private async checkAndDeleteFile(filePath: string) {
    try {
      const stats = await fs.stat(filePath);
      const time = this.options.strategy === 'atime' ? stats.atime : stats.mtime;
      const ageInSeconds = (Date.now() - time.getTime()) / 1000;
      
      if (ageInSeconds > this.options.maxAge) {
        await fs.unlink(filePath);
        logger.info(`Deleted old file: ${filePath} (Age: ${Math.round(ageInSeconds)}s, Strategy: ${this.options.strategy})`);
      }
    } catch (err) {
      logger.error(`Failed to process file ${filePath}: ${err}`);
    }
  }
}
