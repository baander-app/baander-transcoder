import { Controller, Inject } from '@tsed/di';
import { Get } from '@tsed/schema';
import { HeaderParams, PathParams } from '@tsed/platform-params';
import { BadRequest } from '@tsed/exceptions';
import { Transcoder } from '../../../streaming/transcoder/transcoder';
import { DirectStreamerService } from '../../../streaming/direct-streamer.service';
import * as fse from 'fs-extra';
import { VideoQuality } from '../../../streaming/transcoder/quality';
import { $log, Req } from '@tsed/common';
import { TranscodesStorageService } from '../../../streaming/transcodes-storage.service';

@Controller('/stream2')
export class StreamController {
  @Inject()
  private directStreamerService: DirectStreamerService;

  @Inject()
  private transcodesStorageService: TranscodesStorageService;

  @Inject()
  private transcoder: Transcoder;

  private filePath = 'L:\\The Lord Of The Rings The Fellowship Of The Ring (2001).mkv';

  @Get('/:hash/direct')
  async directStream(
    @HeaderParams('X-BAANDER-CLIENT-ID') clientId: string,
    @PathParams('hash') hash: string,
  ) {

    await this.checkIfFileExists(this.filePath);

    return this.directStreamerService.createReadStream(this.filePath);
  }

  @Get('/:hash/master.m3u8')
  async getMasterPlaylist(
    @HeaderParams('X-BAANDER-CLIENT-ID') clientId: string,
    @PathParams('hash') hash: string,
  ) {

    await this.checkIfFileExists(this.filePath);

    return this.transcoder.getMasterPlaylist(this.filePath, clientId);
  }

  @Get('/:hash/:quality/index.m3u8')
  async getVideoIndex(
    @HeaderParams('X-BAANDER-CLIENT-ID') clientId: string,
    @PathParams('hash') hash: string,
    @PathParams('quality') qualityStr: string,
  ) {

    const quality = VideoQuality.fromString(qualityStr);

    await this.checkIfFileExists(this.filePath);

    return await this.transcoder.getVideoIndex(this.filePath, quality, clientId);
  }

  @Get('/:hash/audio/:audioIndex/index.m3u8')
  async getAudioIndex(
    @HeaderParams('X-BAANDER-CLIENT-ID') clientId: string,
    @PathParams('hash') hash: string,
    @PathParams('audioIndex') audioIndex: number,
  ) {
    await this.checkIfFileExists(this.filePath);

    return this.transcoder.getAudioIndex(this.filePath, audioIndex, clientId);
  }

  @Get('/:hash/:quality/*')
  async getVideoSegment(
    @HeaderParams('X-BAANDER-CLIENT-ID') clientId: string,
    @PathParams('hash') hash: string,
    @PathParams('quality') qualityStr: string,
    @Req() request: Request,
  ) {
    const segmentFile = request.url.split('/').pop();
    const segment = segmentFile?.split('-')[1];

    if (!segment) {
      throw new BadRequest('Invalid segment');
    }

    $log.info('getVideoSegment', clientId, hash, qualityStr, segment);

    const quality = VideoQuality.fromString(qualityStr);

    const segmentPath = await this.transcodesStorageService.findSegmentPath(hash, quality, segmentFile);

    if (segmentPath) {
      $log.info('getVideoSegment', 'found segment in storage');

      return this.directStreamerService.createReadStream(segmentPath);
    }

    const path = await this.transcoder.getVideoSegment(this.filePath, quality, parseInt(segment), clientId);
    $log.info('getVideoSegment_path', path);

    if (typeof path === 'string') {
      return this.directStreamerService.createReadStream(path);
    }

    throw new BadRequest('Segment not found');
  }

  private async checkIfFileExists(filePath: string) {
    if (!await fse.exists(filePath)) {
      throw new BadRequest('File not found');
    }
  }
}