import { Quality } from './transcoder/quality';
import path from 'node:path';
import { TRANSCODE_DIR } from '../config/envs';
import * as fse from 'fs-extra';
import { BadRequest } from '@tsed/exceptions';
import { $log } from '@tsed/common';

export class TranscodesStorageService {
  async findSegmentPath(hash: string, quality: Quality, segment: string): Promise<string | null> {
    $log.info({hash, quality, segment})

    const filePath = this.makeSegmentPath(hash, quality, segment);

    $log.info({filePath})

    if (!await fse.exists(filePath)) {
      return null;
    }

    return filePath;
  }

  makeSegmentPath(hash: string, quality: Quality, segment: string) {
    return path.join(TRANSCODE_DIR, hash, `segment-${quality}-${segment}`);
  }
}