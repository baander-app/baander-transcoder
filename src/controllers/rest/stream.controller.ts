import { Controller, Inject } from '@tsed/di';
import { QueryParams } from '@tsed/platform-params';
import { Ffprobe } from '../../encoding/ffprobe/ffprobe';
import { HlsPlaylist } from '../../encoding/hls-playlist';
import { ContentType, Get } from '@tsed/schema';
import { $log, Res } from '@tsed/common';
import { TranscodeManager } from '../../encoding/transcode-manager';
import { createHash } from 'node:crypto';
import * as path from 'path';

const TARGET_DURATION = 6;

@Controller('/stream')
export class StreamController {
  @Inject()
  private transcodeManager: TranscodeManager;

  @Get('/playlist/hls')
  @ContentType('application/vnd.apple.mpegurl')
  async getHlsPlaylist(
    @QueryParams('profile') profile: string,
  ) {
    const filePath = 'C:\\Users\\Martin\\Videos\\big-buck-bunny.mp4';
    const hash = createHash('sha256').update(filePath).digest('hex');
    const ffprobe = new Ffprobe();
    const report = await ffprobe.probeFile(filePath);
    const test = JSON.parse(JSON.stringify(report));

    $log.warn(test);

    const playlist = new HlsPlaylist(7, TARGET_DURATION, 0, 'VOD');
    let leftover = Number(report.format.duration);
    let segment = 0;

    while(leftover > 0) {
      let thisLength = TARGET_DURATION;
      if(leftover < 2) {
        thisLength = leftover;
      }

      playlist.addSegment(`http://127.0.0.1:8083/rest/stream/segment?hash=${hash}&segment=${segment}&profile=${profile}`, thisLength);

      leftover -= thisLength;
      segment++;
    }

    const data = playlist.toString();

    return data;
  }

  @Get('/segment')
  async getSegment(
    @QueryParams('hash') hash: string,
    @QueryParams('segment') segment: number,
    @Res() response: Res,
  ) {
    const file = await this.transcodeManager.serveSegment(hash, segment);
    $log.info(`Serving segment ${segment} from ${file}.`)

    response.sendFile(path.resolve(file), {
      headers: {
        'Content-Type': 'video/mp2t',
      }
    });
  }
}