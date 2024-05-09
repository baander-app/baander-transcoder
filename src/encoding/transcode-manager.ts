import { Transcode } from './transcode';
import { OnDestroy, OnInit, Service } from '@tsed/di';
import { Stream } from './stream';
import { checkSegmentAvailable, makeSegmentName, makeSegmentPath, Segment, segmentFileExistsSync } from './segment';
import { $log } from '@tsed/common';
import { MAX_SEGMENT_GAP, MAX_SEGMENTS } from './config';
import { HlsProfile } from './profiles/hls-profile';
import { CACHE_DIR } from '../config/envs';
import { Ffprobe } from './ffprobe/ffprobe';
import * as fse from 'fs-extra';

let id = 0;

@Service()
export class TranscodeManager implements OnInit, OnDestroy {
  private streams: Stream[] = [];

  async serveSegment(hash: string, segment: number) {
    const stream = this.streams.find(x => x.hash === hash);

    if (await fse.pathExists(makeSegmentPath(segment))) {
      return makeSegmentPath(segment);
    }

    if (!stream) {
      const path = 'C:\\Users\\Martin\\Videos\\big-buck-bunny.mp4';
      const ffprobe = new Ffprobe();
      const report = await ffprobe.probeFile(path)

      const stream = new Stream(
        path,
        HlsProfile.getProfile(segment, 6, CACHE_DIR),
        report,
        CACHE_DIR,
      );

      this.streams.push(stream);

      if (segment != -1) {
        stream.lastSegmentIndex = segment;
      }

      const waitingSegment = new Segment(
        segment,
        makeSegmentName(segment),
        makeSegmentPath(segment),
      );

      stream.segments.push(waitingSegment);

      await waitingSegment.available;

      return waitingSegment.path;
    }

    throw new Error('Segment not found.');
  }

  startTranscode(stream: Stream, segment: number) {
    if (segment === -1) {
      segment = 0;
    }

    $log.info(`Starting transcode for stream ${stream.id} at segment ${segment}.`);

    stream.transcode = new Transcode(stream.makeArgs(segment));
    stream.transcode.segment = segment;
  }

  private async monitor() {
    for (const stream of this.streams) {
      if (stream.transcode) {
        stream.transcode.checkSegments();
      }

      let transcodeStarted = false;
      let temp: Segment[] = [];

      for (const segment of stream.segments) {
        let remove = false;
        if (await checkSegmentAvailable(segment)) {
          remove = true;
        } else if (!transcodeStarted) {
          transcodeStarted = this.shouldTranscodeSegment(stream, segment);
        }
        if (!remove) {
          temp = [...temp, segment];
        }
      }

      stream.segments = temp;

      if (!transcodeStarted) {
        this.checkTranscode(stream);
      }
    }
  }

  private shouldTranscodeSegment(stream: Stream, segment: Segment) {
    const segmentIndex = segment.index;
    const process = stream.transcode;
    if (!process) {
      this.startTranscode(stream, segmentIndex);

      return true;
    } else if (segmentIndex < process.segment || process.segment + MAX_SEGMENT_GAP < segmentIndex) {
      process.stop();
      return true;
    }

    return false;
  }

  private checkTranscode(stream: Stream) {
   if (stream.segments.length === 0) {
     $log.info('No segments left, stopping transcode.')
     this.stopTranscode(stream);

     this.streams = this.streams.filter((s) => s !== stream);
   }

   if (stream.transcode) {
     const segment = stream.lastSegment();

     for (let i = 0; i < segment + MAX_SEGMENTS; i++) {
        if (!segmentFileExistsSync(i)) {
          return;
        }

     }

     this.stopTranscode(stream);
   }
  }

  private stopTranscode(stream: Stream) {
    stream.transcode?.stop();
  }

  shutdown() {
    for (const stream of this.streams) {
      stream.transcode?.stop();
    }
  }

  $onInit(): Promise<any> | void {
    setInterval(() => this.monitor(), 1000);
  }

  $onDestroy(): void | Promise<any> {
    this.shutdown();
  }
}
