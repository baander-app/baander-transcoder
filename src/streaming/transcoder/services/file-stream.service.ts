import { Inject, Service } from '@tsed/di';
import { FileStream } from '../file-stream';
import { MediaReportService } from '../media-report/media-report.service';
import * as fse from 'fs-extra';

@Service()
export class FileStreamService {
  @Inject()
  private mediaReportService: MediaReportService;

  async getFileStream(path: string) {
    if (!await fse.exists(path)) {
      throw new Error('File not found');
    }

    const report = await this.mediaReportService.getMediaReport(path);

    return new FileStream(report);
  }
}