import { Service } from '@tsed/di';
import * as path from 'node:path';
import * as fse from 'fs-extra';
import { KEYFRAMES_DIR } from '../../../config/envs';

@Service()
export class KeyFrameStorageService {
  async find(sha256: string): Promise<number[]> {
    const path = this.makePath(sha256);

    return await fse.readJSON(path);
  }

  async save(sha256: string, data: number[]) {
    const path = this.makePath(sha256);

    return await fse.writeFile(path, JSON.stringify(data));
  }

  private makePath(sha256: string) {
    return path.join(KEYFRAMES_DIR, sha256);
  }
}