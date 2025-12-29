import * as fs from 'fs/promises';
import * as path from 'path';
import * as child_process from 'child_process';
import { initStateManager, stateManager } from '../state';
import { ffmpegPath, ffprobePath } from '../services/ffmpeg';

export let homeDir = '.baander-transcoder';

export async function bootstrap(dataDir: string) {
  homeDir = path.resolve(dataDir);
  await fs.mkdir(homeDir, {recursive: true});
  child_process.spawnSync(ffmpegPath, ['-version']);
  child_process.spawnSync(ffprobePath, ['-version']);
  initStateManager();
  await stateManager.saveGlobal();
  setInterval(async () => await stateManager.saveGlobal(), 5000);
  process.on('SIGTERM', async () => {
    await stateManager.saveGlobal();
    process.exit(0);
  });
}

export async function clearCache() {
  const cacheDir = path.join(homeDir, 'cache');
  await fs.rm(cacheDir, {recursive: true, force: true});
}

const videoSuffixes = ['.mp4', '.rmvb', '.avi', '.mkv', '.flv', '.wmv', '.mov', '.mpg'];

export function filenameLooksLikeVideo(name: string): boolean {
  return videoSuffixes.some(suf => name.toLowerCase().endsWith(suf));
}

const captionSuffixes = ['.srt', '.vtt'];

export function filenameLooksLikeCaption(name: string): boolean {
  return captionSuffixes.some(suf => name.toLowerCase().endsWith(suf));
}