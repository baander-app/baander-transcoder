import * as fse from 'fs-extra';
import * as path from 'path';
import { CACHE_DIR } from '../config/envs';

export class Segment {
  public available: Promise<boolean>;

  private resolve: (value: boolean) => void;

  constructor(
    public index: number,
    public fileName: string,
    public path: string,
  ) {
    this.available = new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  markAvailable() {
    this.resolve(true);
  }

}

export async function checkSegmentAvailable(segment: Segment) {
  if (await fse.pathExists(segment.path)) {
    segment.markAvailable();

    return true;
  }

  return false;
}

export function segmentFileExistsSync(index: number) {
  return fse.existsSync(makeSegmentPath(index))
}

export function segmentFileExists(index: number) {
  return fse.pathExists(makeSegmentPath(index))
}

export function makeSegmentPath(index: number) {
  return path.join(CACHE_DIR, `${index}.ts`);
}

export function makeSegmentName(index: number) {
  return `${index}.ts`;
}