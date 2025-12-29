import { EventEmitter } from 'events';
import { TranscodeOptions } from '../config';
import { homeDir, stateManager } from '../state';
import { logger } from './logger';
import {
  getAudioSegmentFilename,
  getDashChunkFilename,
  getDashInitFilename,
  getHlsInitFilename,
  getSegmentPrefix,
  getSessionDir,
  getVideoSegmentFilename,
} from '../utils/paths';
import type { SessionConfig, SessionData } from '../session';
import { Session, SessionManager } from '../session';
import { ipcClient, ipcServer, type IPCMessageRegistry } from '../ipc';

import * as path from 'path';
import * as fssync from 'fs';
import * as crypto from 'crypto';
import { sha256 } from '../utils/hash';

export { TranscodeOptions } from '../config';

export class Transcoder extends EventEmitter {
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

  static instances = new Map<string, Transcoder>();

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
      const instance = Transcoder.instances.get(data.sessionId);
      if (instance) {
        instance.onSegmentAvailable(data.sessionId, data.segment);
      }
    });

    ipcServer.onMessage('sessionStopped', (data) => {
      const instance = Transcoder.instances.get(data.sessionId);
      if (instance) {
        instance.onSessionStopped(data.sessionId);
      }
    });
  }

  constructor(id: string, inputSource: string, config: TranscodeOptions) {
    super();
    this.id = id;
    this.config = config;
    this.inputSource = inputSource;
    this.sessionManager = new SessionManager(this.getSessionConfig());
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

    const transcoderCount = transcoders.size;
    logger.info(`[Transcoder] Stopping transcoder ${this.id} (${transcoderCount}/${this.config.maxTranscoders} active)`);

    for (const session of this.sessionManager.getAllSessions()) {
      ipcClient.stopSession({ sessionId: session.id });
      Transcoder.instances.delete(session.id);
    }
    this.sessionManager.getAllSessions().forEach(session => this.sessionManager.removeSession(session.id));
    this.availableSegments.clear();
    this.sessionCreationPromises.clear(); // Clean up any pending creation promises
    await stateManager.saveTranscoder(this.id, this);
  }

  private idleTimeoutMonitor() {
    this.idleTimer = setInterval(() => {
      const timeout = this.config.idleTimeout * 60 * 1000;
      const aggressiveCleanupTimeout = 5 * 60 * 1000; // 5 minutes for aggressive cleanup

      // Clean up expired users first
      this.sessionManager.cleanupExpiredUsers();

      // Find sessions that need cleanup
      const sessionsNeedingCleanup = this.sessionManager.getSessionsNeedingCleanup();

      for (const session of sessionsNeedingCleanup) {
        const timeSinceLastUsed = Date.now() - session.lastUsed;

        if (session.isExpiredForAggressiveCleanup(aggressiveCleanupTimeout)) {
          // Aggressive cleanup for sessions idle > 5 minutes OR marked for cleanup
          logger.debug(`[Transcoder] Aggressively cleaning up idle session ${session.id} (idle: ${Math.round(timeSinceLastUsed / 1000)}s)`);
        } else {
          // Regular idle timeout cleanup
          logger.debug(`[Transcoder] Cleaning up idle session ${session.id} (idle: ${Math.round(timeSinceLastUsed / 1000)}s)`);
        }

        ipcClient.stopSession({ sessionId: session.id });
        Transcoder.instances.delete(session.id);
        this.sessionManager.removeSession(session.id);
        this.availableSegments.delete(session.id);
        this.sessionCreationPromises.delete(session.id); // Clean up creation promise
      }

      if (this.sessionManager.getSessionCount() === 0) {
        this.stop();
        transcoders.delete(this.id);
      }
    }, 30000);
  }

  private async ensureSession(height: number, format: 'hls' | 'dash', startSegment: number): Promise<string> {
    // Find the variant that matches this height
    const variant = this.config.variants.find(v =>
      (v.original && height === -1) || (!v.original && v.height === height),
    );

    // Include config in hash to prevent collisions between different quality settings
    const configHash = sha256(JSON.stringify(this.config));
    const videoStreamIndex = variant?.videoStreamIndex ?? 0;

    // Use SessionManager to create session
    const session = this.sessionManager.createSession(
      height,
      format,
      startSegment,
      this.inputSource,
      configHash,
      videoStreamIndex,
    );

    // Check if session is currently being created
    if (this.sessionCreationPromises.has(session.id)) {
      logger.debug(`[Transcoder] Session creation already in progress: ${session.id}. Waiting...`);
      await this.sessionCreationPromises.get(session.id);
      return session.id;
    }

    // Create and store the session creation promise
    const creationPromise = this.createSessionInWorker(session, height, format, startSegment);
    this.sessionCreationPromises.set(session.id, creationPromise);

    try {
      await creationPromise;
      return session.id;
    } finally {
      // Clean up the creation promise regardless of success/failure
      this.sessionCreationPromises.delete(session.id);
    }
  }

  private async createSessionInWorker(session: Session, height: number, format: 'hls' | 'dash', startSegment: number): Promise<void> {
    // Find the variant that matches this height
    const variant = this.config.variants.find(v =>
      (v.original && height === -1) || (!v.original && v.height === height),
    );
    const videoStreamIndex = variant?.videoStreamIndex ?? 0;

    const outputDir = getSessionDir(session.id);
    logger.info(`[Transcoder] Creating new session in worker: ${session.id}`);
    logger.debug(`[Transcoder] Session Hash Input: ${this.inputSource}-${height}-${format}-${startSegment}-${sha256(JSON.stringify(this.config))}-${videoStreamIndex} (Height: ${height}, Format: ${format}, StartSeg: ${startSegment}, VideoStream: ${videoStreamIndex})`);

    Transcoder.instances.set(session.id, this);

    const startTime = startSegment * this.config.segmentDuration;

    return new Promise<void>((resolve, reject) => {
      // Use typed IPC server for handling responses
      const cleanup = () => {
        ipcServer.offMessage('sessionStarted', handleSessionStarted);
        ipcServer.offMessage('sessionError', handleSessionError);
      };

      const handleSessionStarted = (data: IPCMessageRegistry['sessionStarted']) => {
        if (data.sessionId === session.id) {
          logger.debug(`[Transcoder] Session started confirmation received: ${session.id}`);
          cleanup();
          resolve();
        }
      };

      const handleSessionError = (data: IPCMessageRegistry['sessionError']) => {
        if (data.sessionId === session.id) {
          logger.error(`[Transcoder] Session start failed: ${session.id} - ${data.error}`);
          cleanup();
          this.sessionManager.removeSession(session.id);
          Transcoder.instances.delete(session.id);
          reject(new Error(data.error));
        }
      };

      ipcServer.onMessage('sessionStarted', handleSessionStarted);
      ipcServer.onMessage('sessionError', handleSessionError);

      logger.debug(`[Transcoder] Sending startSession message to worker for ${session.id}`);
      ipcClient.startSession({
        sessionId: session.id,
        file: this.inputSource,
        config: this.config,
        height,
        outputDir,
        format,
        startTime,
        startNumber: startSegment,
        videoStreamIndex,
      });
    });
  }

  onSessionStopped(sessionId: string) {
    logger.warn(`[Transcoder] Session ${sessionId} stopped unexpectedly.`);
    this.sessionManager.removeSession(sessionId);
    this.sessionCreationPromises.delete(sessionId); // Clean up creation promise if it exists
    Transcoder.instances.delete(sessionId);
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

  private async getOrStartSession(height: number, format: 'hls' | 'dash', segmentNumber: number, isInit: boolean): Promise<SessionData> {
    this.lastRequestTime = new Date();
    if (!this.isRunning) this.start();

    // Generate a user ID using SessionManager
    const userId = this.sessionManager.generateUserId();

    // Clean up expired users first
    this.sessionManager.cleanupExpiredUsers();

    // Find compatible sessions using SessionManager
    const compatibleSessions = this.sessionManager.findCompatibleSessions(
      height,
      format,
      segmentNumber,
      isInit,
    );

    // Check if we can reuse an existing session
    for (const session of compatibleSessions) {
      const segmentGap = session.getSegmentGap(segmentNumber);

      logger.debug(`[Transcoder] Session ${session.id}: startSeg=${session.startSegment}, maxSeg=${session.maxSegment}, requested=${segmentNumber}, gap=${segmentGap}`);

      if (segmentGap > 24) { // RESTART_THRESHOLD
        // Large gap - check if we can restart
        const restartDecision = this.sessionManager.evaluateSessionRestart(session, userId);

        if (restartDecision.allowed) {
          const restartPlan = this.sessionManager.planSessionRestart(session, segmentNumber);

          logger.info(`[Transcoder] Session ${session.id} restart: ${restartDecision.reason}`);

          // Start new session with headroom
          logger.debug(`[Transcoder] Creating new session with headroom (Height: ${height}, Format: ${format}, StartSeg: ${restartPlan.startSegment})`);
          await this.ensureSession(height, format, restartPlan.startSegment);

          // Mark old session for delayed cleanup
          this.sessionManager.markSessionForDelayedCleanup(session.id);

          // Return the new session
          const newSessions = this.sessionManager.findCompatibleSessions(height, format, restartPlan.startSegment, isInit);
          const newSession = newSessions[0];
          if (newSession) {
            this.sessionManager.addUserToSession(newSession.id, userId, restartPlan.startSegment);
            return newSession.getData();
          }
        } else {
          logger.info(`[Transcoder] Session ${session.id} restart blocked: ${restartDecision.reason}`);
          continue;
        }
      } else if (segmentGap > 12) { // LOOKAHEAD_THRESHOLD
        logger.debug(`[Transcoder] Session ${session.id} is too far behind (gap: ${segmentGap})`);
        continue;
      }

      // Found a suitable session
      logger.debug(`[Transcoder] Reusing session ${session.id} (Height: ${height}, Seg: ${segmentNumber}, Init: ${isInit})`);
      this.sessionManager.addUserToSession(session.id, userId, segmentNumber);
      return session.getData();
    }

    // No compatible session found - create a new one
    const startSegment = isInit ? 0 : segmentNumber;
    logger.debug(`[Transcoder] No compatible sessions found. Creating new session (Height: ${height}, Format: ${format}, StartSeg: ${startSegment})`);
    logger.debug(`[Transcoder] Found ${compatibleSessions.length} compatible sessions total`);

    await this.ensureSession(height, format, startSegment);

    // Return the newly created session
    const newSessions = this.sessionManager.findCompatibleSessions(height, format, startSegment, isInit);
    const newSession = newSessions[0];

    if (!newSession) {
      throw new Error(`Failed to create/retrieve session (Height: ${height}, Format: ${format}, StartSeg: ${startSegment})`);
    }

    this.sessionManager.addUserToSession(newSession.id, userId, startSegment);
    return newSession.getData();
  }

  async requestSegment(segmentNumber: number, height: number): Promise<string> {
    // Simple rate limiting to prevent spam
    const requestKey = `${height}-${segmentNumber}`;
    const now = Date.now();
    const lastRequest = this.segmentRequestCache.get(requestKey);

    if (lastRequest && (now - lastRequest) < 500) { // 500ms cooldown
      logger.debug(`[Transcoder] Rate limiting segment request: ${requestKey} (last: ${now - lastRequest}ms ago)`);
      // Wait briefly before proceeding
      await new Promise(resolve => setTimeout(resolve, 500 - (now - lastRequest)));
    }
    this.segmentRequestCache.set(requestKey, Date.now());

    const session = await this.getOrStartSession(height, 'hls', segmentNumber, false);

    const outputDir = getSessionDir(session.id);
    const isFmp4 = this.config.hlsSegmentType === 'fmp4';
    const filename = `${getSegmentPrefix(false, undefined)}${getVideoSegmentFilename(segmentNumber, isFmp4)}`;

    this.checkThrottling(session.id, outputDir, segmentNumber, 'hls');

    logger.debug(`[Transcoder] Waiting for file: ${filename} in ${outputDir}`);
    return this.waitForFile(session.id, outputDir, filename);
  }

  async requestHlsInit(height: number): Promise<string> {
    const session = await this.getOrStartSession(height, 'hls', 0, true);

    const outputDir = getSessionDir(session.id);
    const filename = getHlsInitFilename(false);

    logger.debug(`[Transcoder] Requesting HLS Init from session ${session.id} in ${outputDir}`);
    return this.waitForFile(session.id, outputDir, filename);
  }

  async requestDashChunk(segmentNumber: number, height: number, streamType: 'video' | 'audio'): Promise<string> {
    const session = await this.getOrStartSession(height, 'dash', segmentNumber, false);

    const outputDir = getSessionDir(session.id);
    const streamId = streamType === 'video' ? 0 : 1;
    const filename = getDashChunkFilename(streamId, segmentNumber);

    if (streamType === 'video') {
      this.checkThrottling(session.id, outputDir, segmentNumber, 'dash');
    }

    return this.waitForFile(session.id, outputDir, filename);
  }

  private checkThrottling(sessionId: string, _outputDir: string, segmentNumber: number, _format: 'hls' | 'dash') {
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

  async requestDashInit(height: number, streamType: 'video' | 'audio'): Promise<string> {
    const session = await this.getOrStartSession(height, 'dash', 0, true);

    const outputDir = getSessionDir(session.id);
    const streamId = streamType === 'video' ? 0 : 1;
    const filename = getDashInitFilename(streamId);

    logger.debug(`[Transcoder] Requesting DASH Init from session ${session.id}`);
    return this.waitForFile(session.id, outputDir, filename);
  }

  async requestHlsAudioSegment(segmentNumber: number, index: number): Promise<string> {
    const height = this.config.variants[0].height;
    const session = await this.getOrStartSession(height, 'hls', segmentNumber, false);

    const outputDir = getSessionDir(session.id);
    const isFmp4 = this.config.hlsSegmentType === 'fmp4';
    const filename = `${getSegmentPrefix(true, index)}${getAudioSegmentFilename(segmentNumber, isFmp4)}`;

    this.checkThrottling(session.id, outputDir, segmentNumber, 'hls');

    return this.waitForFile(session.id, outputDir, filename);
  }

  async requestHlsAudioInit(index: number): Promise<string> {
    const height = this.config.variants[0].height;
    const session = await this.getOrStartSession(height, 'hls', 0, true);

    const outputDir = getSessionDir(session.id);
    const filename = getHlsInitFilename(true, index);

    logger.debug(`[Transcoder] Requesting Audio Init from session ${session.id}`);
    return this.waitForFile(session.id, outputDir, filename);
  }

  private async waitForFile(sessionId: string, outputDir: string, filename: string): Promise<string> {
    const filePath = path.join(outputDir, filename);

    // 1. Check if file is marked available AND actually exists with content
    if (this.availableSegments.get(sessionId)?.has(filename)) {
      try {
        const stats = await fssync.promises.stat(filePath);
        if (stats.size > 0) {
          logger.debug(`[Transcoder] File ${filename} found in 'availableSegments' map and verified on disk.`);
          return filePath;
        } else {
          logger.debug(`[Transcoder] File ${filename} marked available but size is 0, waiting...`);
        }
      } catch (err) {
        logger.debug(`[Transcoder] File ${filename} marked available but not found on disk, waiting...`);
      }
    }

    // 2. Do NOT check disk synchronously here to avoid negative caching / stat storms.

    logger.debug(`[Transcoder] File ${filename} not found. Waiting...`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        logger.error(`[Transcoder] Timeout waiting for ${filename}`);
        reject(new Error(`File generation timeout: ${filename}`));
      }, 60000);

      // 3. Fallback polling (only if IPC fails/delayed)
      const checkInterval = setInterval(async () => {
        try {
          const stats = await fssync.promises.stat(filePath);
          if (stats.size > 0) {
            logger.debug(`[Transcoder] File ${filename} found via polling.`);
            cleanup();
            resolve(filePath);
          }
        } catch {
          // File not found yet, continue waiting
        }
      }, 500); // Increase interval to 500ms to further reduce load

      const onAvailable = async () => {
        logger.debug(`[Transcoder] File ${filename} reported available via event.`);

        // Verify size > 0 to avoid race conditions where file is created but not flushed
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
          } catch {
            // ignore
          }

          retries++;
          if (retries > 20) { // 1 second timeout for verification
            clearInterval(verifyInterval);
            logger.warn(`[Transcoder] File ${filename} verification timed out (size 0), returning anyway.`);
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

      // Use typed IPC server for handling responses
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

  // All session management logic is now handled by the session module
}

export const transcoders = new Map<string, Transcoder>();

export function getTranscoder(id: string, file: string, optionsOverride?: Partial<TranscodeOptions>) {
  let key = id;
  if (optionsOverride && Object.keys(optionsOverride).length > 0) {
    key = `${id}-${sha256(JSON.stringify(optionsOverride))}`;
  }

  if (!transcoders.has(key)) {
    const mergedConfig = {...transcodeOptions, ...optionsOverride};

    // Check if we've reached the maximum number of transcoders
    if (transcoders.size >= mergedConfig.maxTranscoders) {
      logger.warn(`[Transcoder] Maximum number of transcoders reached (${transcoders.size}/${mergedConfig.maxTranscoders}). Cannot create new transcoder for ${key}.`);
      throw new Error(`Maximum number of concurrent transcoders reached (${mergedConfig.maxTranscoders}). Please try again later.`);
    }

    const transcoder = new Transcoder(key, file, mergedConfig);
    transcoders.set(key, transcoder);
    transcoder.start();

    logger.info(`[Transcoder] Created new transcoder ${key} (${transcoders.size}/${mergedConfig.maxTranscoders} active)`);
  }
  return transcoders.get(key)!;
}

export let transcodeOptions: TranscodeOptions;

export function setTranscodeOptions(options: TranscodeOptions) {

  transcodeOptions = options;

}


// Set up IPC message handlers
Transcoder.setupMessageHandlers();
