import { Controller, Inject } from '@tsed/di';
import { Get, Header } from '@tsed/schema';
import { HeaderParams, PathParams } from '@tsed/platform-params';
import { BadRequest } from '@tsed/exceptions';
import { Transcoder } from '../../../streaming/transcoder/transcoder';
import * as fse from 'fs-extra';
import {createReadStream, ReadStream} from "fs";
import { VideoQuality } from '../../../streaming/transcoder/quality';
import { $log, Req, Res } from '@tsed/common';
import { TranscodesStorageService } from '../../../streaming/transcodes-storage.service';
import { Response, Request } from 'express';
import { clone } from '../../../utils/clone';
import { getMimeType } from '../../../utils/stream-mime';

@Controller('/stream2')
export class StreamController {
  @Inject()
  private transcodesStorageService: TranscodesStorageService;

  @Inject()
  private transcoder: Transcoder;

  private filePath = 'L:\\The Lord Of The Rings The Fellowship Of The Ring (2001).mkv';

  @Get('/:hash/direct')
  async directStream(
    @HeaderParams('X-BAANDER-CLIENT-ID') clientId: string,
    @PathParams('hash') hash: string,
    @Res() response: Response,
  ) {

    await this.checkIfFileExists(this.filePath);

    return this.streamFile(this.filePath, response);
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

  @Get('/:hash/audio/:audioIndex/*')
  async getAudioSegment(
    @HeaderParams('X-BAANDER-CLIENT-ID') clientId: string,
    @PathParams('hash') hash: string,
    @PathParams('audioIndex') audioIndex: number,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const segment = this.getSegmentFromRequest(request);

    $log.info('StreamController@getAudioSegment', clientId, hash, audioIndex);

    const filePath = await this.transcodesStorageService.findAudioSegmentPath(hash, segment);
    if (filePath) {
      return this.streamFile(filePath, response);
    }

    const path = await this.transcoder.getAudioSegment(this.filePath, audioIndex, segment, clientId);
    if (filePath) {
      return this.streamFile(filePath, response);
    }

    throw new BadRequest('Segment not found');
  }

  @Get('/:hash/:quality/*')
  async getVideoSegment(
    @HeaderParams('X-BAANDER-CLIENT-ID') clientId: string,
    @PathParams('hash') hash: string,
    @PathParams('quality') qualityStr: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const segment = this.getSegmentFromRequest(request);

    $log.info('StreamController@getVideoSegment', clientId, hash, qualityStr, segment);

    const quality = VideoQuality.fromString(qualityStr);
    const segmentPath = await this.transcodesStorageService.findSegmentPath(hash, quality, segment);

    $log.info('StreamController@getVideoSegment_segmentPath 1', segmentPath);

    if (segmentPath !== null) {
      return this.streamFile(segmentPath, response);
    }

    const path = await this.transcoder.getVideoSegment(this.filePath, quality, segment, clientId);
    $log.info('StreamController@getVideoSegment_path 2', path);

    if (path) {
      return this.streamFile(path, response);
    }

    throw new BadRequest('Segment not found');
  }

  private async checkIfFileExists(filePath: string) {
    if (!await fse.exists(filePath)) {
      throw new BadRequest('File not found');
    }
  }

  private async streamFile(filePath: string, response: Response) {
    $log.info(`StreamController@streamFile: ${filePath}`);

    const fileStream = createReadStream(filePath);
    const { stream, mime } = await getMimeType(fileStream);

    response.header('content-type', mime)

    return stream.pipe(response);
  }

  private getSegmentFromRequest(request: Request) {
    const segmentFile = clone(request.params[0]);
    const segment = segmentFile?.split('-')[1].split('.')[0];

    if (!segment) {
      throw new BadRequest('Invalid segment');
    }

    return parseInt(segment);
  }
}