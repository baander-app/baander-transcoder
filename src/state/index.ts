import * as fs from 'fs/promises';
import * as path from 'path';
import { CompoundIndex, Index, MemIndex } from '../indexing';
import { Config } from '../config';
import { Transcoder } from '../services/transcoder';

export let homeDir = '.baander-transcoder';

export function setHomeDir(p: string) {
  homeDir = p;
}

export let ci: CompoundIndex;

export function createIndexes(config: Config): CompoundIndex {
  const indexes: Index[] = config.folders.map(folder =>
    new MemIndex(folder.id, folder.title, folder.path, folder.scanInterval, () => true),
  );
  ci = new CompoundIndex('1', 'Home', ...indexes);
  return ci;
}

class StateManager {
  private readonly statePath: string;

  constructor() {
    this.statePath = path.join(homeDir, 'state.json');
  }

  async saveGlobal() {
    const data = {
      // Add any global state here
    };
    await fs.writeFile(this.statePath, JSON.stringify(data, null, 2));
  }

  async saveTranscoder(id: string, transcoder: Transcoder) {
    const transcoderPath = path.join(homeDir, 'transcoders', `${id}.json`);
    await fs.mkdir(path.dirname(transcoderPath), {recursive: true});
    const data = {
      id,
      inputSource: transcoder.inputSource,
      lastRequestTime: transcoder.getLastRequestTime().toJSON(),
      // Add any other transcoder state here
    };
    await fs.writeFile(transcoderPath, JSON.stringify(data, null, 2));
  }

  async save(relativePath: string, data: any) {
    const fullPath = path.join(homeDir, relativePath);
    await fs.mkdir(path.dirname(fullPath), {recursive: true});
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
  }

  async load(relativePath: string): Promise<any | null> {
    const fullPath = path.join(homeDir, relativePath);
    try {
      const data = await fs.readFile(fullPath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }
}

export let stateManager: StateManager;

export function initStateManager() {
  stateManager = new StateManager();
}
