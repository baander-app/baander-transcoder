import * as commander from 'commander';
import { logger } from '../services/logger';
import path from 'path';
import fs from 'fs/promises';
import { homeDir } from '../state';

export function registerClearCacheCommand(program: commander.Command) {
  const clearCacheCmd = program.command('clear-cache');
  clearCacheCmd.option('-d, --data-dir <path>', 'data directory', '.baander-transcoder');
  clearCacheCmd.action(async (options) => {
    path.resolve(options.datadir);

    const cacheDir = path.join(homeDir, 'cache');
    await fs.rm(cacheDir, {recursive: true, force: true});

    logger.info('Cache cleared');
  });
}
