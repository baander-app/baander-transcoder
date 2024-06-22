import { Quality } from './transcoder/quality';
import path from 'node:path';
import { TRANSCODE_DIR } from '../config/envs';
import * as fse from 'fs-extra';
import { $log } from '@tsed/common';
import { minimatch } from 'minimatch';

export class TranscodesStorageService {
  async findSegmentPath(hash: string, quality: Quality, segment: number): Promise<string | null> {
    if (!await fse.pathExists(getPathForTranscode(hash))) {
      return null;
    }

    const files = await this.listTranscodes(hash);

    if (files.length === 0) {
      return null;
    }

    const pattern = this.makeSegmentPattern(hash, quality, segment);
    const fileName = minimatch.match(files, pattern)[0];

    if (!fileName) {
      return null;
    }

    const fullPath = path.join(TRANSCODE_DIR, hash, fileName);

    $log.warn('TranscodesStorageService: fullPath', fullPath);

    return fullPath;
  }

  async findAudioSegmentPath(hash: string, segment: number): Promise<string | null> {
    const audioPattern = `segment-a-*-${segment}.m4a`;

    if (!await fse.pathExists(getPathForTranscode(hash))) {
      return null;
    }

    const files = await this.listTranscodes(hash);
    const audioFiles = minimatch.match(files, audioPattern);
    const audioFileName = audioFiles[0];

    if (!audioFileName) {
      return null;
    }

    const audioFullPath = path.join(TRANSCODE_DIR, hash, audioFileName);

    $log.warn('TranscodesStorageService: audioFullPath', audioFullPath);

    return audioFullPath;
  }

  makeSegmentPattern(hash: string, quality: Quality, segment: number) {
    return `segment-*-${quality}-${segment}.ts`;
  }

  async listTranscodes(hash: string): Promise<string[]> {
    return await fse.readdir(getPathForTranscode(hash));
  }
}

const getPathForTranscode = (hash: string) => path.join(TRANSCODE_DIR, hash);