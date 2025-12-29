import { EventEmitter } from 'events';
import { logger } from './logger';
import { AudioConfig, mediaCachePaths, SegmentRequest, SubtitleConfig, VideoConfig } from '../utils/mediaCachePaths';
import { mediaCacheManager } from './mediaCacheManager';
import { ffmpegPath, getVideoInfo } from './ffmpeg';
import { TranscodeOptions } from '../config';
import { sha256 } from '../utils/hash';
import { ChildProcess, spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as fssync from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Session, SessionManager, SessionConfig, SessionData } from '../session';
import { ipcClient, ipcServer, type IPCMessageRegistry } from '../ipc';
import { homeDir, stateManager } from '../state';
import {
  getAudioSegmentFilename,
  getDashChunkFilename,
  getDashInitFilename,
  getHlsInitFilename,
  getSegmentPrefix,
  getSessionDir,
  getVideoSegmentFilename,
} from '../utils/paths';

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

export { TranscodeOptions } from '../config';

export let mediaTranscodeOptions: TranscodeOptions;

export function setMediaTranscodeOptions(options: TranscodeOptions) {
  mediaTranscodeOptions = options;
}

export const mediaTranscoders = new Map<string, MediaTranscoder>();

export function getMediaTranscoder(id: string, file: string, optionsOverride?: Partial<TranscodeOptions>) {
  let key = id;
  if (optionsOverride && Object.keys(optionsOverride).length > 0) {
    key = `${id}-${sha256(JSON.stringify(optionsOverride))}`;
  }

  if (!mediaTranscoders.has(key)) {
    const mergedConfig = { ...mediaTranscodeOptions, ...optionsOverride };

    if (mediaTranscoders.size >= mergedConfig.maxTranscoders) {
      logger.warn(`[MediaTranscoder] Maximum number of transcoders reached (${mediaTranscoders.size}/${mergedConfig.maxTranscoders}). Cannot create new transcoder for ${key}.`);
      throw new Error(`Maximum number of concurrent transcoders reached (${mergedConfig.maxTranscoders}). Please try again later.`);
    }

    const transcoder = new MediaTranscoder(key, file, mergedConfig);
    mediaTranscoders.set(key, transcoder);
    transcoder.start();

    logger.info(`[MediaTranscoder] Created new transcoder ${key} (${mediaTranscoders.size}/${mergedConfig.maxTranscoders} active)`);
  }
  return mediaTranscoders.get(key)!;
}

export class MediaTranscoder extends EventEmitter {
  private readonly id: string;
  private readonly config: TranscodeOptions;
  private lastRequestTime: Date = new Date();
  isRunning = false;
  idleTimer: NodeJS.Timeout | null = null;
  inputSource: string;
  private sessionManager: SessionManager;
  private availableSegments: Map<string, Set<string>> = new Map(); // sessionId -> Set<filename>
  private sessionCreationPromises: Map<string, Promise<void>> = new Map(); // sessionId -> creation promise
  private segmentRequestCache: Map<string, number> = new Map(); // "height-segment" -> timestamp

  static instances = new Map<string, MediaTranscoder>();

  constructor(id: string, inputSource: string, config: TranscodeOptions) {
    super();
    this.id = id;
    this.inputSource = inputSource;
    this.config = config;
    this.sessionManager = new SessionManager(this.getSessionConfig());
  }

  private getSessionConfig(): SessionConfig {
    return {
      segmentDuration: this.config.segmentDuration,
      idleTimeout: this.config.idleTimeout,
      userActivityWindow: 2 * 60 * 1000, // 2 minutes
      sessionProtectionPeriod: 2 * 60 * 1000, // 2 minutes
      recentActivityThreshold: 30 * 1000, // 30 seconds
      sessionAgeThreshold: 5 * 60 * 1000, // 5 minutes
      maxUsersPerSession: 2,
      cleanupDelaySingleUser: 30 * 1000, // 30 seconds
      cleanupDelayMultipleUsers: 60 * 1000, // 1 minute
    };
  }

