import { Probe } from '../ffprobe/models';
import { Quality } from '../quality';


export interface MediaReport {
  mediaPath: string;
  reportPath: string;
  sha256: string;
  hlsCodec: string;
  extension: string;
  probe: Probe;
  video: Video | null;
  audios: Audio[];
  videos: Video[];
  keyFrames: number[];
}

export interface Video {
  codec: string;
  hlsCodec: string;
  quality: Quality | null;
  width: number;
  height: number;
  bitrate: number;
  size: number;
}

export interface Audio {
  index: number;
  title: string | null;
  language: string | null;
  codec: string;
  hlsCodec: string;
  default: boolean;
  forced: boolean;
}