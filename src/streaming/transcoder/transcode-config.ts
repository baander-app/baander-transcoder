import * as path from 'node:path';
import { TRANSCODE_DIR } from '../../config/envs';
import { $log } from '@tsed/common';

export interface TranscodePathArgs {
  encoderId: number;
  sha: string;
  indexOrQuality?: number | string;
}

export class TranscodeConfig {
  static transcodePath({encoderId, sha, indexOrQuality}: TranscodePathArgs): string {
    if (typeof encoderId === 'undefined' || typeof sha === 'undefined' || typeof TRANSCODE_DIR === 'undefined') {
      $log.error({
        encoderId: typeof encoderId,
        sha: typeof sha,
        TRANSCODE_DIR: typeof TRANSCODE_DIR,
      });
      throw new Error('Invalid arguments. Ensure encoderId, sha, and TRANSCODE_DIR are defined and of type string.');
    }

    return path.join(TranscodeConfig.baseTranscodePath(), sha, `segment-${encoderId}-${indexOrQuality}-%d.ts`);
  }

  static baseTranscodePath() {
    return TRANSCODE_DIR;
  }
}