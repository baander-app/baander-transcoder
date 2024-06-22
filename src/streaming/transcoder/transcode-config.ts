import * as path from 'node:path';
import { TRANSCODE_DIR } from '../../config/envs';
import { $log } from '@tsed/common';

export interface TranscodePathArgs {
  encoderId: number;
  sha: string;
  segmentName: string;
  extension: string;
  indexOrQuality?: number | string;
}

export class TranscodeConfig {
  static transcodePath({encoderId, sha, segmentName, extension, indexOrQuality}: TranscodePathArgs): string {
    if (typeof encoderId === 'undefined' || typeof sha === 'undefined' || typeof TRANSCODE_DIR === 'undefined') {
      throw new Error('Invalid arguments. Ensure encoderId, sha, and TRANSCODE_DIR are defined and of type string.');
    }

    return path.join(TranscodeConfig.baseTranscodePath(), sha, `${segmentName}-${encoderId}-${indexOrQuality}-%d.${extension}`);
  }

  static baseTranscodePath() {
    return TRANSCODE_DIR;
  }
}