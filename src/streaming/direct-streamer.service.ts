import * as fse from 'fs-extra';

export class DirectStreamerService {
  async createReadStream(filePath: string) {
    return fse.createReadStream(filePath);
  }
}