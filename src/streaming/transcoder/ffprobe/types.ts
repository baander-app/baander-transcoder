import { Stream } from './models';

export type AudioStreamProbe = Required<Pick<Stream, 'codec_name' | 'level'>>
export type VideoStreamProbe = Required<Pick<Stream, 'codec_name' | 'profile'>>

export function isAudioStreamProbe(probe: unknown): probe is Required<AudioStreamProbe> {
  return (probe as AudioStreamProbe).level !== undefined;
}

export function isVideoStreamProbe(probe: unknown): probe is Required<VideoStreamProbe> {
  return (probe as VideoStreamProbe).profile !== undefined;
}