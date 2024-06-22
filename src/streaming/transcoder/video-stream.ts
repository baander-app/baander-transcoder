import { Quality, VideoQuality } from './quality';
import { Flags, Stream } from './stream';
import { TranscodeConfig } from './transcode-config';
import { FileStream } from './file-stream';

export class VideoStream extends Stream {

  constructor(
    public fileStream: FileStream,
    public quality: Quality,
  ) {

    super(fileStream);
  }

  getFlags(): Flags[] {
    if (this.quality === Quality.Original) {
      return [Flags.Video, Flags.Transmux];
    }

    return [Flags.Video];
  }

  getOutPath(encoderId: number) {
    const path = TranscodeConfig.transcodePath({
      encoderId,
      sha: this.file.mediaReport.sha256,
      segmentName: 'segment',
      indexOrQuality: this.quality,
    });

    this.file.outputPaths.add(path);

    return path;
  }

  getTranscodeArgs(segments: string): string[] {
    const args = [
      '-map',
      '0:v:0',
    ];

    if (this.quality === Quality.Original) {
      args.push(
        '-c:v',
        'copy',
      );

      return args;
    }

    const videoHeight = this.file.mediaReport?.video?.height ?? 0;
    const videoWidth = this.file.mediaReport?.video?.width ?? 0;

    let width: number = Math.floor((VideoQuality.height(this.quality) / videoHeight) * videoWidth);
    width = closestMultiple(width, 2);

    args.push(...[
      '-vf', 'scale=' + width + ':' + VideoQuality.height(this.quality),
      '-bufsize', `${VideoQuality.maxBitrate(this.quality) * 5}`,
      '-b:v', `${VideoQuality.averageBitrate(this.quality)}`,
      '-maxrate', `${VideoQuality.maxBitrate(this.quality)}`,
      '-forced-idr', '1',
      '-force_key_frames', segments,
      '-strict', '-2',
    ]);

    return args;
  }

}

function closestMultiple(n: number, x: number): number {
  if (x > n) {
    return x;
  }

  n = n + Math.floor(x / 2);
  n = n - (n % x);

  return n;
}