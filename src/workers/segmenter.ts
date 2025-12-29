import { ChildProcess, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { createInterface } from 'readline';
import { ffmpegPath, getVideoInfo } from '../services/ffmpeg';
import { TranscodeOptions } from '../config';
import { logger } from '../services/logger';
import {
  getAudioSegmentFilename,
  getDashChunkFilename,
  getDashInitFilename,
  getDashManifestFilename,
  getHlsInitFilename,
  getIFrameCacheDir,
  getSegmentPrefix,
  getSubtitleSegmentFilename,
  getVideoSegmentFilename,
} from '../utils/paths';
import { sha256 } from '../utils/hash';

export interface SegmenterOptions {
  input: string;
  outputDir: string;
  config: TranscodeOptions;
  height: number;
  startTime?: number;
  startNumber?: number;
  format: 'hls' | 'dash';
  videoStreamIndex?: number; // Index of the video stream to use (defaults to 0)
}

function hashArgs(args: string[]): string {
  return sha256(args.join('\n'));
}

export class Segmenter extends EventEmitter {
  private proc: ChildProcess | null = null;

  constructor(private options: SegmenterOptions) {
    super();
  }

  async start() {
    fs.mkdirSync(this.options.outputDir, {recursive: true});
    const args = await this.buildArgs();

    logger.info(`[Segmenter] Spawning FFmpeg with args: ${args.join(' ')}`);
    this.proc = spawn(ffmpegPath, args, {cwd: this.options.outputDir});

    this.proc.stderr?.on('data', (d) => this.emit('stderr', d.toString()));
    this.proc.on('close', (code) => this.emit('exit', code));
    this.proc.on('error', (err) => this.emit('error', err));

    if (this.options.format === 'hls') {
      this.monitorHlsOutput();
    }
  }

  stop() {
    if (this.proc) {
      this.proc.kill();
      this.proc = null;
    }
  }

  pause() {
    if (this.proc && process.platform !== 'win32') {
      this.proc.kill('SIGSTOP');
    }
  }

  resume() {
    if (this.proc && process.platform !== 'win32') {
      this.proc.kill('SIGCONT');
    }
  }

  private async buildArgs(): Promise<string[]> {
    const {
      input,
      config,
      height,
      startTime = 0,
      startNumber = 0,
      format,
      outputDir,
      videoStreamIndex = 0,
    } = this.options;

    // Check if this is the original variant (height = -1)
    const isOriginal = height === -1;
    let videoCodec = 'libx264';
    let videoOptions = ['-preset', config.preset];
    let inputArgs: string[] = [];
    let filter = '';

    if (isOriginal) {
      // For original variant, use stream copy (no transcoding)
      videoCodec = 'copy';
      videoOptions = [];
      filter = '';
    } else {
      filter = `scale=-2:${height}`;
    }

    switch (config.hwAccel) {
      case 'nvenc':
        if (!isOriginal) {
          videoCodec = 'h264_nvenc';
          videoOptions = ['-preset', 'p4'];
        }
        break;
      case 'qsv':
        if (!isOriginal) {
          videoCodec = 'h264_qsv';
          videoOptions = ['-preset', 'veryfast'];
        }
        break;
      case 'vaapi':
        if (!isOriginal) {
          videoCodec = 'h264_vaapi';
          videoOptions = [];
          inputArgs.push(
            '-init_hw_device', 'vaapi=vaapi:/dev/dri/renderD128',
            '-filter_hw_device', 'vaapi',
          );
          filter = `scale_vaapi=w=-2:h=${height}:format=nv12`;
        }
        break;
      case 'videotoolbox':
        if (!isOriginal) {
          videoCodec = 'h264_videotoolbox';
          videoOptions = [];
        }
        break;
      case 'cpu':
      default:
        if (!isOriginal) {
          videoCodec = 'libx264';
          videoOptions = ['-preset', config.preset];
        }
        break;
    }

    if (config.lowLatency) {
      videoOptions.push('-tune', 'zerolatency');
    }

    // I-Frame Logic
    let forceKeyFrames = `expr:gte(t,n_forced*${config.segmentDuration})`;
    try {
      const info = await getVideoInfo(input);
      if (info.iFrameTimes && info.iFrameTimes.length > 0) {
        const times: string[] = [];
        let nextTarget = startTime;
        for (const t of info.iFrameTimes) {
          if (t >= nextTarget) {
            times.push(t.toFixed(6));
            nextTarget += config.segmentDuration;
          }
        }
        if (times.length > 0) {
          forceKeyFrames = times.join(',');
        }
      }
    } catch (e) {
    }

    // Audio & Subtitle Mapping
    const audioMaps: string[] = [];
    const subtitleMaps: string[] = [];
    let audioStreamCount = 0;
    let subtitleStreamCount = 0;

    try {
      const info = await getVideoInfo(input);
      if (info && info.streams) {
        const audioStreams = info.streams.filter(s => s.codec_type === 'audio');
        audioStreamCount = audioStreams.length;
        audioStreams.forEach((_, index) => {
          audioMaps.push('-map', `0:a:${index}`);
        });

        const subtitleStreams = info.streams.filter(s => s.codec_type === 'subtitle');
        subtitleStreamCount = subtitleStreams.length;
        subtitleStreams.forEach((_, index) => {
          subtitleMaps.push('-map', `0:s:${index}`);
        });
      }
    } catch (e) {
    }
    if (audioStreamCount === 0) {
      audioStreamCount = 1;
      audioMaps.push('-map', '0:a:0');
    }

    const commonArgs = [
      '-hide_banner',
      '-loglevel', 'error',
      '-ss', startTime.toString(),
      ...inputArgs,
      '-i', input,
    ];

    if (format === 'hls') {
      const isFmp4 = config.hlsSegmentType === 'fmp4';
      const ext = isFmp4 ? 'm4s' : 'ts';
      const formatFlags = [
        '-f', 'segment',
        '-segment_time', config.segmentDuration.toString(),
        '-segment_format', isFmp4 ? 'mp4' : 'mpegts',
        ...(isFmp4 ? ['-segment_format_options', 'movflags=frag_keyframe+empty_moov+default_base_moof'] : []),
        '-segment_list_size', '0',
        '-segment_start_number', startNumber.toString(),
        '-force_key_frames', forceKeyFrames,
      ];

      const videoArgs = [
        '-map', `0:v:${videoStreamIndex}`,
        '-c:v', videoCodec,
        ...videoOptions,
        ...(filter ? ['-vf', filter] : []),
        ...formatFlags,
        '-segment_list', 'pipe:1',
        '-segment_list_type', 'csv',
        ...(isFmp4 ? ['-segment_header_filename', path.join(outputDir, getHlsInitFilename(false))] : []),
        path.join(outputDir, `${getSegmentPrefix(false, undefined)}${getVideoSegmentFilename('%d', isFmp4)}`),
      ];

      const audioArgs: string[] = [];
      for (let i = 0; i < audioStreamCount; i++) {
        audioArgs.push(
          '-map', `0:a:${i}`,
          '-c:a', config.audio.codec,
          '-b:a', config.audio.bitrate,
          '-ac', config.audio.channels.toString(),
          ...formatFlags,
          ...(isFmp4 ? ['-segment_header_filename', path.join(outputDir, getHlsInitFilename(true, i))] : []),
          path.join(outputDir, `${getSegmentPrefix(true, i)}${getAudioSegmentFilename('%d', isFmp4)}`,
          ));
      }

      const subtitleArgs: string[] = [];
      for (let i = 0; i < subtitleStreamCount; i++) {
        subtitleArgs.push(
          '-map', `0:s:${i}`,
          '-c:s', 'webvtt',
          ...formatFlags,
          '-segment_format', 'webvtt',
          path.join(outputDir, getSubtitleSegmentFilename(i, '%d')),
        );
      }

      if (isFmp4) {
        // Init segments are generated automatically via -segment_header_filename
      }

      return [
        ...commonArgs,
        ...videoArgs,
        ...audioArgs,
        ...subtitleArgs,
      ];
    } else {
      // DASH
      const dashArgs = [
        ...commonArgs,
        '-f', 'dash',
        '-seg_duration', config.segmentDuration.toString(),
        '-init_seg_name', getDashInitFilename('$RepresentationID$'),
        '-media_seg_name', getDashChunkFilename('$RepresentationID$', '$Number$'),
        '-start_number', startNumber.toString(),
        '-use_template', '1',
        '-use_timeline', '1',
        '-map', `0:v:${videoStreamIndex}`,
        ...audioMaps,
        ...subtitleMaps,
        '-c:v', videoCodec, ...videoOptions,
        ...(filter ? ['-vf', filter] : []),
        '-c:a', config.audio.codec, '-b:a', config.audio.bitrate, '-ac', config.audio.channels.toString(),
        // Assuming ffmpeg handles subtitle mapping to webvtt/ttml for DASH if streams are mapped
        '-adaptation_sets', 'id=0,streams=v id=1,streams=a id=2,streams=s',
        path.join(outputDir, getDashManifestFilename()),
      ];
      return dashArgs;
    }
  }

  private monitorHlsOutput() {
    if (!this.proc || !this.proc.stdout) return;
    const rl = createInterface({input: this.proc.stdout});
    rl.on('line', (line) => {
      logger.debug(`[Segmenter] FFmpeg stdout: ${line}`);
      const parts = line.split(',');
      if (parts.length >= 1) {
        const filename = path.basename(parts[0]);
        if (filename.endsWith('.ts') || filename.endsWith('.m4s') || filename.endsWith('.vtt')) {
          logger.debug(`[Segmenter] Segment available: ${filename}`);
          this.emit('segmentAvailable', filename);
        }
      }
    });
  }
}

export function startThumbnailing(input: string, outputDir: string, interval: number): ChildProcess {
  fs.mkdirSync(outputDir, {recursive: true});
  const args = [
    '-hide_banner',
    '-loglevel', 'error',
    '-i', input,
    '-vf', `fps=1/${interval},scale=320:-1`,
    '-q:v', '5',
    path.join(outputDir, 'thumb_%d.jpg'),
  ];
  return spawn(ffmpegPath, args);
}

export async function extractIFrame(inputSource: string, index: number): Promise<string> {
  const info = await getVideoInfo(inputSource);
  if (!info.iFrameTimes || index >= info.iFrameTimes.length) {
    throw new Error(`Invalid I-Frame index ${index} for file ${inputSource}`);
  }

  const time = info.iFrameTimes[index];
  const args = [
    '-i', inputSource,
    '-ss', `${time}`,
    '-frames:v', '1',
    '-an',
    '-f', 'mpegts',
    'pipe:1',
  ];

  // Force re-encode to ensure valid output for single frame
  args.push('-c:v', 'libx264', '-preset', 'ultrafast');

  const key = hashArgs(args);
  const cachePath = path.join(getIFrameCacheDir(), key);

  fs.mkdirSync(path.dirname(cachePath), {recursive: true});

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, {
      shell: true,
      stdio: 'pipe',
    });
    const writeStream = fs.createWriteStream(cachePath);
    let stderr = '';

    proc.stdout.pipe(writeStream);

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
    });

    writeStream.on('error', (err) => {
      proc.kill();
      reject(new Error(`Write stream error: ${err.message}`));
    });

    proc.on('close', code => {
      if (code === 0) {
        resolve(cachePath);
      } else {
        reject(new Error(`FFmpeg exited with code ${code}. Stderr: ${stderr}`));
      }
    });
  });
}