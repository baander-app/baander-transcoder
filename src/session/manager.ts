import { logger } from '../services/logger';
import { Session } from './session';
import { SessionUserManager } from './user-manager';
import { SessionRestartController } from './restart-controller';
import { SessionLifecycleManager } from './lifecycle-manager';
import { ClientInfo, SessionConfig } from './types';

/**
 * Main SessionManager - orchestrates all session operations
 * Provides a clear, high-level API for session management
 */
export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private userManager: SessionUserManager;
  private restartController: SessionRestartController;
  private lifecycleManager: SessionLifecycleManager;

  constructor(config: SessionConfig) {
    this.userManager = new SessionUserManager();
    this.restartController = new SessionRestartController({
      sessionProtectionPeriodMs: config.sessionProtectionPeriod,
      sessionAgeThresholdMs: config.sessionAgeThreshold,
      recentActivityThresholdMs: config.recentActivityThreshold,
      maxUsersPerSession: config.maxUsersPerSession,
    });
    this.lifecycleManager = new SessionLifecycleManager({
      idleTimeoutMinutes: config.idleTimeout,
      aggressiveCleanupTimeoutMs: 5 * 60 * 1000, // 5 minutes
      cleanupDelaySingleUserMs: config.cleanupDelaySingleUser,
      cleanupDelayMultipleUsersMs: config.cleanupDelayMultipleUsers,
    });
  }

  createSession(
    variantId: string,
    format: string,
    startSegment: number,
    inputSource: string,
    configHash: string,
    videoStreamIndex: number = 0,
  ): Session {
    // Check if session already exists
    const existingSession = Session.createFromInput(
      inputSource,
      variantId,
      format,
      startSegment,
      this.getConfig(),
      configHash,
      videoStreamIndex,
    );

    if (this.sessions.has(existingSession.id)) {
      logger.debug(`[SessionManager] Session already exists: ${existingSession.id}`);
      return this.sessions.get(existingSession.id)!;
    }

    this.sessions.set(existingSession.id, existingSession);

    logger.info(`[SessionManager] Created new session: ${existingSession.id}`);
    logger.debug(`[SessionManager] Session: variantId=${variantId}, format=${format}, startSegment=${startSegment}`);

    return existingSession;
  }

  findSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  // Alias for compatibility with transcoder
  getSession(sessionId: string): Session | undefined {
    return this.findSession(sessionId);
  }

  // Get sessions that need cleanup
  getSessionsNeedingCleanup(): Session[] {
    const sessionsNeedingCleanup: Session[] = [];
    for (const session of this.sessions.values()) {
      const decision = this.lifecycleManager.shouldCleanupSession(session);
      if (decision.shouldCleanup) {
        sessionsNeedingCleanup.push(session);
      }
    }
    return sessionsNeedingCleanup;
  }

  findCompatibleSessions(
    variantId: string,
    format: string,
    segmentNumber: number,
    includeInitOnly: boolean = false,
  ): Session[] {
    const compatibleSessions: Session[] = [];

    for (const session of this.sessions.values()) {
      if (session.variantId === variantId && session.format === format) {
        if (includeInitOnly) {
          compatibleSessions.push(session);
        } else if (session.canServeSegment(segmentNumber)) {
          compatibleSessions.push(session);
        }
      }
    }

    // Sort sessions by startSegment (newer sessions first) for segment requests
    if (!includeInitOnly) {
      compatibleSessions.sort((a, b) => b.startSegment - a.startSegment);
    } else {
      // For init requests, prefer earlier sessions
      compatibleSessions.sort((a, b) => a.startSegment - b.startSegment);
    }

    return compatibleSessions;
  }

  generateUserId(): string {
    return this.userManager.generateUniqueUserId();
  }

  addUserToSession(
    sessionId: string,
    userId: string,
    segmentNumber: number,
    clientInfo?: ClientInfo,
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn(`[SessionManager] Attempted to add user to non-existent session: ${sessionId}`);
      return false;
    }

    // Pass session object with mutable activeUsers map for userManager
    const sessionForUserManager = {
      activeUsers: session.getMutableActiveUsers()
    };
    this.userManager.trackUserRequest(sessionForUserManager, userId, segmentNumber, clientInfo);
    session.updateLastUsed();

    logger.debug(`[SessionManager] User ${userId} tracked for session ${sessionId} at segment ${segmentNumber}`);
    return true;
  }

  cleanupExpiredUsers(): void {
    let totalCleaned = 0;
    const config = this.getConfig();

    for (const session of this.sessions.values()) {
      // Pass session object with mutable activeUsers map for userManager
      const sessionForUserManager = {
        activeUsers: session.getMutableActiveUsers()
      };
      const cleanedCount = this.userManager.removeExpiredUsers(
        sessionForUserManager,
        config.userActivityWindow,
      );
      totalCleaned += cleanedCount;
    }

    if (totalCleaned > 0) {
      logger.debug(`[SessionManager] Cleaned up ${totalCleaned} expired users`);
    }
  }

  // === SESSION RESTART & TRANSITIONS ===

  evaluateSessionRestart(
    session: Session,
    requestingUserId: string,
  ): { allowed: boolean; reason: string } {
    const sessionForUserManager = {
      activeUsers: session.getMutableActiveUsers()
    };

    const decision = this.restartController.canRestartSession(
      {
        restartBlockedUntil: session.restartBlockedUntil,
        userCount: session.userCount,
        createdAt: session.createdAt,
        activeUsers: session.getMutableActiveUsers(),
      },
      requestingUserId,
      () => {
        const mostActiveUser = this.userManager.getMostActiveUser(sessionForUserManager);
        return mostActiveUser?.userId || null;
      },
      () => this.userManager.hasRecentActivity(sessionForUserManager, this.getConfig().recentActivityThreshold),
    );

    return decision;
  }

  planSessionRestart(
    session: Session,
    requestingSegment: number,
  ): {
    shouldRestart: boolean;
    startSegment: number;
    transitionStrategy: string;
    oldSessionHandling: string;
  } {
    const segmentGap = session.getSegmentGap(requestingSegment);
    const {action, reason} = this.restartController.shouldCreateNewSession(
      segmentGap,
      12, // LOOKAHEAD_THRESHOLD
      24,  // RESTART_THRESHOLD
    );

    if (action === 'restart') {
      const plan = this.restartController.planSessionTransition(
        {
          userCount: session.userCount,
        },
        requestingSegment,
        3, // RESTART_HEADROOM
      );

      logger.info(`[SessionManager] Session restart planned: ${reason}`);

      return {
        shouldRestart: true,
        startSegment: plan.startSegment,
        transitionStrategy: plan.transitionStrategy,
        oldSessionHandling: plan.oldSessionHandling,
      };
    }

    return {
      shouldRestart: false,
      startSegment: requestingSegment,
      transitionStrategy: 'none',
      oldSessionHandling: 'none',
    };
  }

  markSessionForDelayedCleanup(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn(`[SessionManager] Attempted to mark non-existent session for cleanup: ${sessionId}`);
      return 0;
    }

    const {delayMs, reason} = this.lifecycleManager.markSessionForDelayedCleanup(
      session,
      (newLastUsed) => session.updateLastUsed(newLastUsed),
    );

    logger.debug(`[SessionManager] Session ${sessionId} marked for delayed cleanup: ${reason}`);
    return delayMs;
  }

  // === SESSION LIFECYCLE ===

  removeSession(sessionId: string): boolean {
    const removed = this.sessions.delete(sessionId);
    if (removed) {
      logger.debug(`[SessionManager] Removed session: ${sessionId}`);
    }
    return removed;
  }

  cleanupStaleSessions(): {
    cleanedCount: number;
    skippedCount: number;
    details: Array<{ sessionId: string; reason: string }>;
  } {
    let cleanedCount = 0;
    let skippedCount = 0;
    const details: Array<{ sessionId: string; reason: string }> = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const decision = this.lifecycleManager.shouldCleanupSession(session);

      if (decision.shouldCleanup) {
        this.removeSession(sessionId);
        cleanedCount++;
        details.push({sessionId, reason: decision.reason});
      } else {
        skippedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`[SessionManager] Cleaned up ${cleanedCount} stale sessions`);
    }

    return {cleanedCount, skippedCount, details};
  }

  // === SESSION MONITORING ===

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  getSessionReport(): {
    summary: any;
    details: any;
  } {
    const sessionData = Array.from(this.sessions.values()).map(session => ({
      id: session.id,
      userCount: session.userCount,
      createdAt: session.createdAt,
      lastUsed: session.lastUsed,
      maxSegment: session.maxSegment,
      startSegment: session.startSegment,
      variantId: session.variantId,
      height: session.height, // Keep for backward compatibility
      format: session.format,
    }));

    return this.lifecycleManager.generateSessionReport(sessionData);
  }

  getUserAnalytics(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Pass session object with mutable activeUsers map for userManager
    const sessionForUserManager = {
      activeUsers: session.getMutableActiveUsers()
    };

    return {
      analytics: this.userManager.getUserAnalytics(sessionForUserManager),
      breakdown: this.userManager.getClientBreakdown(sessionForUserManager),
    };
  }

  // === CONFIGURATION ===

  updateConfig(configUpdates: Partial<SessionConfig>): void {
    // Note: In a real implementation, you'd want to update the internal configs
    // This is a simplified version
    logger.info(`[SessionManager] Config updated: ${JSON.stringify(configUpdates)}`);
  }

  getConfig(): SessionConfig {
    // Return a default config for now - in practice, this would be stored
    return {
      segmentDuration: 6,
      idleTimeout: 10,
      userActivityWindow: 2 * 60 * 1000,
      sessionProtectionPeriod: 2 * 60 * 1000,
      recentActivityThreshold: 30 * 1000,
      sessionAgeThreshold: 5 * 60 * 1000,
      maxUsersPerSession: 2,
      cleanupDelaySingleUser: 30 * 1000,
      cleanupDelayMultipleUsers: 60 * 1000,
    };
  }
}