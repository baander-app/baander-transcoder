/**
 * Manages session lifecycle operations including cleanup, expiration, and health monitoring
 * Focused on session housekeeping and resource management
 */
export class SessionLifecycleManager {
  constructor(private config: {
    idleTimeoutMinutes: number;
    aggressiveCleanupTimeoutMs: number;
    cleanupDelaySingleUserMs: number;
    cleanupDelayMultipleUsersMs: number;
  }) {
  }

  shouldCleanupSession(
    session: {
      lastUsed: number;
      userCount: number;
    },
    currentTime: number = Date.now(),
  ): {
    shouldCleanup: boolean;
    cleanupType: 'regular' | 'aggressive';
    reason: string;
    timeUntilCleanup: number;
  } {
    const timeSinceLastUsed = currentTime - session.lastUsed;

    // Check aggressive cleanup first (priority)
    if (timeSinceLastUsed > this.config.aggressiveCleanupTimeoutMs) {
      return {
        shouldCleanup: true,
        cleanupType: 'aggressive',
        reason: `Idle for ${Math.round(timeSinceLastUsed / 1000)}s (exceeds ${Math.round(this.config.aggressiveCleanupTimeoutMs / 1000)}s)`,
        timeUntilCleanup: 0,
      };
    }

    // Check regular cleanup
    const regularTimeoutMs = this.config.idleTimeoutMinutes * 60 * 1000;
    if (timeSinceLastUsed > regularTimeoutMs) {
      return {
        shouldCleanup: true,
        cleanupType: 'regular',
        reason: `Idle for ${Math.round(timeSinceLastUsed / 1000)}s (exceeds ${this.config.idleTimeoutMinutes}min)`,
        timeUntilCleanup: 0,
      };
    }

    return {
      shouldCleanup: false,
      cleanupType: 'regular',
      reason: 'Session is still active',
      timeUntilCleanup: regularTimeoutMs - timeSinceLastUsed,
    };
  }

  markSessionForDelayedCleanup(
    session: {
      userCount: number;
    },
    markLastUsedCallback: (newLastUsed: number) => void,
  ): {
    delayMs: number;
    newLastUsed: number;
    reason: string;
  } {
    const delayMs = session.userCount > 1
      ? this.config.cleanupDelayMultipleUsersMs
      : this.config.cleanupDelaySingleUserMs;

    const newLastUsed = Date.now() - (this.config.idleTimeoutMinutes * 60 * 1000) + delayMs;
    markLastUsedCallback(newLastUsed);

    return {
      delayMs,
      newLastUsed,
      reason: `${session.userCount} active users, using ${Math.round(delayMs / 1000)}s delay`,
    };
  }

  generateSessionReport(sessions: Array<{
    id: string;
    userCount: number;
    createdAt: number;
    lastUsed: number;
    maxSegment: number;
    startSegment: number;
    height: number;
    format: string;
  }>): {
    summary: {
      totalSessions: number;
      totalUsers: number;
      activeSessions: number;
      idleSessions: number;
      oldestSessionAge: number;
      averageSegmentProgress: number;
    };
    details: Array<{
      sessionId: string;
      health: 'healthy' | 'at-risk' | 'unhealthy';
      age: number;
      idleTime: number;
      userCount: number;
      segmentProgress: number;
      timeUntilCleanup: number;
    }>;
  } {
    const now = Date.now();
    let totalUsers = 0;
    let activeSessions = 0;
    let idleSessions = 0;
    let oldestSessionAge = 0;
    let totalSegmentProgress = 0;

    const details = sessions.map(session => {
      const age = now - session.createdAt;
      const idleTime = now - session.lastUsed;
      const segmentProgress = session.maxSegment - session.startSegment;
      const cleanupDecision = this.shouldCleanupSession(session, now);

      totalUsers += session.userCount;
      if (idleTime < 5 * 60 * 1000) activeSessions++; // Active if used within 5 minutes
      else idleSessions++;
      if (age > oldestSessionAge) oldestSessionAge = age;
      totalSegmentProgress += segmentProgress;

      // Determine health
      let health: 'healthy' | 'at-risk' | 'unhealthy';
      if (cleanupDecision.shouldCleanup) {
        health = 'unhealthy';
      } else if (idleTime > 10 * 60 * 1000) {
        health = 'at-risk';
      } else {
        health = 'healthy';
      }

      return {
        sessionId: session.id,
        health,
        age,
        idleTime,
        userCount: session.userCount,
        segmentProgress,
        timeUntilCleanup: cleanupDecision.timeUntilCleanup,
      };
    });

    return {
      summary: {
        totalSessions: sessions.length,
        totalUsers,
        activeSessions,
        idleSessions,
        oldestSessionAge,
        averageSegmentProgress: sessions.length > 0 ? totalSegmentProgress / sessions.length : 0,
      },
      details,
    };
  }

  cleanupStaleSessions(
    sessions: Map<string, any>,
    cleanupCallback: (sessionId: string, reason: string) => void,
  ): {
    cleanedCount: number;
    skippedCount: number;
    details: Array<{ sessionId: string; reason: string; type: 'regular' | 'aggressive' }>;
  } {
    const now = Date.now();
    let cleanedCount = 0;
    let skippedCount = 0;
    const details: Array<{ sessionId: string; reason: string; type: 'regular' | 'aggressive' }> = [];

    for (const [sessionId, session] of sessions.entries()) {
      const decision = this.shouldCleanupSession(session, now);

      if (decision.shouldCleanup) {
        cleanupCallback(sessionId, decision.reason);
        cleanedCount++;
        details.push({
          sessionId,
          reason: decision.reason,
          type: decision.cleanupType,
        });
      } else {
        skippedCount++;
      }
    }

    return {cleanedCount, skippedCount, details};
  }

  estimateResourceUsage(sessions: Array<{
    userCount: number;
    maxSegment: number;
    height: number;
    format: string;
  }>): {
    estimatedMemoryUsage: number; // MB
    estimatedActiveConnections: number;
    qualityBreakdown: Map<string, number>;
    formatBreakdown: Map<string, number>;
  } {
    let totalUsers = 0;
    const qualityBreakdown = new Map<string, number>();
    const formatBreakdown = new Map<string, number>();

    sessions.forEach(session => {
      totalUsers += session.userCount;

      // Quality breakdown
      const quality = `${session.height}p`;
      qualityBreakdown.set(quality, (qualityBreakdown.get(quality) || 0) + 1);

      // Format breakdown
      formatBreakdown.set(session.format, (formatBreakdown.get(session.format) || 0) + 1);
    });

    // Rough memory estimation (very approximate)
    const estimatedMemoryUsage = sessions.length * 10 + totalUsers * 2; // Base memory + per-user overhead

    return {
      estimatedMemoryUsage,
      estimatedActiveConnections: totalUsers,
      qualityBreakdown,
      formatBreakdown,
    };
  }
}