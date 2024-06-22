import { FileStream } from './file-stream';
import { ChildProcess, spawn } from 'node:child_process';
import * as readline from 'node:readline';
import path from 'node:path';
import * as fse from 'fs-extra';
import { updateMapProps } from '../../utils/update-map-props';
import { $log } from '@tsed/common';
import { Mutex } from 'async-mutex';
import * as os from 'node:os';
import { MAX_TRANSCODES } from '../../config/envs';

type Segment = {
  segment: number;
  encoder: number;
  ready: Promise<void>;
  setReady: () => void;
}

export interface StreamConfig {
  transcodeArgs(segments: string): string[];
  getOutPath: (encoderId: number) => string;

  getFlags(): number;
}

type Head = {
  segment: number;
  end: number;
  process: ChildProcess | null;
}

export enum Flags {
  AudioF = 1 << 0,
  VideoF = 1 << 1,
  Transmux = 1 << 3,
}

export const DeletedHead: Head = {
  segment: -1,
  end: -1,
  process: null,
};

export abstract class Stream {
  heads: Map<number, Head> = new Map();
  segments: Segment[] = [];
  private lock = new Mutex();
  private resolveInitialized: () => void = () => {};
  private initialized = new Promise<void>((resolve) => this.resolveInitialized = () => resolve());

  constructor(
    public file: FileStream,
  ) {
    for (let i = 0; i < this.file.mediaReport.keyFrames.length; i++) {
      let promiseResolver: () => void = () => {};
      const promise = new Promise<void>((resolve) => {
        promiseResolver = resolve;
      });

      this.segments.push({
        segment: i,
        encoder: this.file.mediaReport.keyFrames.length,
        ready: promise,
        setReady: promiseResolver,
      });

      this.resolveInitialized();
    }
  }

  abstract getTranscodeArgs(segments: string): string[];

  abstract getOutPath(encoderId: number): string;

  abstract getFlags(): number;

