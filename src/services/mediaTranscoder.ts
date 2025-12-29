import { EventEmitter } from 'events';
import { logger } from './logger';
import { AudioConfig, mediaCachePaths, SegmentRequest, SubtitleConfig, VideoConfig } from '../utils/mediaCachePaths';
import { mediaCacheManager } from './mediaCacheManager';
import { ffmpegPath, getVideoInfo } from './ffmpeg';
import { TranscodeOptions } from '../config';
import { ChildProcess, spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface MediaTranscoderOptions {
  inputSource: string;
  segmentDuration: number;
  outputDir?: string;
  transcodingConfig?: TranscodeOptions;
}

export interface TranscodingJob {
  id: string;
  request: SegmentRequest;
  startTime: number;
  process?: ChildProcess;
  resolve: (path: string) => void;
  reject: (error: Error) => void;
  paused?: boolean;
}

export interface FFmpegProgress {
  frame: number;
  fps: number;
  bit_rate: string;
  total_size: number;
  out_time_ms: number;
  out_time: string;
  speed: number;
  progress: number;
}

export interface MultiStreamConfig {
  videoStreams: VideoConfig[];
  audioStreams: AudioConfig[];
  subtitleStreams: SubtitleConfig[];
}

export class MediaTranscoder extends EventEmitter {
  private readonly activeJobs: Map<string, TranscodingJob> = new Map();
  private readonly maxConcurrentJobs: number = 4;
  private readonly jobTimeout: number = 60000; // 60 seconds

  constructor(private options: MediaTranscoderOptions) {
    super();
  }

  /**
   * Request a segment - serves from cache if available, otherwise transcodes
   */
  async requestSegment(request: SegmentRequest): Promise<string> {
    // Check cache first
    const cacheStatus = await mediaCacheManager.checkSegmentStatus(request);

    if (cacheStatus.exists && cacheStatus.path) {
      logger.debug(`[MediaTranscoder] Segment found in cache: ${cacheStatus.path}`);
      return cacheStatus.path;
    }

    if (cacheStatus.isProcessing) {
      logger.debug(`[MediaTranscoder] Segment already processing, waiting: ${this.getJobId(request)}`);
      return this.waitForExistingJob(request);
    }

    // Need to transcode the segment
    return this.startTranscodingJob(request);
  }

  /**
   * Batch request multiple segments with smart lookahead
   */
  async requestSegmentBatch(
    request: SegmentRequest,
    batchSize: number = 3,
  ): Promise<string[]> {
    const requests: SegmentRequest[] = [];

    // Generate batch requests
    for (let i = 0; i < batchSize; i++) {
      const batchRequest: SegmentRequest = {
        ...request,
        segmentNumber: request.segmentNumber + i,
      };
      requests.push(batchRequest);
    }

    // Check what we have in cache
    const cacheChecks = await Promise.all(
      requests.map(req => mediaCacheManager.checkSegmentStatus(req)),
    );

    // Start transcoding jobs for missing segments
    const results: string[] = [];

    for (let i = 0; i < requests.length; i++) {
      const req = requests[i];
      const status = cacheChecks[i];

      if (status.exists && status.path) {
        results[i] = status.path;
      } else {
        // Start transcoding in parallel (up to maxConcurrentJobs)
        if (this.activeJobs.size < this.maxConcurrentJobs) {
          this.startTranscodingJob(req).then(path => {
            results[i] = path;
          }).catch(error => {
            logger.error(`[MediaTranscoder] Failed to transcode segment ${req.segmentNumber}: ${error}`);
          });
        } else {
          results[i] = await this.requestSegment(req);
        }
      }
    }

    // Wait for all transcoding jobs to complete
    return Promise.all(results);
  }

  /**
   * Transcode multiple streams in a single FFmpeg process (for HLS/DASH)
   */
  async requestMultiStreamSegment(
    mediaId: string,
    segmentNumber: number,
    config: MultiStreamConfig,
    format: 'hls' | 'dash' = 'hls',
  ): Promise<string[]> {
    const jobKey = `${mediaId}_multistream_${segmentNumber}`;

    // Check if any segments already exist in cache
    const allRequests: SegmentRequest[] = [];

    // Video requests
    for (const videoConfig of config.videoStreams) {
      allRequests.push({
        mediaId,
        segmentNumber,
        config: videoConfig,
      });
    }

    // Audio requests
    for (const audioConfig of config.audioStreams) {
      allRequests.push({
        mediaId,
        segmentNumber,
        config: audioConfig,
      });
    }

    // Subtitle requests
    for (const subtitleConfig of config.subtitleStreams) {
      allRequests.push({
        mediaId,
        segmentNumber,
        config: subtitleConfig,
      });
    }

    // Check cache for all streams
    const cacheStatuses = await Promise.all(
      allRequests.map(req => mediaCacheManager.checkSegmentStatus(req)),
    );

    // If all streams are cached, return paths
    const allCached = cacheStatuses.every(status => status.exists);
    if (allCached) {
      return cacheStatuses.map(status => status.path!);
    }

    // Mark all streams as processing
    allRequests.forEach(req => mediaCacheManager.markSegmentProcessing(req));

    // Generate all segments in one FFmpeg process
    return new Promise<string[]>((resolve, reject) => {
      const jobId = jobKey;
      const startTime = Date.now();

      const job: TranscodingJob = {
        id: jobId,
        request: allRequests[0], // Primary request
        startTime,
        resolve: () => resolve(cacheStatuses.map(status => status.path!)),
        reject,
      };

      this.activeJobs.set(jobId, job);

      this.executeMultiStreamTranscoding(mediaId, segmentNumber, config, format, job)
        .then(() => {
          allRequests.forEach(req => mediaCacheManager.markSegmentComplete(req));
          resolve(cacheStatuses.map(status => status.path!));
        })
        .catch(error => {
          allRequests.forEach(req => mediaCacheManager.markSegmentComplete(req));
          reject(error);
        })
        .finally(() => {
          this.cleanupJob(jobId);
        });

      // Set timeout
      setTimeout(() => {
        if (this.activeJobs.has(jobId)) {
          this.cleanupJob(jobId);
          reject(new Error(`Multi-stream transcoding job timeout: ${jobId}`));
        }
      }, this.jobTimeout * 2); // Longer timeout for multi-stream
    });
  }

  /**
   * Generate thumbnails for a video
   */
  async generateThumbnails(
    mediaId: string,
    interval: number = 10,
    width: number = 320,
    quality: number = 5,
  ): Promise<string[]> {
    const thumbnailDir = path.join(
      mediaCachePaths.getMediaCacheDir(mediaId),
      'thumbnails',
    );

    await fs.mkdir(thumbnailDir, {recursive: true});

    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-i', this.options.inputSource,
      '-vf', `fps=1/${interval},scale=${width}:-1`,
      '-q:v', quality.toString(),
      path.join(thumbnailDir, 'thumb_%04d.jpg'),
    ];

    logger.info(`[MediaTranscoder] Generating thumbnails with interval ${interval}s`);

    return new Promise((resolve, reject) => {
      const process = spawn(ffmpegPath, args);

      process.on('close', (code) => {
        if (code === 0) {
          logger.info(`[MediaTranscoder] Thumbnail generation completed`);
          resolve([path.join(thumbnailDir, 'thumb_0001.jpg')]); // Return first thumbnail
        } else {
          reject(new Error(`Thumbnail generation failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Thumbnail generation process error: ${error.message}`));
      });
    });
  }

  /**
   * Extract an I-frame from the video
   */
  async extractIFrame(index: number = 0): Promise<string> {
    try {
      const info = await getVideoInfo(this.options.inputSource);
      if (!info.iFrameTimes || index >= info.iFrameTimes.length) {
        throw new Error(`Invalid I-Frame index ${index} for file ${this.options.inputSource}`);
      }

      const time = info.iFrameTimes[index];
      const args = [
        '-i', this.options.inputSource,
        '-ss', time.toString(),
        '-frames:v', '1',
        '-an',
        '-f', 'mpegts',
        'pipe:1',
      ];

      // Force re-encode to ensure valid output for single frame
      args.push('-c:v', 'libx264', '-preset', 'ultrafast');

      logger.info(`[MediaTranscoder] Extracting I-frame at time ${time}s (index ${index})`);

      return new Promise((resolve, reject) => {
        const process = spawn(ffmpegPath, args);
        let frameData: Buffer[] = [];

        process.stdout?.on('data', (data) => {
          frameData.push(data);
        });

        process.on('close', (code) => {
          if (code === 0) {
            const frameBuffer = Buffer.concat(frameData);
            // Save to a temporary file and return path
            const tempPath = path.join(this.options.outputDir || '/tmp', `iframe_${Date.now()}.ts`);
            fs.writeFile(tempPath, frameData).then(() => {
              resolve(tempPath);
            }).catch(reject);
          } else {
            reject(new Error(`I-frame extraction failed with code ${code}`));
          }
        });

        process.on('error', (error) => {
          reject(new Error(`I-frame extraction process error: ${error.message}`));
        });
      });
    } catch (error) {
      throw new Error(`Failed to extract I-frame: ${error}`);
    }
  }

  /**
   * Pause a transcoding job
   */
  pauseJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (job && job.process && process.platform !== 'win32') {
      job.process.kill('SIGSTOP');
      job.paused = true;
      logger.info(`[MediaTranscoder] Paused job: ${jobId}`);
      return true;
    }
    return false;
  }

  /**
   * Resume a paused transcoding job
   */
  resumeJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (job && job.process && process.platform !== 'win32' && job.paused) {
      job.process.kill('SIGCONT');
      job.paused = false;
      logger.info(`[MediaTranscoder] Resumed job: ${jobId}`);
      return true;
    }
    return false;
  }

  /**
   * Start a new transcoding job for a segment
   */
  private async startTranscodingJob(request: SegmentRequest): Promise<string> {
    const jobId = this.getJobId(request);

    logger.info(`[MediaTranscoder] Starting transcoding job: ${jobId}`);

    // Ensure cache directories exist
    await mediaCacheManager.ensureCacheDirs(request.mediaId);

    // Mark as processing to prevent duplicates
    mediaCacheManager.markSegmentProcessing(request);

    return new Promise<string>((resolve, reject) => {
      const job: TranscodingJob = {
        id: jobId,
        request,
        startTime: Date.now(),
        resolve,
        reject,
      };

      this.activeJobs.set(jobId, job);

      // Start the transcoding process
      this.executeTranscodingJob(job).catch(error => {
        this.cleanupJob(jobId);
        reject(error);
      });

      // Set timeout
      setTimeout(() => {
        if (this.activeJobs.has(jobId)) {
          this.cleanupJob(jobId);
          reject(new Error(`Transcoding job timeout: ${jobId}`));
        }
      }, this.jobTimeout);
    });
  }

  /**
   * Execute the actual transcoding for a segment
   */
  private async executeTranscodingJob(job: TranscodingJob): Promise<void> {
    const {request} = job;
    const jobId = job.id;

    try {
      let outputPath: string;
      let args: string[];

      if ('height' in request.config) {
        // Video transcoding
        const result = await this.buildVideoTranscodingArgs(request);
        outputPath = result.outputPath;
        args = result.args;
      } else if ('bitrate' in request.config && 'channels' in request.config) {
        // Audio transcoding
        const result = await this.buildAudioTranscodingArgs(request);
        outputPath = result.outputPath;
        args = result.args;
      } else {
        // Subtitle extraction/segmentation
        const result = await this.buildSubtitleTranscodingArgs(request);
        outputPath = result.outputPath;
        args = result.args;
      }

      // Execute FFmpeg
      await this.executeFFmpeg(args, job);

      // Verify the output file was created
      await fs.access(outputPath);

      // Mark segment as complete
      mediaCacheManager.markSegmentComplete(request);

      // Resolve with the output path
      job.resolve(outputPath);

      logger.info(`[MediaTranscoder] Completed transcoding job: ${jobId}`);

    } catch (error) {
      logger.error(`[MediaTranscoder] Failed transcoding job ${jobId}: ${error}`);
      job.reject(error instanceof Error ? error : new Error('Unknown transcoding error'));
    } finally {
      this.cleanupJob(jobId);
    }
  }

  /**
   * Execute multi-stream transcoding (HLS/DASH)
   */
  private async executeMultiStreamTranscoding(
    mediaId: string,
    segmentNumber: number,
    config: MultiStreamConfig,
    format: 'hls' | 'dash',
    job: TranscodingJob,
  ): Promise<void> {
    const startTime = segmentNumber * this.options.segmentDuration;
    const duration = this.options.segmentDuration;

    // Build comprehensive FFmpeg arguments for all streams
    const args = await this.buildMultiStreamArgs(mediaId, segmentNumber, config, format);

    // Execute FFmpeg with progress monitoring
    await this.executeFFmpeg(args, job);
  }

  /**
   * Build FFmpeg arguments for video segment transcoding with all advanced features
   */
  private async buildVideoTranscodingArgs(request: SegmentRequest): Promise<{
    outputPath: string;
    args: string[];
  }> {
    const config = request.config as VideoConfig;
    const {mediaId, segmentNumber} = request;

    // Calculate segment timing
    const startTime = segmentNumber * this.options.segmentDuration;
    const duration = this.options.segmentDuration;

    // Output path
    const outputPath = mediaCachePaths.getVideoSegmentPath(mediaId, config, segmentNumber);

    // Check if this is original quality (no transcoding)
    const isOriginal = config.isOriginal || config.height === -1;

    let videoCodec = config.codec;
    let videoOptions: string[] = [];
    let inputArgs: string[] = [];
    let filter = '';

    if (isOriginal) {
      videoCodec = 'copy';
      videoOptions = [];
      filter = '';
    } else {
      filter = `scale=-2:${config.height}`;
      videoOptions = ['-preset', config.preset || this.options.transcodingConfig?.preset || 'fast'];
    }

    // Hardware acceleration support
    if (config.hwAccel && !isOriginal) {
      switch (config.hwAccel) {
        case 'nvenc':
          videoCodec = 'h264_nvenc';
          videoOptions = ['-preset', 'p4'];
          break;
        case 'qsv':
          videoCodec = 'h264_qsv';
          videoOptions = ['-preset', 'veryfast'];
          break;
        case 'vaapi':
          videoCodec = 'h264_vaapi';
          videoOptions = [];
          inputArgs.push(
            '-init_hw_device', 'vaapi=vaapi:/dev/dri/renderD128',
            '-filter_hw_device', 'vaapi',
          );
          filter = `scale_vaapi=w=-2:h=${config.height}:format=nv12`;
          break;
        case 'videotoolbox':
          videoCodec = 'h264_videotoolbox';
          videoOptions = [];
          break;
        case 'cpu':
        default:
          videoCodec = config.codec;
          videoOptions = ['-preset', config.preset || this.options.transcodingConfig?.preset || 'fast'];
          break;
      }
    }

    // Low latency mode
    if ((config.lowLatency || this.options.transcodingConfig?.lowLatency) && !isOriginal) {
      videoOptions.push('-tune', 'zerolatency');
    }

    // I-frame alignment with existing video frames
    let forceKeyFrames = `expr:gte(t,n_forced*${this.options.segmentDuration})`;
    try {
      const info = await getVideoInfo(this.options.inputSource);
      if (info.iFrameTimes && info.iFrameTimes.length > 0) {
        const times: string[] = [];
        let nextTarget = startTime;
        for (const t of info.iFrameTimes) {
          if (t >= nextTarget) {
            times.push(t.toFixed(6));
            nextTarget += this.options.segmentDuration;
          }
        }
        if (times.length > 0) {
          forceKeyFrames = times.join(',');
        }
      }
    } catch (e) {
      logger.debug(`[MediaTranscoder] Could not get video info for I-frame alignment: ${e}`);
    }

    // Format-specific options
    const segmentType = config.segmentType || 'fmp4';
    const isFmp4 = segmentType === 'fmp4';
    const ext = isFmp4 ? 'mp4' : 'mpegts';

    // Build FFmpeg args
    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-ss', startTime.toString(),
      ...inputArgs,
      '-i', this.options.inputSource,
      '-t', duration.toString(),
      '-map', `0:v:${config.streamIndex}`,
      '-c:v', videoCodec,
      '-b:v', `${config.bitrate}k`,
      ...videoOptions,
      ...(filter && !isOriginal ? ['-vf', filter] : []),
      '-force_key_frames', forceKeyFrames,
      '-f', ext,
      ...(isFmp4 ? ['-movflags', '+frag_keyframe+empty_moov+default_base_moof'] : []),
      outputPath,
    ];

    return {outputPath, args};
  }

  /**
   * Build FFmpeg arguments for audio segment transcoding
   */
  private async buildAudioTranscodingArgs(request: SegmentRequest): Promise<{
    outputPath: string;
    args: string[];
  }> {
    const config = request.config as AudioConfig;
    const {mediaId, segmentNumber} = request;

    // Calculate segment timing
    const startTime = segmentNumber * this.options.segmentDuration;
    const duration = this.options.segmentDuration;

    // Output path
    const outputPath = mediaCachePaths.getAudioSegmentPath(mediaId, config, segmentNumber);

    // Format-specific options
    const segmentType = config.segmentType || 'fmp4';
    const isFmp4 = segmentType === 'fmp4';
    const ext = isFmp4 ? 'mp4' : 'mpegts';

    // Build FFmpeg args
    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-ss', startTime.toString(),
      '-i', this.options.inputSource,
      '-t', duration.toString(),
      '-map', `0:a:${config.trackIndex}`,
      '-c:a', config.codec,
      '-b:a', `${config.bitrate}k`,
      '-ac', config.channels.toString(),
      '-f', ext,
      ...(isFmp4 ? ['-movflags', '+frag_keyframe+empty_moov+default_base_moof'] : []),
      outputPath,
    ];

    return {outputPath, args};
  }

  /**
   * Build FFmpeg arguments for subtitle segment extraction
   */
  private async buildSubtitleTranscodingArgs(request: SegmentRequest): Promise<{
    outputPath: string;
    args: string[];
  }> {
    const config = request.config as SubtitleConfig;
    const {mediaId, segmentNumber} = request;

    // Output path
    const outputPath = mediaCachePaths.getSubtitleSegmentPath(mediaId, config, segmentNumber);

    // Build FFmpeg args
    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-i', this.options.inputSource,
      '-map', `0:s:${config.trackIndex}`,
      '-c:s', config.format === 'webvtt' ? 'webvtt' : 'copy',
      outputPath,
    ];

    return {outputPath, args};
  }

  /**
   * Build FFmpeg arguments for multi-stream transcoding (HLS/DASH)
   */
  private async buildMultiStreamArgs(
    mediaId: string,
    segmentNumber: number,
    config: MultiStreamConfig,
    format: 'hls' | 'dash',
  ): Promise<string[]> {
    const startTime = segmentNumber * this.options.segmentDuration;
    const duration = this.options.segmentDuration;
    const mediaCacheDir = mediaCachePaths.getMediaCacheDir(mediaId);

    if (format === 'hls') {
      // HLS multi-stream arguments
      const args = [
        '-hide_banner',
        '-loglevel', 'error',
        '-ss', startTime.toString(),
        '-i', this.options.inputSource,
        '-t', duration.toString(),
      ];

      // Add video streams
      for (const videoConfig of config.videoStreams) {
        const outputPath = mediaCachePaths.getVideoSegmentPath(mediaId, videoConfig, segmentNumber);
        args.push(
          '-map', `0:v:${videoConfig.streamIndex}`,
          '-c:v', videoConfig.codec,
          '-b:v', `${videoConfig.bitrate}k`,
          '-vf', `scale=-2:${videoConfig.height}`,
          outputPath,
        );
      }

      // Add audio streams
      for (const audioConfig of config.audioStreams) {
        const outputPath = mediaCachePaths.getAudioSegmentPath(mediaId, audioConfig, segmentNumber);
        args.push(
          '-map', `0:a:${audioConfig.trackIndex}`,
          '-c:a', audioConfig.codec,
          '-b:a', `${audioConfig.bitrate}k`,
          '-ac', audioConfig.channels.toString(),
          outputPath,
        );
      }

      return args;
    } else {
      // DASH arguments (simplified for now)
      const manifestPath = path.join(mediaCacheDir, 'manifests', 'dash', 'multistream.mpd');
      return [
        '-hide_banner',
        '-loglevel', 'error',
        '-ss', startTime.toString(),
        '-i', this.options.inputSource,
        '-t', duration.toString(),
        '-f', 'dash',
        '-seg_duration', duration.toString(),
        '-use_template', '1',
        '-use_timeline', '1',
        manifestPath,
      ];
    }
  }

  /**
   * Execute FFmpeg with JSON progress monitoring
   */
  private async executeFFmpeg(args: string[], job: TranscodingJob): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(ffmpegPath, args);
      job.process = process;

      let stderr = '';

      // Add JSON progress reporting
      const jsonArgs = [...args, '-progress', 'pipe:2'];
      const jsonProcess = spawn(ffmpegPath, jsonArgs);

      // Monitor JSON progress output
      jsonProcess.stderr?.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const progress: FFmpegProgress = JSON.parse(line);
              const progressPercent = (progress.out_time_ms / (this.options.segmentDuration * 1000000)) * 100;

              this.emit('progress', {
                jobId: job.id,
                progress: Math.min(progressPercent, 100),
                frame: progress.frame,
                fps: progress.fps,
                bitrate: progress.bit_rate,
                speed: progress.speed,
                time: progress.out_time,
              });
            } catch (e) {
              // Not JSON, ignore
            }
          }
        }
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`FFmpeg process error: ${error.message}`));
      });
    });
  }

  /**
   * Wait for an existing transcoding job to complete
   */
  private async waitForExistingJob(request: SegmentRequest): Promise<string> {
    const jobId = this.getJobId(request);

    return new Promise<string>((resolve, reject) => {
      const checkInterval = 100; // Check every 100ms
      const maxWaitTime = this.jobTimeout;
      const startTime = Date.now();

      const checkJob = () => {
        const job = this.activeJobs.get(jobId);

        if (Date.now() - startTime > maxWaitTime) {
          reject(new Error(`Timeout waiting for job: ${jobId}`));
          return;
        }

        if (job) {
          // Replace the job's resolve/reject with our own
          job.resolve = resolve;
          job.reject = reject;
        } else {
          // Job completed, check cache again
          mediaCacheManager.checkSegmentStatus(request).then((status) => {
            if (status.exists && status.path) {
              resolve(status.path);
            } else {
              setTimeout(checkJob, checkInterval);
            }
          });
        }
      };

      checkJob();
    });
  }

  /**
   * Generate a unique job ID for a segment request
   */
  private getJobId(request: SegmentRequest): string {
    let id = `${request.mediaId}_${request.segmentNumber}`;

    if ('height' in request.config) {
      const config = request.config as VideoConfig;
      id += `_video_${config.height}p_${config.bitrate}kbps_${config.codec}_${config.streamIndex}`;
    } else if ('bitrate' in request.config && 'channels' in request.config) {
      const config = request.config as AudioConfig;
      id += `_audio_${config.bitrate}kbps_${config.codec}_${config.trackIndex}`;
    } else {
      const config = request.config as SubtitleConfig;
      id += `_subtitle_${config.language}_${config.format}_${config.trackIndex}`;
    }

    return id;
  }

  /**
   * Clean up a completed or failed job
   */
  private cleanupJob(jobId: string): void {
    const job = this.activeJobs.get(jobId);

    if (job) {
      // Kill the process if it's still running
      if (job.process && !job.process.killed) {
        job.process.kill('SIGKILL');
      }

      // Mark segment as complete (even if failed, to prevent retry loops)
      mediaCacheManager.markSegmentComplete(job.request);

      // Remove from active jobs
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Get current transcoding statistics
   */
  getStats(): {
    activeJobs: number;
    maxConcurrentJobs: number;
    jobIds: string[];
  } {
    return {
      activeJobs: this.activeJobs.size,
      maxConcurrentJobs: this.maxConcurrentJobs,
      jobIds: Array.from(this.activeJobs.keys()),
    };
  }

  /**
   * Cancel all active jobs
   */
  cancelAllJobs(): void {
    for (const [jobId, job] of this.activeJobs) {
      if (job.process && !job.process.killed) {
        job.process.kill('SIGKILL');
      }
      job.reject(new Error('Transcoding job cancelled'));
    }
    this.activeJobs.clear();
  }
}
