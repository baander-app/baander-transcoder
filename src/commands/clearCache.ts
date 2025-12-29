import * as commander from 'commander';
import { bootstrap, clearCache } from '../video';
import { logger } from '../services/logger';

export function registerClearCacheCommand(program: commander.Command) {
  const clearCacheCmd = program.command('clear-cache');
  clearCacheCmd.option('-d, --data-dir <path>', 'data directory', '.baander-transcoder');
  clearCacheCmd.action(async (options) => {
    await bootstrap(options.dataDir);
    await clearCache();
    logger.info('Cache cleared');
  });
}
