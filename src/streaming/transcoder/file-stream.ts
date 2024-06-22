import { AudioStream } from './audio-stream';
import { Quality } from './quality';
import { VideoStream } from './video-stream';
import { MediaReport } from './media-report';
import * as fse from 'fs-extra';
import { playlistBuilder } from './hls/playlist-builder';
import { MutexMap } from '../../utils/mutex-map';
import { $log } from '@tsed/common';

export class FileStream {
  outputPaths: Set<string> = new Set();

  private _audioStreams = new MutexMap<number, AudioStream>();
  private _videoStreams = new MutexMap<Quality, VideoStream>();

  constructor(
    public mediaReport: MediaReport,
  ) {
  }

  get masterPlaylist() {
    return playlistBuilder(this);
  }

  async audioStream(index: number) {
    return this._audioStreams.getOrCreate(index, () => new AudioStream(this, index));
  }

  async audioIndex(index: number) {
    const audioStream = await this.audioStream(index);

    return audioStream.getIndex();
  }

  async audioSegment(index: number, segment: number) {
    const stream = await this.audioStream(index);

    return stream
      ? stream.getSegment(segment)
      : null;
  }

  async videoStream(quality: Quality) {
    return this._videoStreams.getOrCreate(quality, () => new VideoStream(this, quality));
  }

  async videoIndex(quality: Quality) {
    const videoStream = await this.videoStream(quality);

    return videoStream.getIndex();
  }

  async videoSegment(quality: Quality, segment: number) {
    const stream = await this.videoStream(quality);

    const seg = await stream.getSegment(segment);

    $log.debug('videoSegment', seg);

    return seg;
  }

  async kill() {
    await this._audioStreams.lock.runExclusive(() => {
      this._audioStreams.data.forEach(audioStream => audioStream.kill());
    })

    await this._videoStreams.lock.runExclusive(() => {
      this._videoStreams.data.forEach(videoStream => videoStream.kill());
    });
  }

 async destroy() {
    await this.kill();
    for (const path of this.outputPaths) {
      await fse.unlink(path);
    }
  }
}