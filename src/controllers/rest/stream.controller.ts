import { Controller, Inject } from '@tsed/di';
import { Context, HeaderParams, PathParams, QueryParams } from '@tsed/platform-params';
import { Ffprobe } from '../../encoding/ffprobe/ffprobe';
import { HlsPlaylist } from '../../encoding/hls-playlist';
import { ContentType, Get } from '@tsed/schema';
import { $log } from '@tsed/common';
import { TranscodeManager } from '../../encoding/transcode-manager';
import * as fse from 'fs-extra';

const TARGET_DURATION = 6;

@Controller('/stream')
export class StreamController {
  @Inject()
  private transcodeManager: TranscodeManager;

  @Get('/playlist/:hash.m3u8')
  @ContentType('application/vnd.apple.mpegurl')
  async getHlsPlaylist(
    @PathParams('hash') hash: string,
    @QueryParams('profile') profile: string,
    @HeaderParams('x-forwarded-proto') protocol: string,
    @HeaderParams('host') host: string
  ) {
    const filePath = 'C:\\Users\\Martin\\Videos\\big-buck-bunny.mp4';
    const ffprobe = new Ffprobe();
    const report = await ffprobe.probeFile(filePath);

    const playlist = new HlsPlaylist(7, TARGET_DURATION, 0);
    let remainingDuration = Number(report.format.duration);
    let segmentIndex = 0;

    while(remainingDuration > 0) {
      let currentSegmentDuration = TARGET_DURATION;
      if(remainingDuration < 2) {
        currentSegmentDuration = remainingDuration;
      }

      playlist.addSegment(`${protocol || 'http'}://${host}/rest/stream/segment?hash=${hash}&segment=${segmentIndex}&profile=${profile}.ts`, remainingDuration);

      remainingDuration -= currentSegmentDuration;
      segmentIndex++;
    }

    return playlist.toString();
  }

  @Get('/segment')
  async getSegment(
    @QueryParams('hash') hash: string,
    @QueryParams('segment') segment: number,
    @Context() ctx: Context,
  ) {
    const file = await this.transcodeManager.serveSegment(hash, segment);
    $log.info(`Serving segment ${segment} from ${file}.`);

    ctx.response.stream(fse.createReadStream(file))
      .setHeader('Content-Type', 'video/mp2t');
  }
}