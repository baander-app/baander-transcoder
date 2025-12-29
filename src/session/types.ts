export interface UserRequest {
  userId: string;
  segment: number;
  timestamp: number;
  requestCount: number;
  clientInfo?: ClientInfo;
}

export interface ClientInfo {
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
  bitrate?: number;
  player?: string;
  [key: string]: any; // Allow for future expansion
}

export interface SessionData {
  id: string;
  startSegment: number;
  height: number;
  format: string;
  lastUsed: number;
  isPaused: boolean;
  maxSegment: number;
  lastRequestedSegments: Map<number, number>; // segment -> timestamp
  activeUsers: Map<string, UserRequest>; // userId -> latest request info
  userCount: number; // Number of active users in last 2 minutes
  createdAt: number; // When session was created
  restartBlockedUntil: number; // Timestamp until which this session cannot be restarted
  clientData?: Map<string, any>; // Additional client-specific data
}

export interface SessionConfig {
  segmentDuration: number;
  idleTimeout: number; // minutes
  userActivityWindow: number; // milliseconds
  sessionProtectionPeriod: number; // milliseconds
  recentActivityThreshold: number; // milliseconds
  sessionAgeThreshold: number; // milliseconds
  maxUsersPerSession: number;
  cleanupDelaySingleUser: number; // milliseconds
  cleanupDelayMultipleUsers: number; // milliseconds
}