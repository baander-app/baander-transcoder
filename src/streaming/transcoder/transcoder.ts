import { Inject, Service } from '@tsed/di';
import { FileStream } from './file-stream';
import { TranscodeConfig } from './transcode-config';
import { FileStreamService } from './services/file-stream.service';
import { Quality } from './quality';

@Service()
export class Transcoder {
  @Inject()
  private fileStreamService: FileStreamService

  streams = new Map<string, FileStream>();
  private baseTranscodePath = TranscodeConfig.baseTranscodePath();

  getFileStream(path: string) {
    return this.fileStreamService.getFileStream(path);
  }

  getStream(client: string) {
    return this.streams.get(client);
  }

  async getMasterPlaylist(path: string, client: string) {
    const fileStream = await this.getFileStream(path);
    this.streams.set(client, fileStream);

    return fileStream.masterPlaylist;
  }

  async getAudioIndex(path: string, audioIndex: number, client: string) {
    const stream = await this.getFileStream(path);

    return stream.audioIndex(audioIndex);
  }

  async getAudioSegment(path: string, audioIndex: number, segment: number, client: string) {
    const stream = await this.getFileStream(path);

    return stream.audioSegment(audioIndex, segment);
  }

  async getVideoIndex(path: string, quality: Quality, clientId: string) {
    const stream = await this.getFileStream(path);

    return await stream.videoIndex(quality);
  }

  async getVideoSegment(path: string, quality: Quality, segment: number, client: string) {
    const stream = await this.getFileStream(path);

    return stream.videoSegment(quality, segment);
  }
}