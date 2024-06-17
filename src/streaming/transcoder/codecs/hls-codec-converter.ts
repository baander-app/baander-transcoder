import { getProfileAndLevel, isAudioStreamProbe, isVideoStreamProbe, Stream } from '../ffprobe';
import { convertAacProfile, convertAv1Profile, convertH264Profile } from './converters';
import { $log } from '@tsed/common';


export function hlsCodecConverter(codecName: string, probe: Stream) {
  switch (codecName) {
    case 'avc':
    case 'video/H264': {
      if (!isVideoStreamProbe(probe)) {
        $log.error('Invalid probe for video stream', { probe });

        throw new Error('Invalid probe for video stream');
      }

      let codecStr = 'avc1';
      const { profile, level } = getProfileAndLevel(probe);

      codecStr += convertH264Profile(profile);
      codecStr += level;

      return codecStr;
    }

    case 'hevc':
    case 'video/H265': {
      if (!isVideoStreamProbe(probe)) {
        $log.error('Invalid probe for video stream', { probe });
        throw new Error('Invalid probe for video stream');
      }

      let codecStr = 'hvc1';
      const { profile, level } = getProfileAndLevel(probe);

      if (profile === 'main 10') {
        codecStr += '.2.4';
      } else {
        codecStr += '.1.4';
      }

      codecStr += `.L${(level * 30).toString(16).padStart(2, '0').toUpperCase()}.BO`;

      return codecStr;
    }

    case 'av1': {
      if (!isVideoStreamProbe(probe)) {
        $log.error('Invalid probe for video stream', { probe });
        throw new Error('Invalid probe for video stream');
      }

      let codecStr = 'av01';
      const { profile, level } = getProfileAndLevel(probe);

      codecStr += convertAv1Profile(profile);

      // not sure how to probe this properly yet
      const bitDepth = 8;

      const tierFlag = 'M';

      codecStr += `.${level.toString(16).padStart(2, '0').toUpperCase()}${tierFlag}.${bitDepth}`;

      return codecStr;
    }

    case 'aac': {
      let codecStr = 'mp4a';
      const { profile } = getProfileAndLevel(probe);

      codecStr += convertAacProfile(profile);

      return codecStr;
    }

    case 'opus':
    case 'audio/opus': {
      return 'Opus';
    }

    case 'ac-3': {
      return 'mp4a.a5';
    }

    case 'e-ac-3':
    case 'audio/eac3': {
      return 'mp4a.a6';
    }

    case 'flac':
    case 'audio/flac': {
      return 'fLaC';
    }

    default: {
      throw new Error(`Unsupported codec: ${codecName}`);
    }
  }
}