  async run(start: number) {
    $log.info('Stream@run', `Running transcode for ${this.file.mediaReport.mediaPath} (from ${start})`);

    const args: string[] = [
      '-threads', '2',
    ];

    // Start the transcode up to the 100th segment (or less)
    const length = this.file.mediaReport.keyFrames.length;
    $log.info('Stream@run', `Total segments: ${length}`);

    let end = Math.min(start + 20, length);
    $log.info('Stream@run', `End segment: ${end}`);

    $log.info('Stream@run', 'Acquiring lock');
    await this.lock.acquire();
    $log.info('Stream@run', 'Lock acquired');

    // Stop at the first finished segment
    for (let i = start; i < end; i++) {
      const ready = await this.isSegmentReadyBool(i);
      if (ready || this.isSegmentTranscoding(i)) {
        end = i;
        break;
      }
    }
    $log.info(`Segment ${start} to ${end} is ready`);
    if (start >= end) {
      this.lock.release();
      $log.info('Stream@run', `Presuming segment is ready. start=${start},end=${end}  - releasing lock`);

      // this can happens if the start segment was finished between the check
      // to call run() and the actual call.
      return;
    }
    const encoderId = this.heads.size;
    this.heads.set(encoderId, {segment: start, end, process: null});
    this.lock.release();
    $log.info(`Head ${encoderId} created - released lock`);

    $log.info(
      'Stream@run',
      `Starting transcode ${encoderId} for ${this.file.mediaReport.mediaPath} (from ${start} to ${end} out of ${length} segments)`,
    );

    // Include both the start and end delimiter because -ss and -to are not accurate
    // Having an extra segment allows us to cut precisely the segments we want with the
    // -f segment that does cut the beginning and the end at the keyframe like asked
    let startRef = 0;
    let startSegment = start;
    if (start !== 0) {
      // we always take on segment before the current one, for different reasons for audio/video:
      //  - Audio: we need context before the starting point, without that ffmpeg doesnt know what to do and leave ~100ms of silence
      //  - Video: if a segment is really short (between 20 and 100ms), the padding given in the else block below is not enough and
      // the previous segment is played another time. the -segment_times is way more precise so it does not do the same with this one
      startSegment = start - 1;
      if ((this.getFlags() & Flags.AudioF) !== 0) {
        startRef = this.file.mediaReport.keyFrames[startSegment];
        $log.info('Stream@run', `Audio segment: ${startSegment} - startRef: ${startRef}`);
      } else {
        // the param for the -ss takes the keyframe before the specificed time
        // (if the specified time is a keyframe, it either takes that keyframe or the one before)
        // to prevent this weird behavior, we specify a bit after the keyframe that interest us

        // this can't be used with audio since we need to have context before the start-time
        // without this context, the cut loses a bit of audio (audio gap of ~100ms)
        if (startSegment + 1 === length) {
          startRef = (this.file.mediaReport.keyFrames[startSegment] + Number.parseFloat(this.file.mediaReport.probe.format.duration)) / 2;
          $log.info('Stream@run', `Video segment: ${startSegment} - startRef: ${startRef}`);
        } else {
          startRef = (this.file.mediaReport.keyFrames[startSegment] + this.file.mediaReport.keyFrames[startSegment + 1]) / 2;
          $log.info('Stream@run', `Video segment: ${startSegment} - startRef: ${startRef}`);
        }
      }
    }
    let endPadding: number = 1;
    if (end === length) {
      endPadding = 0;
      $log.info('Stream@run', `End segment is the last one, removing padding`);
    }

    let segments: number[] = this.file.mediaReport.keyFrames.slice(startSegment + 1, end + endPadding);
    if (segments.length === 0) {
      // we can't leave that empty else ffmpeg errors out.
      segments = [9999999];
      $log.info('Stream@run', `No segments to transcode, adding a dummy segment`);
    }

    const outPath: string = this.getOutPath(encoderId);
    await fse.promises.mkdir(path.dirname(outPath), {recursive: true});
    $log.info('Stream@run', `Output path created: ${outPath}`);

    args.push(...[
      '-nostats', '-hide_banner', '-loglevel', 'warning',
    ]);

    //if ((this.config.getFlags() & Flags.VideoF) !== 0) {
    //  args = [...args]; // ...Settings.HwAccel.DecodeFlags
    //}

    if (startRef !== 0) {
      if ((this.getFlags() & Flags.VideoF) !== 0) {
        // This is the default behavior in transmux mode and needed to force pre/post segment to work
        // This must be disabled when processing only audio because it creates gaps in audio
        args.push('-noaccurate_seek');
        $log.info('Stream@run', 'Disabling accurate seek since audio is not being processed');
      }
      args.push('-ss', startRef.toFixed(6));
      $log.info('Stream@run', `calculated -ss: ${startRef.toFixed(6)}`);
    }
    // do not include -to if we want the file to go to the end
    if (end + 1 < length) {
      // sometimes, the duration is shorter than expected (only during transcode it seems)
      // always include more and use the -f segment to split the file where we want
      let endRef: number = this.file.mediaReport.keyFrames[end + 1];
      // it seems that the -to is confused when -ss seek before the given time (because it searches for a keyframe)
      // add back the time that would be lost otherwise
      // this only appens when -to is before -i but having -to after -i gave a bug (not sure, don't remember)
      endRef += startRef - this.file.mediaReport.keyFrames[startSegment];
      args.push('-to', endRef.toFixed(6));
      $log.info('Stream@run', `calculated -to: ${endRef.toFixed(6)}`);
    }

    args.push(...[
      '-i', this.file.mediaReport.mediaPath,
      // this makes behaviors consistent between soft and hardware decodes.
      // this also means that after a -ss 50, the output video will start at 50s
      '-start_at_zero',
      // for hls streams, -copyts is mandatory
      '-copyts',
      // this makes output file start at 0s instead of a random delay + the -ss value
      // this also cancel -start_at_zero weird delay.
      // this is not always respected but generally it gives better results.
      // even when this is not respected, it does not result in a bugged experience but this is something
      // to keep in mind when debugging
      '-muxdelay', '0',
    ]);

    args.push(...this.getTranscodeArgs(this.toSegmentStr(segments)));
    args.push(...[
      '-f', 'segment',
      // needed for rounding issues when forcing keyframes
      // recommended value is 1/(2*frame_rate), which for a 24fps is ~0.021
      // we take a little bit more than that to be extra safe but too much can be harmfull
      // when segments are short (can make the video repeat itself)
      '-segment_time_delta', '0.05',
      '-segment_format', 'mpegts',
      // segment_times want durations, not timestamps so we must substract the -ss param
      // since we give a greater value to -ss to prevent wrong seeks but -segment_times
      // needs precise segments, we use the keyframe we want to seek to as a reference.
      '-segment_times', this.toSegmentStr(segments.map(seg => seg - this.file.mediaReport.keyFrames[startSegment])),
      '-segment_list_type', 'flat',
      '-segment_list', 'pipe:1',
      '-segment_start_number', startSegment.toString(),
      outPath,
    ]);


    const process = spawn('ffmpeg', args);

    await this.lock.runExclusive(() => {
      this.heads.set(encoderId, {segment: start, end, process});
      $log.info('Stream@run', `Head ${encoderId} updated with process`);
    });

    $log.info('Stream@run', `ffmpeg ${encoderId} started`);

    process.stderr?.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    process.on('close', (code) => {
      if (code !== 0) {
        console.error(`ffmpeg process exited with code ${code}`);
      }
    });

    const format = path.basename(outPath);
    let shouldStop = false;

    const tmpFilePath = path.join(os.tmpdir(), this.file.mediaReport.sha256, '.json');
    await fse.createFile(tmpFilePath);

    $log.info('Stream@run', `Created temp file for ffmpeg buffer output at: ${tmpFilePath}`);

    const scanner = readline.createInterface({
      input: fse.createReadStream(tmpFilePath),
      terminal: false,
    });

    scanner.on('line', async (line: string) => {
      let segment = Number.parseInt(line.replace(format, ''), 10);

      if (segment < start) {
        // This happen because we use -f segments for accurate cutting (since -ss is not)
        // check comment at beginning of function for more info
        $log.info('Stream@run scanner:', `Ignoring segment ${segment} since it's before the start`);
        return;
      }

      await this.lock.runExclusive(() => {
        updateMapProps(this.heads, encoderId, {segment});
      });

      $log.info('Stream@run scanner:', `Segment ${segment} got ready (${encoderId})`);
      const ready = await this.isSegmentReadyAsync(segment);
      if (ready) {
        // the current segment is already marked at done so another process has already gone up to here.
        process.kill('SIGINT');
        $log.info('Stream@run scanner:', `Killing ffmpeg because segment ${segment} is already ready`);
        shouldStop = true;
      } else {
        this.segments[segment].encoder = encoderId;

        const nextSegmentReady = await this.isSegmentReadyAsync(segment + 1);
        this.segments[segment].setReady();
        if (segment === end - 1) {
          // file finished, ffmpeg will finish soon on its own
          shouldStop = true;
        } else if (nextSegmentReady) {
          process.kill('SIGINT');
          $log.info('Stream@run scanner:', `Killing ffmpeg because next segment ${segment} is ready`);
          shouldStop = true;
        }
      }

      this.lock.release();
      $log.info('Stream@run scanner:', `Segment ${segment} is ready (${encoderId}) - released lock`);

      // we need this and not a return in the condition because we want to unlock
      // the lock (and can't defer since this is a loop)
      if (shouldStop) {
        scanner.close();
      }
    });

    process.on('exit', async (code, signal) => {
      if (signal === 'SIGINT') {
        $log.info(`ffmpeg ${encoderId} was killed by us`);
      } else if (code !== 0) {
        $log.info(`ffmpeg ${encoderId} occurred an error: ${code}`);
      } else {
        $log.info(`ffmpeg ${encoderId} finished successfully`);
      }

      // we can't delete the head directly because it would invalidate the others encoderId
      this.heads.set(encoderId, DeletedHead);
    });
  }