  static setupMessageHandlers() {
    // Set up typed IPC message handlers
    ipcServer.onMessage('segmentAvailable', (data) => {
      const instance = MediaTranscoder.instances.get(data.sessionId);
      if (instance) {
        instance.onSegmentAvailable(data.sessionId, data.segment);
      }
    });

    ipcServer.onMessage('sessionStopped', (data) => {
      const instance = MediaTranscoder.instances.get(data.sessionId);
      if (instance) {
        instance.onSessionStopped(data.sessionId);
      }
    });
  }

  public getSessions(): SessionData[] {
    return this.sessionManager.getAllSessions().map(session => session.toSessionData());
  }

  public getInputSource(): string {
    return this.inputSource;
  }

  public getAvailableSegmentsCount(sessionId: string): number {
    return this.availableSegments.get(sessionId)?.size || 0;
  }

  public getLastRequestTime(): Date {
    return this.lastRequestTime;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastRequestTime = new Date();
    this.idleTimeoutMonitor();
    setInterval(async () => await stateManager.saveTranscoder(this.id, this), 5000);
  }

  async stop() {
    this.isRunning = false;
    if (this.idleTimer) clearTimeout(this.idleTimer);

    const transcoderCount = mediaTranscoders.size;
    logger.info(`[MediaTranscoder] Stopping transcoder ${this.id} (${transcoderCount}/${this.config.maxTranscoders} active)`);

    for (const session of this.sessionManager.getAllSessions()) {
      ipcClient.stopSession({ sessionId: session.id });
      MediaTranscoder.instances.delete(session.id);
    }
    this.sessionManager.getAllSessions().forEach(session => this.sessionManager.removeSession(session.id));
    this.availableSegments.clear();
    this.sessionCreationPromises.clear();
    await stateManager.saveTranscoder(this.id, this);
  }

  private idleTimeoutMonitor() {
    this.idleTimer = setInterval(() => {
      const aggressiveCleanupTimeout = 5 * 60 * 1000;

      this.sessionManager.cleanupExpiredUsers();
      const sessionsNeedingCleanup = this.sessionManager.getSessionsNeedingCleanup();

      for (const session of sessionsNeedingCleanup) {
        const timeSinceLastUsed = Date.now() - session.lastUsed;
        if (session.isExpiredForAggressiveCleanup(aggressiveCleanupTimeout)) {
          logger.debug(`[MediaTranscoder] Aggressively cleaning up idle session ${session.id} (idle: ${Math.round(timeSinceLastUsed / 1000)}s)`);
        } else {
          logger.debug(`[MediaTranscoder] Cleaning up idle session ${session.id} (idle: ${Math.round(timeSinceLastUsed / 1000)}s)`);
        }
        ipcClient.stopSession({ sessionId: session.id });
        MediaTranscoder.instances.delete(session.id);
        this.sessionManager.removeSession(session.id);
        this.availableSegments.delete(session.id);
        this.sessionCreationPromises.delete(session.id);
      }

      if (this.sessionManager.getSessionCount() === 0) {
        this.stop();
        mediaTranscoders.delete(this.id);
      }
    }, 30000);
  }

  private async ensureSession(variantId: string, format: 'hls' | 'dash', startSegment: number): Promise<string> {
    const variant = this.config.variants.find(v => v.id === variantId);
    if (!variant && variantId !== 'audio') {
      throw new Error(`Variant with ID ${variantId} not found`);
    }
    const configHash = sha256(JSON.stringify(this.config));
    const videoStreamIndex = variant?.videoStreamIndex ?? 0;
    const session = this.sessionManager.createSession(variantId, format, startSegment, this.inputSource, configHash, videoStreamIndex);

    if (this.sessionCreationPromises.has(session.id)) {
      logger.debug(`[MediaTranscoder] Session creation already in progress: ${session.id}. Waiting...`);
      await this.sessionCreationPromises.get(session.id);
      return session.id;
    }

    const creationPromise = this.createSessionInWorker(session, variantId, format, startSegment);
    this.sessionCreationPromises.set(session.id, creationPromise);

    try {
      await creationPromise;
      return session.id;
    } finally {
      this.sessionCreationPromises.delete(session.id);
    }
  }

