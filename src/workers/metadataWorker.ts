import { Config } from '../config';
import { ci, createIndexes } from '../state';
import { generateTrickplay } from '../services/metadata';
import { logger } from '../services/logger';
import * as path from 'path';
import { getIFrameCacheDir } from '../utils/paths';
import { clearInterval } from 'node:timers';
import { sha256 } from '../utils/hash';

export class MetadataWorker {
  private interval: any | null = null;

  constructor(private config: Config) {
  }

  start() {
    createIndexes(this.config);
    this.runScan();
    this.interval = setInterval(() => this.runScan(), (this.config.generateMetadataInterval || 3600) * 1000);
  }

  stop() {
    clearInterval(this.interval);
  }

  async runScan() {
    logger.info('Starting metadata scan...');
    try {
      const queue = ['1'];
      while (queue.length > 0) {
        const id = queue.shift()!;
        const entries = await ci.list(id);
        for (const entry of entries) {
          if (entry.isDir) {
            queue.push(entry.id);
          } else {
            const hash = sha256(entry.path);
            const outputDir = path.join(getIFrameCacheDir(), hash);
            await generateTrickplay(entry.path, outputDir);
          }
        }
      }
      logger.info('Metadata scan completed.');
    } catch (err) {
      logger.error(`Metadata scan failed: ${err}`);
    }
  }
}
