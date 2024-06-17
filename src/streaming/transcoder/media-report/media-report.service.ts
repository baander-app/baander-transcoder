import * as fse from 'fs-extra';
import { MediaReport } from './models';
import { buildMediaReport } from './report-builder';
import { Inject, Service } from '@tsed/di';
import { getMediaReportPath } from './utils';
import { KeyFrameStorageService } from '../services';
import { KeyFrameExtractor } from '../ffprobe';
import { sha256 } from '../../../utils';

@Service()
export class MediaReportService {
  @Inject()
  private keyFrameStorageService: KeyFrameStorageService;

  async getMediaReport(mediaFilePath: string) {
    const fullPath = getMediaReportPath(mediaFilePath);
    if (await fse.exists(fullPath)) {
      return await fse.readJSON(fullPath) as Promise<MediaReport>;
    }

    const report = await buildMediaReport(mediaFilePath);
    report.keyFrames = await this.findOrCreateKeyFrames(mediaFilePath);

    return report;
  }

  private async findOrCreateKeyFrames(mediaFilePath: string) {
    const hash = sha256(mediaFilePath);

    try {
      return await this.keyFrameStorageService.find(hash);
    } catch {
      const keyFrames = await this.extractKeyFrames(mediaFilePath);
      await this.keyFrameStorageService.save(hash, keyFrames);

      return keyFrames;
    }
  }

  private extractKeyFrames(mediaFilePath: string) {
    const keyFrameExtractor = new KeyFrameExtractor(mediaFilePath);

    return keyFrameExtractor.extract();
  }
}

