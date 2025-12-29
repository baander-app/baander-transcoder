import { randomUUID } from 'crypto';
import { UserRequest, ClientInfo } from './types';

/**
 * Manages user activity within sessions
 * Handles user tracking, activity cleanup, and analytics
 */
export class SessionUserManager {
  generateUniqueUserId(): string {
    const id = randomUUID();
    return `user_${id}`;
  }

  trackUserRequest(
    session: { activeUsers: Map<string, UserRequest> },
    userId: string,
    segmentNumber: number,
    clientInfo?: ClientInfo
  ): void {
    const now = Date.now();

    // Update or create user request record
    const existingRequest = session.activeUsers.get(userId);
    if (existingRequest) {
      existingRequest.segment = segmentNumber;
      existingRequest.timestamp = now;
      existingRequest.requestCount++;
      if (clientInfo) {
        existingRequest.clientInfo = { ...existingRequest.clientInfo, ...clientInfo };
      }
    } else {
      session.activeUsers.set(userId, {
        userId,
        segment: segmentNumber,
        timestamp: now,
        requestCount: 1,
        clientInfo,
      });
    }
  }

  removeExpiredUsers(
    session: { activeUsers: Map<string, UserRequest> },
    activityWindowMs: number
  ): number {
    const now = Date.now();
    const cutoffTime = now - activityWindowMs;
    let removedCount = 0;

    for (const [userId, request] of session.activeUsers.entries()) {
      if (request.timestamp < cutoffTime) {
        session.activeUsers.delete(userId);
        removedCount++;
      }
    }

    return removedCount;
  }

  getMostActiveUser(session: { activeUsers: Map<string, UserRequest> }): UserRequest | null {
    if (session.activeUsers.size === 0) return null;

    let mostActive: UserRequest | null = null;
    for (const request of session.activeUsers.values()) {
      if (!mostActive || request.timestamp > mostActive.timestamp) {
        mostActive = request;
      }
    }

    return mostActive;
  }

  hasRecentActivity(
    session: { activeUsers: Map<string, UserRequest> },
    recentThresholdMs: number
  ): boolean {
    const now = Date.now();
    const cutoffTime = now - recentThresholdMs;

    // Check if any user has made a request recently
    for (const request of session.activeUsers.values()) {
      if (request.timestamp > cutoffTime) {
        return true;
      }
    }

    return false;
  }

  getUserAnalytics(session: { activeUsers: Map<string, UserRequest> }): {
    totalUsers: number;
    activeUsers: number;
    totalRequests: number;
    avgRequestsPerUser: number;
    primaryUser: UserRequest | null;
  } {
    const now = Date.now();
    const recentThreshold = 2 * 60 * 1000; // 2 minutes
    const cutoffTime = now - recentThreshold;

    let totalRequests = 0;
    let activeUserCount = 0;

    for (const request of session.activeUsers.values()) {
      totalRequests += request.requestCount;
      if (request.timestamp > cutoffTime) {
        activeUserCount++;
      }
    }

    return {
      totalUsers: session.activeUsers.size,
      activeUsers: activeUserCount,
      totalRequests,
      avgRequestsPerUser: session.activeUsers.size > 0 ? totalRequests / session.activeUsers.size : 0,
      primaryUser: this.getMostActiveUser(session),
    };
  }

  getClientBreakdown(session: { activeUsers: Map<string, UserRequest> }): {
    userAgents: Map<string, number>;
    bitrates: Map<number, number>;
    players: Map<string, number>;
    locations: Map<string, number>;
  } {
    const userAgents = new Map<string, number>();
    const bitrates = new Map<number, number>();
    const players = new Map<string, number>();
    const locations = new Map<string, number>();

    for (const request of session.activeUsers.values()) {
      if (request.clientInfo) {
        const { userAgent, bitrate, player, location } = request.clientInfo;

        if (userAgent) {
          userAgents.set(userAgent, (userAgents.get(userAgent) || 0) + 1);
        }

        if (bitrate) {
          const bitrateRange = Math.floor(bitrate / 1000) * 1000; // Group by 1000s
          bitrates.set(bitrateRange, (bitrates.get(bitrateRange) || 0) + 1);
        }

        if (player) {
          players.set(player, (players.get(player) || 0) + 1);
        }

        if (location) {
          locations.set(location, (locations.get(location) || 0) + 1);
        }
      }
    }

    return {
      userAgents,
      bitrates,
      players,
      locations,
    };
  }
}