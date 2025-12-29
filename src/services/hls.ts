import { getVideoInfo } from './ffmpeg';
import { mediaTranscodeOptions, TranscodeOptions } from './mediaTranscoder';
import { mediaService } from './media';
import { router } from './router';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseInt } from 'lodash';

export const RESOLUTION_PLACEHOLDER = '__RESOLUTION__';
export const SEGMENT_PLACEHOLDER = '__SEGMENT__';

function getHlsSegmentLength() {
  return mediaTranscodeOptions.segmentDuration;
}

export async function generateMasterPlaylist(file: string, protocol: string, host: string, pathParam: string, captions: string[] = [], options: TranscodeOptions = mediaTranscodeOptions): Promise<string> {
  const info = await getVideoInfo(file);
  let output = '#EXTM3U\n#EXT-X-VERSION:4\n';

  const audioStreams = info.streams.filter(s => s.codec_type === 'audio');
  const videoStreams = info.streams.filter(s => s.codec_type === 'video');
  const audioGroupId = 'audio';

  // Request object mock for router.url (since we only have protocol and host strings here)
  const reqMock: any = {protocol: protocol.replace(':', ''), get: () => host};

  if (audioStreams.length > 0) {
    audioStreams.forEach((s, i) => {
      const lang = s.tags?.language || 'und';
      const name = s.tags?.title || s.tags?.handler_name || `Audio ${i + 1}`;
      const isDefault = i === 0 ? 'YES' : 'NO';
      const uri = router.url('audio.playlist', {index: i, id: pathParam}, reqMock);
      output += `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="${audioGroupId}",NAME="${name}",LANGUAGE="${lang}",DEFAULT=${isDefault},AUTOSELECT=YES,URI="${uri}"
`;
    });
  }

  if (captions.length > 0) {
    captions.forEach((url, index) => {
      output += `#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Caption ${index + 1}",DEFAULT=${index === 0 ? 'YES' : 'NO'},AUTOSELECT=YES,URI="${url}"
`;
    });
  }

  // Image Trickplay
  const trickplayDir = mediaService.getTrickplayDir({path: file});
  try {
    await fs.access(path.join(trickplayDir, 'tiles.m3u8'));
    const uri = router.url('caption.trickplay', {id: pathParam}, reqMock);
    output += `#EXT-X-IMAGE-STREAM-INF:BANDWIDTH=100000,RESOLUTION=320x180,CODECS="jpeg",URI="${uri}"
`;
  } catch (e) {
  }

  options.variants.forEach((v) => {
    let outWidth: number;
    let bandwidth: number;
    let displayHeight: number;

    // Determine which video stream to use
    const videoStreamIndex = v.videoStreamIndex ?? 0;
    const videoStream = videoStreams[videoStreamIndex];

    if (!videoStream) {
      console.warn(`Video stream index ${videoStreamIndex} not found, skipping variant`);
      return;
    }

    if (v.height === -1 && v.bitrate === 'original') {
      // For original variant, use the specific video stream's dimensions
      outWidth = videoStream.width || info.width;
      displayHeight = videoStream.height || info.height;
      // Use source video bitrate if available, otherwise estimate
      bandwidth = (videoStream.bit_rate ? parseInt(videoStream.bit_rate) : (v.bitrate && v.bitrate !== 'original' ? parseInt(v.bitrate) * 1000 : 0)) + parseInt(options.audio.bitrate.replace('k', '000'));
    } else {
      // For transcoded variants, scale based on the specific video stream
      const sourceHeight = videoStream.height || info.height;
      const sourceWidth = videoStream.width || info.width;
      const aspect = sourceWidth / sourceHeight;
      outWidth = Math.round(v.height * aspect / 2) * 2;
      displayHeight = v.height;
      bandwidth = parseInt(v.bitrate.replace('k', '000')) + parseInt(options.audio.bitrate.replace('k', '000'));
    }

    let videoCodecString = 'avc1.64001f';
    if (!options.audioOnly) {
      switch (options.videoCodec) {
        case 'h265':
          videoCodecString = 'hvc1.1.6.L93.B0';
          break;
        case 'vp9':
          videoCodecString = 'vp09.00.50.08';
          break;
        case 'av1':
          videoCodecString = 'av01.0.05M.08';
          break;
        case 'h264':
        default:
          videoCodecString = 'avc1.64001f';
          break;
      }
    }

    let audioCodecString: string;
    switch (options.audio.defaultCodec) {
      case 'opus':
        audioCodecString = 'opus';
        break;
      case 'aac':
      default:
        audioCodecString = 'mp4a.40.2';
        break;
    }

    let codecs = options.audioOnly ? audioCodecString : `${videoCodecString},${audioCodecString}`;

    output += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth}`;
    if (!options.audioOnly) {
      output += `,RESOLUTION=${outWidth}x${displayHeight}`;
    }
    output += `,CODECS="${codecs}"`;

    // Use the frame rate from the specific video stream if available
    const streamFrameRate = videoStream.r_frame_rate ?
      parseFloat(videoStream.r_frame_rate.split('/')[0]) / parseFloat(videoStream.r_frame_rate.split('/')[1]) :
      info.frameRate;

    if (streamFrameRate && !options.audioOnly) {
      output += `,FRAME-RATE=${streamFrameRate.toFixed(3)}`;
    }
    if (audioStreams.length > 0) {
      output += `,AUDIO="${audioGroupId}"`;
    }
    if (captions.length > 0) {
      output += `,SUBTITLES="subs"`;
    }
    output += `
`;

    let variantUrl = router.url('hls.variant', {
      height: (v.height === -1 && v.bitrate === 'original') ? -1 : v.height,
      id: pathParam,
    }, reqMock);
    const params = new URLSearchParams();
    if (options.audioOnly) params.set('audioOnly', 'true');
    if (options.hwAccel !== mediaTranscodeOptions.hwAccel) params.set('hwaccel', options.hwAccel);
    if (options.videoCodec !== mediaTranscodeOptions.videoCodec) params.set('vcodec', options.videoCodec);
    if (options.audio.defaultCodec !== (mediaTranscodeOptions.audio.defaultCodec || 'aac')) params.set('acodec', options.audio.defaultCodec);
    if (options.lowLatency !== mediaTranscodeOptions.lowLatency) params.set('lowLatency', String(options.lowLatency));

    const qs = params.toString();
    if (qs) {
      variantUrl += `?${qs}`;
    }

    output += `${variantUrl}
`;
  });
  if (options.trickplay) {
    const uri = router.url('hls.iframe_playlist', {id: pathParam}, reqMock);
    output += `#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=60000,RESOLUTION=${info.width}x${info.height},CODECS="avc1.42e01e",URI="${uri}"
`;
  }
  return output;
}

export async function generatePlaylist(template: string, file: string, resolution: number, options: TranscodeOptions = mediaTranscodeOptions, initUrl?: string, audioCodec: string = options.audio.defaultCodec || 'aac'): Promise<string> {
  const info = await getVideoInfo(file);
  let str = '#EXTM3U\n';
  str += '#EXT-X-VERSION:6\n'; // Use version 6 for better support
  str += '#EXT-X-MEDIA-SEQUENCE:0\n';
  str += `#EXT-X-TARGETDURATION:${Math.ceil(options.segmentDuration)}\n`;
  str += '#EXT-X-PLAYLIST-TYPE:VOD\n';

  // Add CAN-SKIP-UNTIL for better seeking behavior
  str += `#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=12.0,PART-HOLD-BACK=6.0\n`;
  str += `#EXT-X-PART-INF:PART-TARGET=${Math.ceil(options.segmentDuration)}\n`;

  if (options.hlsSegmentType === 'fmp4' && initUrl) {
    str += `#EXT-X-MAP:URI="${initUrl}"
`;
  }

  let leftover = info.duration;
  let segmentIndex = 0;
  while (leftover > 0) {
    const dur = leftover > options.segmentDuration ? options.segmentDuration : leftover;
    str += `#EXTINF:${dur.toFixed(6)},
`;
    str += template.replace(RESOLUTION_PLACEHOLDER, resolution.toString()).replace(SEGMENT_PLACEHOLDER, segmentIndex.toString()) + '\n';
    segmentIndex++;
    leftover -= options.segmentDuration;
  }
  str += '#EXT-X-ENDLIST\n';
  return str;
}

export async function generateAudioPlaylist(template: string, file: string, index: number, options: TranscodeOptions = mediaTranscodeOptions, initUrl?: string): Promise<string> {
  const info = await getVideoInfo(file);
  let str = '#EXTM3U\n';
  str += '#EXT-X-VERSION:4\n';
  str += '#EXT-X-MEDIA-SEQUENCE:0\n';
  str += `#EXT-X-TARGETDURATION:${Math.ceil(options.segmentDuration)}\n`;
  str += '#EXT-X-PLAYLIST-TYPE:VOD\n';

  if (options.hlsSegmentType === 'fmp4' && initUrl) {
    str += `#EXT-X-MAP:URI="${initUrl}"
`;
  }

  let leftover = info.duration;
  let segmentIndex = 0;
  while (leftover > 0) {
    const dur = leftover > options.segmentDuration ? options.segmentDuration : leftover;
    str += `#EXTINF:${dur.toFixed(6)},
`;
    str += template.replace(SEGMENT_PLACEHOLDER, segmentIndex.toString()) + '\n';
    segmentIndex++;
    leftover -= options.segmentDuration;
  }
  str += '#EXT-X-ENDLIST\n';
  return str;
}

export async function generateIFramePlaylist(file: string, host: string, pathParam: string): Promise<string> {
  const info = await getVideoInfo(file);
  if (!info.iFrameTimes || info.iFrameTimes.length === 0) {
    throw new Error('No I-frames available');
  }

  const times = info.iFrameTimes;

  // Calculate maximum duration for I-frame segments
  let maxDuration = 0;
  for (let i = 0; i < times.length; i++) {
    const dur = i < times.length - 1 ? times[i + 1] - times[i] : info.duration - times[i];
    maxDuration = Math.max(maxDuration, dur);
  }
  const targetDuration = Math.ceil(maxDuration);

  // Parse host/protocol for router.url
  let proto = 'http';
  let hostname = host;
  if (host.includes('://')) {
    const parts = host.split('://');
    proto = parts[0];
    hostname = parts[1];
  }

  const reqMock: any = {protocol: proto, get: () => hostname};

  let str = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:${targetDuration}
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-I-FRAMES-ONLY
`;

  for (let i = 0; i < times.length; i++) {
    const dur = i < times.length - 1 ? times[i + 1] - times[i] : info.duration - times[i];
    str += `#EXTINF:${dur.toFixed(6)},
`;
    const uri = router.url('hls.iframe', {index: i, id: pathParam}, reqMock);
    str += `${uri}\n`;
  }

  str += '#EXT-X-ENDLIST\n';
  return str;
}
