import { Controller } from '@tsed/di';
import { AcceptMime, ContentType, Get, Returns } from '@tsed/schema';
import { Ffprobe } from '../../encoding/ffprobe/ffprobe';
import { Format } from '../../encoding/ffprobe/models/format';

@Controller('/')
export class FfmpegController {
  @Get('/')
  @ContentType('application/json; charset=utf-8')
  async get() {
    const ffprobe = new Ffprobe();
    const probe = await ffprobe.probeFile('C:\\Users\\Martin\\Videos\\big-buck-bunny.mp4');

    return probe;
  }
}
