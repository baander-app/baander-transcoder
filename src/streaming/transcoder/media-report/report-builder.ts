import { Audio, MediaReport, Video } from './models';
import { probeFile, Format, Probe, Stream } from '../ffprobe';
import * as path from 'node:path';
import * as mime from 'mime-types';
import { VideoQuality } from '../quality';
import { $log } from '@tsed/common';
import { getMediaReportPath } from './utils';
import { hlsCodecConverter } from '../codecs';
import { sha256 } from '../../../utils';

export async function buildMediaReport(filePath: string): Promise<MediaReport> {
  try {
    const probe = await probeFile(filePath);

    const report = createReport(probe, filePath) as MediaReport;
    addCodecsToReport(report);
    setContainer(report, filePath);
    setVideo(report);

    return report;
  } catch (error) {
    $log.error(`Failed to build media report for file ${filePath}:`, error);
    throw error;
  }
}

const createReport = (probe: Probe, filePath: string): Partial<MediaReport> => ({
  mediaPath: filePath,
  extension: path.extname(filePath),
  reportPath: getMediaReportPath(filePath),
  sha256: sha256(filePath),
  probe,
  audios: probe.streams.filter(stream => stream.codec_type === 'audio').map(buildAudio),
  videos: probe.streams.filter(stream => stream.codec_type === 'video')
    .map(stream => buildVideo(stream, probe.format))
    .filter(video => video !== undefined) as Video[],
});

function addCodecsToReport(report: MediaReport): void {
  const codecs: string[] = [];
  report.audios.forEach(audio => addCodec(audio, codecs));
  report.videos.forEach(video => addCodec(video, codecs));
  report.hlsCodec = codecs.length > 0 ? `${report.hlsCodec}; codecs="${codecs.join(', ')}"` : report.hlsCodec;
}

function addCodec(media: Audio | Video, codecs: string[]): void {
  if (media.hlsCodec) {
    codecs.push(media.hlsCodec);
  }
}

function setContainer(report: MediaReport, filePath: string): void {
  const container = mime.lookup(filePath);
  if (container) {
    report.hlsCodec = container;
  }
}

function setVideo(report: MediaReport): void {
  if (report.videos.length > 0) {
    report.video = report.videos[0];
  }
}

function buildVideo(stream?: Stream, format?: Format): Video | null {
  if (!stream) {
    return null;
  }

  stream.profile = stream.profile ?? 'unknown';

  return {
    codec: stream.codec_long_name,
    hlsCodec: hlsCodecConverter(stream.codec_name, stream),
    width: stream.width ?? 0,
    height: stream.height ?? 0,
    bitrate: format?.bit_rate ? Number.parseInt(format.bit_rate) : 0,
    size: format?.size ? Number.parseInt(format.size) : 0,
    quality: stream.height ? VideoQuality.fromHeight(stream.height) : null,
  };
}

const buildAudio = (stream: Stream): Audio => ({
  index: stream.index,
  title: stream.tags?.title || null,
  language: stream.tags?.language || null,
  codec: stream.codec_long_name,
  hlsCodec: hlsCodecConverter(stream.codec_name, stream),
  default: stream.disposition?.default === 1,
  forced: stream.disposition?.forced === 1,
});