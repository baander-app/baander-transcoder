import { SessionConfig, SessionData, UserRequest } from './types';
import { sha256 } from '../utils/hash';

/**
 * Core Session class - represents a single transcoding session
 * Focused on data storage and basic state management
 */
export class Session {
  private readonly _data: SessionData;
  private readonly _config: SessionConfig;

  constructor(
    sessionId: string,
    height: number,
    format: string,
    startSegment: number,
    config: SessionConfig,
  ) {
    const now = Date.now();
    this._config = config;
    this._data = {
      id: sessionId,
      startSegment,
      height,
      format,
      lastUsed: now,
      isPaused: false,
      maxSegment: -1,
      lastRequestedSegments: new Map(),
      activeUsers: new Map(),
      userCount: 0,
      createdAt: now,
      restartBlockedUntil: now + config.sessionProtectionPeriod,
      clientData: new Map(),
    };
  }

  // Immutable getters
  get id(): string {
    return this._data.id;
  }

  get startSegment(): number {
    return this._data.startSegment;
  }

  get height(): number {
    return this._data.height;
  }

  get format(): string {
    return this._data.format;
  }

  get maxSegment(): number {
    return this._data.maxSegment;
  }

  get userCount(): number {
    return this._data.userCount;
  }

  get createdAt(): number {
    return this._data.createdAt;
  }

  get restartBlockedUntil(): number {
    return this._data.restartBlockedUntil;
  }

  get config(): SessionConfig {
    return {...this._config};
  }

  // Accessible getters for controlled modification
  get lastUsed(): number {
    return this._data.lastUsed;
  }

  get isPaused(): boolean {
    return this._data.isPaused;
  }

  get activeUsers(): ReadonlyMap<string, UserRequest> {
    return this._data.activeUsers;
  }

  // Internal access for managers (mutable)
  getMutableActiveUsers(): Map<string, UserRequest> {
    return this._data.activeUsers;
  }

  get lastRequestedSegments(): ReadonlyMap<number, number> {
    return this._data.lastRequestedSegments;
  }

  get clientData(): ReadonlyMap<string, any> | undefined {
    return this._data.clientData;
  }

  // Get snapshot of session data (immutable)
  getData(): SessionData {
    return {...this._data};
  }

  // Alias for compatibility with transcoder
  toSessionData(): SessionData {
    return this.getData();
  }

  // Direct state modification methods (should be used by managers)
  updateLastUsed(timestamp?: number): void {
    this._data.lastUsed = timestamp || Date.now();
  }

  setPaused(paused: boolean): void {
    this._data.isPaused = paused;
  }

  updateMaxSegment(segment: number): void {
    if (segment > this._data.maxSegment) {
      this._data.maxSegment = segment;
    }
  }

  updateSegmentAvailable(segmentFilename: string): void {
    // Update max segment based on available segment
    const match = segmentFilename.match(/(?:video_|audio_\d+_|chunk-\d+-)(\d+)\./);
    if (match) {
      const segNum = parseInt(match[1], 10);
      this.updateMaxSegment(segNum);
    }
  }

  // Alias for transcoder compatibility
  onSegmentAvailable(segmentFilename: string): void {
    this.updateSegmentAvailable(segmentFilename);
  }

  // Client data management
  setClientData(key: string, value: any): void {
    this._data.clientData!.set(key, value);
  }

  getClientData(key: string): any {
    return this._data.clientData?.get(key);
  }

  // Utility methods (read-only calculations)
  getSegmentGap(requestedSegment: number): number {
    const effectiveMax = Math.max(this._data.startSegment, this._data.maxSegment);
    // Return positive if session is ahead of requested segment, negative if behind
    return effectiveMax - requestedSegment;
  }

  canServeSegment(segmentNumber: number): boolean {
    // For newly created sessions where maxSegment is -1, allow serving segments
    // that are equal to or greater than startSegment, but be more lenient for quality switching
    if (this._data.maxSegment === -1) {
      // Allow some tolerance for quality switching - accept segments slightly before startSegment
      const tolerance = 3; // Accept segments up to 3 segments before startSegment
      return segmentNumber >= (this._data.startSegment - tolerance);
    }

    // For established sessions, only serve segments within the processed range
    // This ensures that sessions that have processed segments starting from a certain point
    // only serve segments they actually have available
    const minAvailableSegment = Math.max(this._data.startSegment, 0);
    const maxAvailableSegment = this._data.maxSegment;

    return minAvailableSegment <= segmentNumber && segmentNumber <= maxAvailableSegment;
  }

  isIdle(idleTimeoutMinutes: number): boolean {
    const now = Date.now();
    const timeout = idleTimeoutMinutes * 60 * 1000;
    return (now - this._data.lastUsed) > timeout;
  }

  isExpiredForAggressiveCleanup(aggressiveTimeoutMs: number): boolean {
    const now = Date.now();
    return (now - this._data.lastUsed) > aggressiveTimeoutMs;
  }

  // Static factory method for creating sessions from hash
  static createFromInput(
    inputSource: string,
    height: number,
    format: string,
    startSegment: number,
    config: SessionConfig,
    configHash: string,
    videoStreamIndex: number = 0,
  ): Session {
    const hashInput = `${inputSource}-${height}-${format}-${startSegment}-${configHash}-${videoStreamIndex}`;
    const sessionId = sha256(hashInput);
    return new Session(sessionId, height, format, startSegment, config);
  }
}