  async getIndex() {
    await this.initialized;

    let index: string = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-PLAYLIST-TYPE:EVENT
#EXT-X-START:TIME-OFFSET=0
#EXT-X-TARGETDURATION:4
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-INDEPENDENT-SEGMENTS
`;

    const length = this.file.mediaReport.keyFrames.length;

    for (let segment = 0; segment < length - 1; segment++) {
      index += `#EXTINF:${(this.file.mediaReport.keyFrames[segment + 1] - this.file.mediaReport.keyFrames[segment]).toFixed(6)}\n`;
      index += `segment-${segment}.ts\n`;
    }

    const duration = Number.parseFloat(this.file.mediaReport.probe.format.duration);

    index += `#EXTINF:${(duration - this.file.mediaReport.keyFrames[length - 1]).toFixed(6)}\n`;
    index += `segment-${length - 1}.ts\n`;
    index += `#EXT-X-ENDLIST`;

    return index;
  }

  getMinEncoderDistance(segment: number): number {
    const time = this.file.mediaReport.keyFrames[segment];
    const distances: number[] = [];

    for (const [_, head] of Object.entries(this.heads)) {
      // ignore killed heads or heads after the current time
      if (head.segment < 0 || this.file.mediaReport.keyFrames[head.segment] > time || segment >= head.end) {
        distances.push(Infinity);
      } else {
        distances.push(time - this.file.mediaReport.keyFrames[head.segment]);
      }
    }

    if (distances.length === 0) {
      return Infinity;
    }

    return Math.min(...distances);
  }


  async getSegment(segment: number): Promise<string> {
    await this.initialized;

    const ready = await this.isSegmentReadyBool(segment);
    $log.warn('Stream@getSegment', `Segment ${segment} is ready: ${ready}`);

    let distance = 0;
    let isScheduled = false;

    if (!ready) {
      distance = this.getMinEncoderDistance(segment);
      for (const head of this.heads.values()) {
        if (head.segment <= segment && segment < head.end) {
          isScheduled = true;
          break;
        }
      }
    }

    if (!ready) {
      if (distance > 60 || !isScheduled) {
        $log.info('Stream@getSegment', `Creating new head for ${segment} since closest head is ${distance}s away`);
        await this.run(segment);
      } else {
        $log.info('Stream@getSegment', `Waiting for segment ${segment} since encoder head is ${distance}s away`);
      }

      try {
        await this.isSegmentReadyAsync(segment);
      } catch (err) {
        throw new Error('Could not retrieve the selected segment (timeout)');
      }
    }

    setImmediate(() => this.prepareNextSegments(segment));

    return this.getOutPath(this.segments[segment].encoder).replace('%d', segment.toString());
  }

  async isSegmentReadyAsync(segment: number): Promise<boolean> {
    const seg = this.segments.at(segment);

    if (seg === undefined) {
      return false;
    }

    return new Promise<boolean>(resolve => {
      seg.ready?.then(() => {
        resolve(true);
      });
    });
  }

  async isSegmentReadyBool(segment: number): Promise<boolean> {
    const seg = this.segments.at(segment);

    if (seg === undefined) {
      return false;
    }

    return new Promise<boolean>(resolve => {
      seg.ready?.then(() => resolve(true));
      resolve(false);
    });
  }

  toSegmentStr(segments: number[]): string {
    return segments.map(seg => seg.toFixed(6)).join(',');
  }

  isSegmentTranscoding(segment: number): boolean {
    const isTranscoding =  Array.from(this.heads).some((head) => head[1].segment === segment);

    $log.info('Stream@isSegmentTranscoding', `Segment ${segment} is transcoding: ${isTranscoding}`);

    return isTranscoding;
  }

  async prepareNextSegments(segment: number) {
    // Audio is way cheaper to create than video so we don't need to run them in advance
    // Running it in advance might actually slow down the video encode since less compute
    // power can be used so we simply disable that.
    if ((this.getFlags() & Flags.VideoF) !== 0) {
      $log.info('Stream@prepareNextSegments', 'Skipping audio encode since it is not needed');

      return;
    }

    for (let i = segment + 1; i <= Math.min(segment + 10, this.segments.length - 1); i++) {
      const ready = await this.isSegmentReadyAsync(i);
      if (ready) {
        $log.info('Stream@prepareNextSegments', `Segment ${i} is already ready`);
        continue;
      }
      // only start encode for segments not planned (getMinEncoderDistance returns Inf for them)
      // or if they are 60s away (assume 5s per segments)
      const distance = this.getMinEncoderDistance(i);
      if (distance < 60 + (5 * (i - segment))) {
        continue;
      }
      $log.info('Stream@prepareNextSegments', `Creating new head for future segment (${i})`);
      await this.run(i);
    }
  }

  kill() {
    for (let id = 0; id < this.heads.size; id++) {
      this.killHead(id);
    }
  }

  killHead(encoderId: number) {
    const head = this.heads.get(encoderId);
    if (!head || head === DeletedHead || head.process === null) {
      return;
    }

    $log.info('Stream@killHead', `Killing head ${encoderId}`);
    head.process?.kill('SIGINT');
    this.heads.set(encoderId, DeletedHead);
  }
}