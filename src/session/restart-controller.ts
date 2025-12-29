import { logger } from '../services/logger';

/**
 * Controls session restart decisions and lifecycle management
 * Handles multi-user aware restart logic and session transitions
 */
export class SessionRestartController {
  constructor(private config: {
    sessionProtectionPeriodMs: number;
    sessionAgeThresholdMs: number;
    recentActivityThresholdMs: number;
    maxUsersPerSession: number;
  }) {}

  canRestartSession(
    session: {
      restartBlockedUntil: number;
      userCount: number;
      createdAt: number;
      activeUsers: Map<string, any>;
    },
    requestingUserId: string,
    getMostActiveUser: () => string | null,
    hasRecentActivity: () => boolean
  ): { allowed: boolean; reason: string } {
    const now = Date.now();

    // Don't restart if session is protected
    if (now < session.restartBlockedUntil) {
      return {
        allowed: false,
        reason: `Session restart blocked until ${new Date(session.restartBlockedUntil).toISOString()}`
      };
    }

    // Don't restart if multiple users are actively using this session
    if (session.userCount >= this.config.maxUsersPerSession) {
      // Only allow restart if the requesting user is the primary user
      const primaryUser = getMostActiveUser();
      if (primaryUser && primaryUser !== requestingUserId) {
        return {
          allowed: false,
          reason: `Session has ${session.userCount} active users, restart blocked`
        };
      }
    }

    // Don't restart if the session was created recently
    const sessionAge = now - session.createdAt;
    if (sessionAge < this.config.sessionAgeThresholdMs) {
      return {
        allowed: false,
        reason: `Session is too young to restart (${Math.round(sessionAge / 1000)}s old)`
      };
    }

    // Don't restart if recent activity suggests users are watching
    if (hasRecentActivity()) {
      return {
        allowed: false,
        reason: 'Session has recent user activity, restart blocked'
      };
    }

    return { allowed: true, reason: 'Session restart allowed' };
  }

  calculateRestartDelay(session: { userCount: number }): {
    delayMs: number;
    reason: string;
  } {
    // Use different cleanup delays based on user count
    const delayMs = session.userCount > 1 ? 60000 : 30000; // 1 minute if other users, 30 seconds otherwise
    const reason = session.userCount > 1
      ? `${session.userCount} active users, using extended delay`
      : 'Single user, using standard delay';

    return { delayMs, reason };
  }

  shouldCreateNewSession(
    sessionGap: number,
    lookaheadThreshold: number,
    restartThreshold: number
  ): { action: 'reuse' | 'restart' | 'create-new'; reason: string } {
    if (sessionGap > restartThreshold) {
      return { action: 'restart', reason: `Large segment gap (${sessionGap} > ${restartThreshold})` };
    } else if (sessionGap > lookaheadThreshold) {
      return { action: 'create-new', reason: `Medium segment gap (${sessionGap} > ${lookaheadThreshold})` };
    } else {
      return { action: 'reuse', reason: `Small segment gap (${sessionGap} <= ${lookaheadThreshold})` };
    }
  }

  planSessionTransition(
    currentSession: { userCount: number },
    requestedSegment: number,
    restartHeadroom: number
  ): {
    startSegment: number;
    transitionStrategy: 'graceful' | 'immediate';
    oldSessionHandling: 'keep-temporary' | 'immediate-cleanup';
  } {
    const startSegment = Math.max(0, requestedSegment - restartHeadroom);
    const hasMultipleUsers = currentSession.userCount > 1;

    return {
      startSegment,
      transitionStrategy: hasMultipleUsers ? 'graceful' : 'immediate',
      oldSessionHandling: hasMultipleUsers ? 'keep-temporary' : 'immediate-cleanup',
    };
  }

  evaluateSessionHealth(session: {
    userCount: number;
    createdAt: number;
    lastUsed: number;
    maxSegment: number;
    startSegment: number;
  }): {
    health: 'healthy' | 'at-risk' | 'unhealthy';
    issues: string[];
    recommendations: string[];
  } {
    const now = Date.now();
    const age = now - session.createdAt;
    const idleTime = now - session.lastUsed;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check age
    if (age > 30 * 60 * 1000) { // 30 minutes
      issues.push('Session is very old');
      recommendations.push('Consider session restart for better performance');
    }

    // Check idle time
    if (idleTime > 10 * 60 * 1000) { // 10 minutes
      issues.push('Session has been idle for long time');
      recommendations.push('Session can be cleaned up');
    }

    // Check user count
    if (session.userCount === 0) {
      issues.push('No active users');
      recommendations.push('Safe to cleanup immediately');
    } else if (session.userCount > 3) {
      issues.push('High user load on single session');
      recommendations.push('Consider load balancing across sessions');
    }

    // Check segment progress
    const segmentProgress = session.maxSegment - session.startSegment;
    if (segmentProgress < 5) {
      issues.push('Low segment progress');
      recommendations.push('Monitor session health');
    }

    let health: 'healthy' | 'at-risk' | 'unhealthy';
    if (issues.length === 0) {
      health = 'healthy';
    } else if (issues.length <= 2) {
      health = 'at-risk';
    } else {
      health = 'unhealthy';
    }

    return { health, issues, recommendations };
  }
}