import { ipcDebugLogger } from './logger';
import type { IPCMessage, IPCMessageRegistry, TranscoderToWorkerMessage, WorkerToTranscoderMessage } from './messages';

/**
 * Typed IPC Client for sending messages to workers
 * Provides automatic typing and debug logging
 */
export class IPCClient {
  private process: NodeJS.Process;

  constructor(process: NodeJS.Process) {
    this.process = process;
  }

  /**
   * Send a typed message to the process
   * Automatically logs for debugging if enabled
   */
  send<T extends keyof IPCMessageRegistry>(
    messageType: T,
    data: IPCMessageRegistry[T]
  ): boolean {
    if (!this.process.send) {
      throw new Error('Process does not support sending messages');
    }

    const message: IPCMessage<T> = {
      type: messageType,
      data,
    };

    // Log the message for debugging
    ipcDebugLogger.logSent(messageType, data);

    try {
      return this.process.send(message as any);
    } catch (error) {
      ipcDebugLogger.logSent(`${messageType}_ERROR`, { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Convenience method for starting a transcoding session
   */
  startSession(params: IPCMessageRegistry['startSession']): boolean {
    return this.send('startSession', params);
  }

  /**
   * Convenience method for stopping a transcoding session
   */
  stopSession(params: IPCMessageRegistry['stopSession']): boolean {
    return this.send('stopSession', params);
  }

  /**
   * Convenience method for pausing a transcoding session
   */
  pauseSession(params: IPCMessageRegistry['pauseSession']): boolean {
    return this.send('pauseSession', params);
  }

  /**
   * Convenience method for resuming a transcoding session
   */
  resumeSession(params: IPCMessageRegistry['resumeSession']): boolean {
    return this.send('resumeSession', params);
  }

  /**
   * Convenience method for extracting an I-frame
   */
  extractIFrame(params: IPCMessageRegistry['extractIFrame']): boolean {
    return this.send('extractIFrame', params);
  }

  /**
   * Send a raw message (for compatibility with existing code)
   * @deprecated Use typed send() method instead
   */
  sendRaw(message: TranscoderToWorkerMessage): boolean {
    ipcDebugLogger.logSent(message.type, message);
    return this.process.send!(message as any);
  }
}

// Default instance for the current process
export const ipcClient = new IPCClient(process);