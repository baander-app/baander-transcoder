import { Flags, Stream } from './stream';
import { FileStream } from './file-stream';
import { TranscodeConfig } from './transcode-config';

export class AudioStream extends Stream {

  constructor(
    public file: FileStream,
    public index: number,
  ) {
    super(file);
  }

  getFlags(): number {
    return Flags.AudioF;
  }

  getTranscodeArgs(segments: string): string[] {
    return [
      '-map', `0:a:0`,
      '-c:a', 'aac',
      '-ac', '2', // should support 5.1, 7.1 etc in the future
      'b:a', '192k', // should support variable bitrate in the future
    ];
  }

  getOutPath(encoderId: number) {
    const path = TranscodeConfig.transcodePath({
      encoderId,
      sha: this.file.mediaReport.sha256,
      indexOrQuality: this.index,
    });

    this.file.outputPaths.add(path);

    return path;
  }
}