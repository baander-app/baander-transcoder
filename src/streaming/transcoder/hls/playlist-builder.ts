import { QUALITIES, Quality, VideoQuality } from '../quality';
import { FileStream } from '../file-stream';

interface BuildStreamInfLineParams {
  quality: Quality;
  bitrate: number;
  resolution: string;
  codec: string;
}

function buildStreamInfLine({quality, bitrate, resolution, codec}: BuildStreamInfLineParams) {
  return `#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=${VideoQuality.averageBitrate(quality)},BANDWIDTH=${VideoQuality.maxBitrate(quality)},RESOLUTION=${resolution},CODECS="${codec}",AUDIO="audio",CLOSED-CAPTIONS=NONE\n./${quality}/index.m3u8\n`;
}

function buildMediaLine(audio: any) {
  let name = audio.title || audio.language || `Audio ${audio.index}`;
  let defaultAudio = audio.default ? 'DEFAULT=YES,' : '';

  return `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="${audio.language}",NAME="${name}",${defaultAudio}URI="audio/${audio.index}/index.m3u8"\n`;
}

export function playlistBuilder(fileStream: FileStream) {
  let master = '#EXTM3U\n';

  if (fileStream.mediaReport.video) {
    let transMuxQuality!: Quality;

    for (const quality of QUALITIES) {
      if (VideoQuality.height(quality) >= fileStream.mediaReport.video.height || VideoQuality.averageBitrate(quality) >= fileStream.mediaReport.video.bitrate) {
        transMuxQuality = quality;
        break;
      }
    }

    if (!transMuxQuality) {
      throw new Error('No suitable transmux quality found');
    }

    const bitrate = fileStream.mediaReport.video.bitrate;
    const resolution = `${fileStream.mediaReport.video.width}x${fileStream.mediaReport.video.height}`;
    const codec = fileStream.mediaReport.video.hlsCodec || '';
    master += buildStreamInfLine({quality: transMuxQuality, bitrate, resolution, codec});

    let aspectRatio = fileStream.mediaReport.video.width / fileStream.mediaReport.video.height;
    let transMuxPrefix = 'avc1.6400';
    let transMuxCodec = transMuxPrefix + '28';

    for (const quality of QUALITIES) {
      let sameCodec = fileStream.mediaReport.video.hlsCodec && fileStream.mediaReport.video.hlsCodec.startsWith(transMuxPrefix);
      let incLvl = VideoQuality.height(quality) < fileStream.mediaReport.video.height ||
        (VideoQuality.height(quality) === fileStream.mediaReport.video.height && !sameCodec);

      if (incLvl) {
        let resolution = `${Math.round(aspectRatio * VideoQuality.height(quality))}x${VideoQuality.height(quality)}`;
        master += buildStreamInfLine({
          quality,
          bitrate: VideoQuality.averageBitrate(quality),
          resolution,
          codec: transMuxCodec,
        });
      }
    }
  }

  if (fileStream.mediaReport.audios) {
    for (const audio of fileStream.mediaReport.audios) {
      master += buildMediaLine(audio);
    }
  }

  return master;
}