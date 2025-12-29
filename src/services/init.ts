import * as fs from 'fs/promises';
import * as path from 'path';
import { initStateManager, stateManager, setHomeDir, homeDir } from '../state';
import { initHttpService } from './http';

export async function initApplication(dataDir: string, configPath: string = './config.json') {
  setHomeDir(path.resolve(dataDir));
  await fs.mkdir(homeDir, { recursive: true });

  initHttpService(configPath);
  initStateManager();
  await stateManager.saveGlobal();
  
  // State persistence loop
  setInterval(async () => await stateManager.saveGlobal(), 5000);
  
  const saveAndExit = async () => {
      await stateManager.saveGlobal();
      process.exit(0);
  };
  
  process.on('SIGTERM', saveAndExit);
  // SIGINT handled by serve.ts graceful shutdown usually, but good to have backup logic if not in serve mode
}

export async function clearCache() {
  const cacheDir = path.join(homeDir, 'cache');
  await fs.rm(cacheDir, { recursive: true, force: true });
}
