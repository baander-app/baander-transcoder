import { EventEmitter } from 'events';
import { ipcDebugLogger } from './logger';
import type { IPCMessage, IPCMessageRegistry, WorkerToTranscoderMessage } from './messages';

type MessageHandler<T extends keyof IPCMessageRegistry> = (data: IPCMessageRegistry[T]) => void;

/**
 * Typed IPC Server for handling incoming messages
 * Provides automatic typing and debug logging
 */
export class IPCServer extends EventEmitter {
  private process: NodeJS.Process;
  private handlers: Map<keyof IPCMessageRegistry, Set<MessageHandler<any>>> = new Map();

  constructor(process: NodeJS.Process) {
    super();
    this.process = process;
    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    this.process.on('message', (message: any) => {
      // Log received message for debugging
      if (message && typeof message === 'object' && message.type) {
        ipcDebugLogger.logReceived(message.type, message.data || message);

        // Handle typed messages
        this.handleTypedMessage(message);
      } else {
        // Legacy message handling
        this.handleLegacyMessage(message);
      }
    });
  }

  private handleTypedMessage(message: any): void {
    const messageType = message.type as keyof IPCMessageRegistry;
    const handlers = this.handlers.get(messageType);

    if (handlers && handlers.size > 0) {
      const messageData = message.data || message;

      // Call all registered handlers for this message type
      for (const handler of handlers) {
        try {
          handler(messageData);
        } catch (error) {
          console.error(`Error in IPC handler for ${messageType}:`, error);
        }
      }
    } else {
      // Emit as event for backwards compatibility
      this.emit(messageType, message);
    }
  }

  private handleLegacyMessage(message: any): void {
    // Emit legacy messages as events for backwards compatibility
    if (message && typeof message === 'object' && message.type) {
      this.emit(message.type, message);
    }
  }

  /**
   * Register a handler for a specific message type with full type safety
   */
  onMessage<T extends keyof IPCMessageRegistry>(
    messageType: T,
    handler: MessageHandler<T>
  ): void {
    if (!this.handlers.has(messageType)) {
      this.handlers.set(messageType, new Set());
    }

    this.handlers.get(messageType)!.add(handler);
  }

  /**
   * Remove a specific handler for a message type
   */
  offMessage<T extends keyof IPCMessageRegistry>(
    messageType: T,
    handler: MessageHandler<T>
  ): void {
    const handlers = this.handlers.get(messageType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(messageType);
      }
    }
  }

  /**
   * Remove all handlers for a message type
   */
  removeAllHandlers(messageType: keyof IPCMessageRegistry): void {
    this.handlers.delete(messageType);
  }

  /**
   * Send a message back to the parent process
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

    ipcDebugLogger.logSent(messageType, data);

    try {
      return this.process.send(message as any);
    } catch (error) {
      ipcDebugLogger.logSent(`${messageType}_ERROR`, { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Send a raw message (for compatibility with existing code)
   * @deprecated Use typed send() method instead
   */
  sendRaw(message: WorkerToTranscoderMessage): boolean {
    ipcDebugLogger.logSent(message.type, message);
    return this.process.send!(message as any);
  }

  /**
   * Get debug information about registered handlers
   */
  getDebugInfo(): { [messageType: string]: number } {
    const debugInfo: { [messageType: string]: number } = {};
    for (const [messageType, handlers] of this.handlers.entries()) {
      debugInfo[messageType] = handlers.size;
    }
    return debugInfo;
  }
}

// Default instance for the current process
export const ipcServer = new IPCServer(process);