import { logger } from '../services/logger';

export interface DebugLogEntry {
  timestamp: number;
  direction: 'sent' | 'received';
  messageType: string;
  data: any;
  processType?: string;
  workerId?: number;
}

class IPCDebugLogger {
  private isEnabled = false;
  private logBuffer: DebugLogEntry[] = [];
  private maxBufferSize = 1000;

  constructor() {
    // Check if debug logging is enabled via environment variable
    // this.isEnabled = process.env.NODE_ENV === 'development' || process.env.IPC_DEBUG === 'true';
  }

  enable(): void {
    this.isEnabled = true;
    logger.info('[IPC Debug] Debug logging enabled');
  }

  disable(): void {
    this.isEnabled = false;
    logger.info('[IPC Debug] Debug logging disabled');
  }

  logSent(messageType: string, data: any, workerId?: number): void {
    if (!this.isEnabled) return;

    const entry: DebugLogEntry = {
      timestamp: Date.now(),
      direction: 'sent',
      messageType,
      data: this.sanitizeData(data),
      processType: process.env.TYPE,
      workerId,
    };

    this.addToBuffer(entry);
    this.logToConsole(entry);
  }

  logReceived(messageType: string, data: any, workerId?: number): void {
    if (!this.isEnabled) return;

    const entry: DebugLogEntry = {
      timestamp: Date.now(),
      direction: 'received',
      messageType,
      data: this.sanitizeData(data),
      processType: process.env.TYPE,
      workerId,
    };

    this.addToBuffer(entry);
    this.logToConsole(entry);
  }

  private sanitizeData(data: any): any {
    // Remove potentially sensitive or very large data
    if (!data) return data;

    const sanitized = {...data};

    // Remove large config objects that can clutter logs
    if (sanitized.config) {
      sanitized.config = '[TranscodeOptions]';
    }

    // Truncate very long strings
    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key];
      if (typeof value === 'string' && value.length > 200) {
        sanitized[key] = value.substring(0, 200) + '...';
      }
    });

    return sanitized;
  }

  private addToBuffer(entry: DebugLogEntry): void {
    this.logBuffer.push(entry);

    // Keep buffer size under control
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
    }
  }

  private logToConsole(entry: DebugLogEntry): void {
    const direction = entry.direction === 'sent' ? '→' : '←';
    const workerInfo = entry.workerId ? ` (Worker ${entry.workerId})` : '';
    const processInfo = entry.processType ? ` [${entry.processType}]` : '';

    logger.debug(`[IPC Debug] ${processInfo}${workerInfo} ${direction} ${entry.messageType}`, {
      data: entry.data,
      timestamp: new Date(entry.timestamp).toISOString(),
    });
  }

  getRecentLogs(count: number = 100): DebugLogEntry[] {
    return this.logBuffer.slice(-count);
  }

  clearBuffer(): void {
    this.logBuffer = [];
  }
}

// Singleton instance
export const ipcDebugLogger = new IPCDebugLogger();