  private async createSessionInWorker(session: Session, variantId: string, format: 'hls' | 'dash', startSegment: number): Promise<void> {
    const variant = this.config.variants.find(v => v.id === variantId);
    if (!variant && variantId !== 'audio') {
      throw new Error(`Variant with ID ${variantId} not found`);
    }
    const videoStreamIndex = variant?.videoStreamIndex ?? 0;
    const outputDir = getSessionDir(session.id);
    logger.info(`[MediaTranscoder] Creating new session in worker: ${session.id}`);
    MediaTranscoder.instances.set(session.id, this);
    const startTime = startSegment * this.config.segmentDuration;

    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        ipcServer.offMessage('sessionStarted', handleSessionStarted);
        ipcServer.offMessage('sessionError', handleSessionError);
      };
      const handleSessionStarted = (data: IPCMessageRegistry['sessionStarted']) => {
        if (data.sessionId === session.id) {
          logger.debug(`[MediaTranscoder] Session started confirmation received: ${session.id}`);
          cleanup();
          resolve();
        }
      };
      const handleSessionError = (data: IPCMessageRegistry['sessionError']) => {
        if (data.sessionId === session.id) {
          logger.error(`[MediaTranscoder] Session start failed: ${session.id} - ${data.error}`);
          cleanup();
          this.sessionManager.removeSession(session.id);
          MediaTranscoder.instances.delete(session.id);
          reject(new Error(data.error));
        }
      };
      ipcServer.onMessage('sessionStarted', handleSessionStarted);
      ipcServer.onMessage('sessionError', handleSessionError);
      logger.debug(`[MediaTranscoder] Sending startSession message to worker for ${session.id}`);
      ipcClient.startSession({
        sessionId: session.id,
        file: this.inputSource,
        config: this.config,
        variantId, // Pass variantId to the worker
        outputDir,
        format,
        startTime,
        startNumber: startSegment,
        videoStreamIndex,
      });
    });
  }

  onSessionStopped(sessionId: string) {
    logger.warn(`[MediaTranscoder] Session ${sessionId} stopped unexpectedly.`);
    this.sessionManager.removeSession(sessionId);
    this.sessionCreationPromises.delete(sessionId);
    MediaTranscoder.instances.delete(sessionId);
    this.emit(`sessionStopped:${sessionId}`);
  }

  onSegmentAvailable(sessionId: string, segment: string) {
    if (!this.availableSegments.has(sessionId)) {
      this.availableSegments.set(sessionId, new Set());
    }
    this.availableSegments.get(sessionId)!.add(segment);
    const session = this.sessionManager.getSession(sessionId);
    if (session) {
      session.onSegmentAvailable(segment);
    }
    this.emit(`segmentAvailable:${sessionId}:${segment}`);
  }

  private async getOrStartSession(variantId: string, format: 'hls' | 'dash', segmentNumber: number, isInit: boolean): Promise<SessionData> {
    this.lastRequestTime = new Date();
    if (!this.isRunning) this.start();
    const userId = this.sessionManager.generateUserId();
    this.sessionManager.cleanupExpiredUsers();
    const compatibleSessions = this.sessionManager.findCompatibleSessions(variantId, format, segmentNumber, isInit);

    for (const session of compatibleSessions) {
      const segmentGap = session.getSegmentGap(segmentNumber);
      logger.debug(`[MediaTranscoder] Session ${session.id}: startSeg=${session.startSegment}, maxSeg=${session.maxSegment}, requested=${segmentNumber}, gap=${segmentGap}`);
      if (segmentGap > 24) { // RESTART_THRESHOLD
        const restartDecision = this.sessionManager.evaluateSessionRestart(session, userId);
        if (restartDecision.allowed) {
          const restartPlan = this.sessionManager.planSessionRestart(session, segmentNumber);
          logger.info(`[MediaTranscoder] Session ${session.id} restart: ${restartDecision.reason}`);
          await this.ensureSession(variantId, format, restartPlan.startSegment);
          this.sessionManager.markSessionForDelayedCleanup(session.id);
          const newSessions = this.sessionManager.findCompatibleSessions(variantId, format, restartPlan.startSegment, isInit);
          const newSession = newSessions[0];
          if (newSession) {
            this.sessionManager.addUserToSession(newSession.id, userId, restartPlan.startSegment);
            return newSession.getData();
          }
        } else {
          logger.info(`[MediaTranscoder] Session ${session.id} restart blocked: ${restartDecision.reason}`);
          continue;
        }
      } else if (segmentGap > 12) { // LOOKAHEAD_THRESHOLD
        logger.debug(`[MediaTranscoder] Session ${session.id} is too far behind (gap: ${segmentGap})`);
        continue;
      }
      logger.debug(`[MediaTranscoder] Reusing session ${session.id} (Variant: ${variantId}, Seg: ${segmentNumber}, Init: ${isInit})`);
      this.sessionManager.addUserToSession(session.id, userId, segmentNumber);
      return session.getData();
    }

    const startSegment = isInit ? 0 : segmentNumber;
    logger.debug(`[MediaTranscoder] No compatible sessions found. Creating new session (Variant: ${variantId}, Format: ${format}, StartSeg: ${startSegment})`);
    await this.ensureSession(variantId, format, startSegment);
    const newSessions = this.sessionManager.findCompatibleSessions(variantId, format, startSegment, isInit);
    const newSession = newSessions[0];
    if (!newSession) {
      throw new Error(`Failed to create/retrieve session (Variant: ${variantId}, Format: ${format}, StartSeg: ${startSegment})`);
    }
    this.sessionManager.addUserToSession(newSession.id, userId, startSegment);
    return newSession.getData();
  }

  async requestSegment(segmentNumber: number, height: number): Promise<string> {
    const variant = this.config.variants.find(v => v.height === height || (v.height === -1 && v.bitrate === 'original' && height === -1));
    if (!variant) {
      throw new Error(`Variant with height ${height} not found`);
    }

    const segmentRequest: SegmentRequest = {
      mediaId: this.id,
      segmentNumber,
      config: {
        height: variant.height,
        bitrate: parseInt(variant.bitrate),
        codec: this.config.videoCodec || 'libx264',
        streamIndex: variant.videoStreamIndex || 0,
        isOriginal: variant.height === -1 && variant.bitrate === 'original',
        preset: this.config.preset,
        hwAccel: this.config.hwAccel,
        lowLatency: this.config.lowLatency,
        segmentType: this.config.hlsSegmentType,
        format: 'hls',
      } as VideoConfig,
    };

    // 1. Check persistent cache first
    const cacheStatus = await mediaCacheManager.checkSegmentStatus(segmentRequest);
    if (cacheStatus.exists && cacheStatus.path) {
      logger.debug(`[MediaTranscoder] Segment ${segmentNumber} found in persistent cache: ${cacheStatus.path}`);
      return cacheStatus.path;
    }

    // 2. If not in cache, proceed with session-based generation
    const requestKey = `${height}-${segmentNumber}`;
    const now = Date.now();
    const lastRequest = this.segmentRequestCache.get(requestKey);
    if (lastRequest && (now - lastRequest) < 500) {
      await new Promise(resolve => setTimeout(resolve, 500 - (now - lastRequest)));
    }
    this.segmentRequestCache.set(requestKey, Date.now());

    const session = await this.getOrStartSession(variant.id, 'hls', segmentNumber, false);
    const outputDir = getSessionDir(session.id);
    const isFmp4 = this.config.hlsSegmentType === 'fmp4';
    const filename = `${getSegmentPrefix(false, undefined)}${getVideoSegmentFilename(segmentNumber, isFmp4)}`;

    this.checkThrottling(session.id, segmentNumber);

    logger.debug(`[MediaTranscoder] Waiting for file: ${filename} in ${outputDir}`);
    const sessionPath = await this.waitForFile(session.id, outputDir, filename);

    // 3. Store the newly generated segment in the persistent cache
    try {
      return await mediaCacheManager.storeSegment(segmentRequest, sessionPath);
    } catch (error) {
      logger.warn(`[MediaTranscoder] Failed to store segment in persistent cache, returning session path. Error: ${error}`);
      return sessionPath; // Return the session path as a fallback
    }
  }

  async requestHlsInit(height: number): Promise<string> {
    const variant = this.config.variants.find(v => v.height === height || (v.height === -1 && v.bitrate === 'original' && height === -1));
    if (!variant) {
      throw new Error(`Variant with height ${height} not found`);
    }

    const initRequest = {
      mediaId: this.id,
      config: {
        height: variant.height,
        bitrate: parseInt(variant.bitrate),
        codec: this.config.videoCodec || 'libx264',
        streamIndex: variant.videoStreamIndex || 0,
        isOriginal: variant.height === -1 && variant.bitrate === 'original',
        format: 'hls',
      } as VideoConfig,
    };

    const cacheStatus = await mediaCacheManager.checkInitSegmentStatus(initRequest);
    if (cacheStatus.exists && cacheStatus.path) {
      logger.debug(`[MediaTranscoder] HLS Init segment found in persistent cache: ${cacheStatus.path}`);
      return cacheStatus.path;
    }

    const session = await this.getOrStartSession(variant.id, 'hls', 0, true);
    const outputDir = getSessionDir(session.id);
    const filename = getHlsInitFilename(false);
    logger.debug(`[MediaTranscoder] Requesting HLS Init from session ${session.id} in ${outputDir}`);
    const sessionPath = await this.waitForFile(session.id, outputDir, filename);

    try {
      return await mediaCacheManager.storeInitSegment(initRequest, sessionPath);
    } catch (error) {
      logger.warn(`[MediaTranscoder] Failed to store HLS init segment in persistent cache: ${error}`);
      return sessionPath;
    }
  }

  async requestDashChunk(segmentNumber: number, height: number, streamType: 'video' | 'audio', audioCodec?: string): Promise<string> {
    const variant = this.config.variants.find(v => v.height === height || (v.height === -1 && v.bitrate === 'original' && height === -1));
    if (!variant) {
      throw new Error(`Variant with height ${height} not found`);
    }

    const segmentRequest: SegmentRequest = {
      mediaId: this.id,
      segmentNumber,
      config: streamType === 'video'
        ? {
            height: variant.height,
            bitrate: parseInt(variant.bitrate),
            codec: this.config.videoCodec || 'libx264',
            streamIndex: variant.videoStreamIndex || 0,
            isOriginal: variant.height === -1 && variant.bitrate === 'original',
            format: 'dash',
          } as VideoConfig
        : {
            bitrate: parseInt(this.config.audio.bitrate),
            codec: audioCodec || this.config.audio.defaultCodec || 'aac',
            trackIndex: 0, // Assuming first audio track
            channels: 2,
            format: 'dash',
          } as AudioConfig,
    };

    const cacheStatus = await mediaCacheManager.checkSegmentStatus(segmentRequest);
    if (cacheStatus.exists && cacheStatus.path) {
      logger.debug(`[MediaTranscoder] DASH chunk ${segmentNumber} found in persistent cache: ${cacheStatus.path}`);
      return cacheStatus.path;
    }

    const session = await this.getOrStartSession(variant.id, 'dash', segmentNumber, false);
    const outputDir = getSessionDir(session.id);
    const streamId = streamType === 'video' ? 0 : 1;
    const filename = getDashChunkFilename(streamId, segmentNumber);
    if (streamType === 'video') {
      this.checkThrottling(session.id, segmentNumber);
    }
    const sessionPath = await this.waitForFile(session.id, outputDir, filename);

    try {
      return await mediaCacheManager.storeSegment(segmentRequest, sessionPath);
    } catch (error) {
      logger.warn(`[MediaTranscoder] Failed to store DASH chunk in persistent cache: ${error}`);
      return sessionPath;
    }
  }

  private checkThrottling(sessionId: string, segmentNumber: number) {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) return;
    const bufferSegments = session.maxSegment - segmentNumber;
    const bufferDuration = bufferSegments * this.config.segmentDuration;
    if (!session.isPaused && bufferDuration >= this.config.throttleBufferSize) {
      ipcClient.pauseSession({ sessionId });
      session.setPaused(true);
    } else if (session.isPaused && bufferDuration <= this.config.minThrottleBufferSize) {
      ipcClient.resumeSession({ sessionId });
      session.setPaused(false);
    }
  }

  async requestDashInit(height: number, streamType: 'video' | 'audio', audioCodec?: string): Promise<string> {
    const variant = this.config.variants.find(v => v.height === height || (v.height === -1 && v.bitrate === 'original' && height === -1));
    if (!variant) {
      throw new Error(`Variant with height ${height} not found`);
    }

    const initRequest = {
      mediaId: this.id,
      config: streamType === 'video'
        ? {
            height: variant.height,
            bitrate: parseInt(variant.bitrate),
            codec: this.config.videoCodec || 'libx264',
            streamIndex: variant.videoStreamIndex || 0,
            isOriginal: variant.height === -1 && variant.bitrate === 'original',
            format: 'dash',
          } as VideoConfig
        : {
            bitrate: parseInt(this.config.audio.bitrate),
            codec: audioCodec || this.config.audio.defaultCodec || 'aac',
            trackIndex: 0, // Assuming first audio track for now
            channels: 2,
            format: 'dash',
          } as AudioConfig,
    };

    const cacheStatus = await mediaCacheManager.checkInitSegmentStatus(initRequest);
    if (cacheStatus.exists && cacheStatus.path) {
      logger.debug(`[MediaTranscoder] DASH Init segment found in persistent cache: ${cacheStatus.path}`);
      return cacheStatus.path;
    }

    const session = await this.getOrStartSession(variant.id, 'dash', 0, true);
    const outputDir = getSessionDir(session.id);
    const streamId = streamType === 'video' ? 0 : 1;
    const filename = getDashInitFilename(streamId);
    logger.debug(`[MediaTranscoder] Requesting DASH Init from session ${session.id}`);
    const sessionPath = await this.waitForFile(session.id, outputDir, filename);

    try {
      return await mediaCacheManager.storeInitSegment(initRequest, sessionPath);
    } catch (error) {
      logger.warn(`[MediaTranscoder] Failed to store DASH init segment in persistent cache: ${error}`);
      return sessionPath;
    }
  }

  async requestHlsAudioSegment(segmentNumber: number, index: number, audioCodec?: string): Promise<string> {
    const segmentRequest: SegmentRequest = {
      mediaId: this.id,
      segmentNumber,
      config: {
        bitrate: parseInt(this.config.audio.bitrate),
        codec: audioCodec || this.config.audio.defaultCodec || 'aac',
        trackIndex: index,
        channels: 2,
        segmentType: this.config.hlsSegmentType,
        format: 'hls',
      } as AudioConfig,
    };

    const cacheStatus = await mediaCacheManager.checkSegmentStatus(segmentRequest);
    if (cacheStatus.exists && cacheStatus.path) {
      logger.debug(`[MediaTranscoder] HLS audio segment ${segmentNumber} found in persistent cache: ${cacheStatus.path}`);
      return cacheStatus.path;
    }

    // Audio segments should use a dedicated audio session, not tied to video variants
    const audioVariantId = 'audio';
    const session = await this.getOrStartSession(audioVariantId, 'hls', segmentNumber, false);
    const outputDir = getSessionDir(session.id);
    const isFmp4 = this.config.hlsSegmentType === 'fmp4';
    const filename = `${getSegmentPrefix(true, index)}${getAudioSegmentFilename(segmentNumber, isFmp4)}`;
    this.checkThrottling(session.id, segmentNumber);
    const sessionPath = await this.waitForFile(session.id, outputDir, filename);

    try {
      return await mediaCacheManager.storeSegment(segmentRequest, sessionPath);
    } catch (error) {
      logger.warn(`[MediaTranscoder] Failed to store HLS audio segment in persistent cache: ${error}`);
      return sessionPath;
    }
  }

  async requestHlsAudioInit(index: number, audioCodec?: string): Promise<string> {
    const initRequest = {
      mediaId: this.id,
      config: {
        bitrate: parseInt(this.config.audio.bitrate),
        codec: audioCodec || this.config.audio.defaultCodec || 'aac',
        trackIndex: index,
        channels: 2,
        format: 'hls',
      } as AudioConfig,
    };

    const cacheStatus = await mediaCacheManager.checkInitSegmentStatus(initRequest);
    if (cacheStatus.exists && cacheStatus.path) {
      logger.debug(`[MediaTranscoder] HLS audio init segment found in persistent cache: ${cacheStatus.path}`);
      return cacheStatus.path;
    }

    // Audio init segments should use a dedicated audio session, not tied to video variants
    const audioVariantId = 'audio';
    const session = await this.getOrStartSession(audioVariantId, 'hls', 0, true);
    const outputDir = getSessionDir(session.id);
    const filename = getHlsInitFilename(true, index);
    logger.debug(`[MediaTranscoder] Requesting Audio Init from session ${session.id}`);
    const sessionPath = await this.waitForFile(session.id, outputDir, filename);

    try {
      return await mediaCacheManager.storeInitSegment(initRequest, sessionPath);
    } catch (error) {
      logger.warn(`[MediaTranscoder] Failed to store HLS audio init segment in persistent cache: ${error}`);
      return sessionPath;
    }
  }

  private async waitForFile(sessionId: string, outputDir: string, filename: string): Promise<string> {
    const filePath = path.join(outputDir, filename);
    if (this.availableSegments.get(sessionId)?.has(filename)) {
      try {
        const stats = await fssync.promises.stat(filePath);
        if (stats.size > 0) {
          logger.debug(`[MediaTranscoder] File ${filename} found in 'availableSegments' map and verified on disk.`);
          return filePath;
        } else {
          logger.debug(`[MediaTranscoder] File ${filename} marked available but size is 0, waiting...`);
        }
      } catch (err) {
        logger.debug(`[MediaTranscoder] File ${filename} marked available but not found on disk, waiting...`);
      }
    }
    logger.debug(`[MediaTranscoder] File ${filename} not found. Waiting...`);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        logger.error(`[MediaTranscoder] Timeout waiting for ${filename}`);
        reject(new Error(`File generation timeout: ${filename}`));
      }, 60000);
      const checkInterval = setInterval(async () => {
        try {
          const stats = await fssync.promises.stat(filePath);
          if (stats.size > 0) {
            logger.debug(`[MediaTranscoder] File ${filename} found via polling.`);
            cleanup();
            resolve(filePath);
          }
        } catch {}
      }, 500);
      const onAvailable = async () => {
        logger.debug(`[MediaTranscoder] File ${filename} reported available via event.`);
        let retries = 0;
        const verifyInterval = setInterval(async () => {
          try {
            const stats = await fssync.promises.stat(filePath);
            if (stats.size > 0) {
              clearInterval(verifyInterval);
              cleanup();
              resolve(filePath);
              return;
            }
          } catch {}
          retries++;
          if (retries > 20) {
            clearInterval(verifyInterval);
            logger.warn(`[MediaTranscoder] File ${filename} verification timed out (size 0), returning anyway.`);
            cleanup();
            resolve(filePath);
          }
        }, 50);
      };
      const onStopped = () => {
        cleanup();
        reject(new Error(`Session stopped while waiting for file: ${filename}`));
      };
      const eventName = `segmentAvailable:${sessionId}:${filename}`;
      const stopEventName = `sessionStopped:${sessionId}`;
      this.once(eventName, onAvailable);
      this.once(stopEventName, onStopped);
      const cleanup = () => {
        clearTimeout(timeout);
        clearInterval(checkInterval);
        this.removeListener(eventName, onAvailable);
        this.removeListener(stopEventName, onStopped);
      };
    });
  }

  async requestIFrame(index: number): Promise<string> {
    this.lastRequestTime = new Date();
    const key = `${this.inputSource}_${index}`;
    const cachePath = path.join(homeDir, 'cache', 'i-frames', sha256(key));
    if (fssync.existsSync(cachePath)) {
      return cachePath;
    }
    return await new Promise<string>((resolve, reject) => {
      const requestId = crypto.randomBytes(16).toString('hex');
      const cleanup = () => {
        ipcServer.offMessage('iFrameResponse', handleIFrameResponse);
      };
      const handleIFrameResponse = (data: IPCMessageRegistry['iFrameResponse']) => {
        if (data.requestId === requestId) {
          if (data.data.path) {
            cleanup();
            resolve(data.data.path);
          } else if (data.data.error) {
            cleanup();
            reject(new Error(data.data.error));
          } else {
            cleanup();
            reject(new Error('IFrame extraction failed: Unknown error'));
          }
        }
      };
      ipcServer.onMessage('iFrameResponse', handleIFrameResponse);
      ipcClient.extractIFrame({
        file: this.inputSource,
        index,
        requestId,
      });
    });
  }
}

MediaTranscoder.setupMessageHandlers();