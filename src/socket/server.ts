/**
 * Unix Socket Server
 *
 * Handles concurrent requests per connection with proper async/await.
 * Supports request pipelining and backpressure control.
 */

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import type * as express from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { encodeMessage, MessageStreamParser } from './codec';
import {
  SocketMessageType,
  SocketErrorCode,
  type SocketMessage,
  type SocketHttpRequest,
  type SocketHttpResponse,
  getRequestId,
} from './protocol';
import { logger } from '../services/logger';

/**
 * Socket connection handler options
 */
export interface SocketServerOptions {
  /**
   * Path to the Unix socket file
   */
  socketPath: string;

  /**
   * Express application to handle requests
   */
  app: express.Application;

  /**
   * Maximum message size in bytes (default: 100MB)
   */
  maxMessageSize?: number;

  /**
   * Connection timeout in milliseconds (default: 30000)
   */
  connectionTimeout?: number;

  /**
   * Whether to remove socket file on startup (default: true)
   */
  removeExistingSocket?: boolean;

  /**
   * Maximum concurrent requests per connection (default: 10)
   * Controls backpressure and resource usage
   */
  maxConcurrentRequests?: number;

  /**
   * Request queue size per connection (default: 100)
   */
  maxQueueSize?: number;
}

/**
 * Pending request state
 */
interface PendingRequest {
  message: SocketHttpRequest;
  resolve: (response: SocketHttpResponse) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * Async connection state
 */
interface ConnectionState {
  socket: net.Socket;
  parser: MessageStreamParser;
  requestId: string;
  lastActivity: number;

  // Request processing
  pendingRequests: Map<number, PendingRequest>;
  requestCounter: number;
  activeRequests: number;
  queuedRequests: number;

  // Concurrency control
  semaphore: Semaphore;
}

/**
 * Simple semaphore for concurrency control
 */
class Semaphore {
  private waitQueue: Array<() => void> = [];
  private count: number;

  constructor(count: number) {
    this.count = count;
  }

  async acquire(): Promise<void> {
    if (this.count > 0) {
      this.count--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      resolve();
    } else {
      this.count++;
    }
  }

  get available(): number {
    return this.count;
  }
}

/**
 * Async Unix socket server with concurrent request handling
 */
export class SocketServer extends EventEmitter {
  private server: net.Server | null = null;
  private connections = new Map<net.Socket, ConnectionState>();
  private connectionTimeoutTimer: NodeJS.Timeout | null = null;

  constructor(private options: SocketServerOptions) {
    super();
  }

  /**
   * Start the socket server
   */
  async start(): Promise<void> {
    const { socketPath, removeExistingSocket = true } = this.options;

    // Remove existing socket file if present
    if (removeExistingSocket && fs.existsSync(socketPath)) {
      logger.info(`[SocketServer] Removing existing socket file: ${socketPath}`);
      fs.unlinkSync(socketPath);
    }

    // Ensure directory exists
    const dir = path.dirname(socketPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleConnection(socket);
      });

      this.server.on('error', (err) => {
        logger.error(`[SocketServer] Server error: ${err.message}`);
        this.emit('error', err);
        reject(err);
      });

      this.server.listen(socketPath, () => {
        logger.info(`[SocketServer] Listening on socket: ${socketPath}`);
        this.startConnectionTimeoutCheck();
        resolve();
      });

      this.server.on('close', () => {
        logger.info('[SocketServer] Server closed');
        this.stopConnectionTimeoutCheck();
      });
    });
  }

  /**
   * Stop the socket server
   */
  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    // Close all connections gracefully
    const closePromises: Promise<void>[] = [];
    for (const [socket, state] of this.connections) {
      closePromises.push(this.closeConnectionGracefully(socket, state));
    }

    await Promise.allSettled(closePromises);
    this.connections.clear();

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.server = null;
        resolve();
      });
    });
  }

  /**
   * Close a connection gracefully
   */
  private async closeConnectionGracefully(
    socket: net.Socket,
    state: ConnectionState
  ): Promise<void> {
    // Wait for active requests to complete (with timeout)
    const timeout = 5000; // 5 seconds
    const startTime = Date.now();

    while (state.activeRequests > 0 && Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (state.activeRequests > 0) {
      logger.warn(
        `[SocketServer] Closing connection with ${state.activeRequests} active requests: ${state.requestId}`
      );
    }

    socket.destroy();
  }

  /**
   * Handle a new connection
   */
  private handleConnection(socket: net.Socket): void {
    const requestId = `conn-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const parser = new MessageStreamParser();
    const maxConcurrent = this.options.maxConcurrentRequests ?? 10;
    const maxQueue = this.options.maxQueueSize ?? 100;

    logger.debug(`[SocketServer] New connection: ${requestId}`);

    const state: ConnectionState = {
      socket,
      parser,
      requestId,
      lastActivity: Date.now(),
      pendingRequests: new Map(),
      requestCounter: 0,
      activeRequests: 0,
      queuedRequests: 0,
      semaphore: new Semaphore(maxConcurrent),
    };

    this.connections.set(socket, state);
    this.emit('connection', socket);

    socket.on('data', (data) => {
      state.lastActivity = Date.now();
      this.handleData(socket, state, data).catch((err) => {
        logger.error(`[SocketServer] Data handling error (${requestId}): ${err}`);
      });
    });

    socket.on('error', (err) => {
      logger.error(`[SocketServer] Socket error (${requestId}): ${err.message}`);
      this.cleanupConnection(socket);
    });

    socket.on('close', () => {
      logger.debug(`[SocketServer] Connection closed: ${requestId}`);
      this.emit('disconnect', socket);
      this.cleanupConnection(socket);
    });

    socket.on('timeout', () => {
      logger.warn(`[SocketServer] Socket timeout (${requestId})`);
      socket.destroy();
    });

    // Set socket timeout (disable timeout, we handle it manually)
    socket.setTimeout(0);

    // Configure socket for better throughput
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 30000);
  }

  /**
   * Cleanup connection state
   */
  private cleanupConnection(socket: net.Socket): void {
    const state = this.connections.get(socket);
    if (!state) {
      return;
    }

    // Reject all pending requests
    for (const [id, pending] of state.pendingRequests) {
      pending.reject(new Error('Connection closed'));
    }
    state.pendingRequests.clear();

    this.connections.delete(socket);
  }

  /**
   * Handle incoming data from a socket - processes messages concurrently
   */
  private async handleData(
    socket: net.Socket,
    state: ConnectionState,
    data: Buffer
  ): Promise<void> {
    if (!this.connections.has(socket)) {
      return;
    }

    try {
      const messages = state.parser.feed(data);

      // Process messages concurrently (don't await each one)
      const processingPromises = messages.map((message) =>
        this.handleMessageConcurrently(socket, state, message)
      );

      // Wait for all messages to be queued/processed
      await Promise.allSettled(processingPromises);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(
        `[SocketServer] Message parsing error (${state.requestId}): ${error.message}`
      );

      // Send error response
      this.sendErrorResponse(
        socket,
        SocketErrorCode.INVALID_REQUEST,
        error.message
      );
    }
  }

  /**
   * Handle a message concurrently (without blocking other messages)
   */
  private async handleMessageConcurrently(
    socket: net.Socket,
    state: ConnectionState,
    message: SocketMessage
  ): Promise<void> {
    if (!this.connections.has(socket)) {
      return;
    }

    // Check queue size
    const maxQueue = this.options.maxQueueSize ?? 100;
    if (state.queuedRequests >= maxQueue) {
      logger.warn(
        `[SocketServer] Queue full (${state.queuedRequests}/${maxQueue}) for ${state.requestId}`
      );
      this.sendErrorResponse(
        socket,
        SocketErrorCode.INTERNAL_ERROR,
        'Request queue full'
      );
      return;
    }

    switch (message.type) {
      case SocketMessageType.HTTP_REQUEST:
        // Increment queued count
        state.queuedRequests++;

        // Process asynchronously (don't await)
        this.handleHttpRequestAsync(socket, state, message as SocketHttpRequest)
          .finally(() => {
            state.queuedRequests--;
          })
          .catch((err) => {
            logger.error(
              `[SocketServer] Request handling error: ${err.message}`
            );
          });
        break;

      case SocketMessageType.PING:
        // PING is handled immediately (synchronous)
        this.sendPong(socket);
        break;

      default:
        logger.warn(`[SocketServer] Unknown message type: ${message.type}`);
        this.sendErrorResponse(
          socket,
          SocketErrorCode.UNKNOWN_MESSAGE_TYPE,
          `Unknown message type: ${message.type}`
        );
    }
  }

  /**
   * Handle HTTP request message asynchronously
   */
  private async handleHttpRequestAsync(
    socket: net.Socket,
    state: ConnectionState,
    request: SocketHttpRequest
  ): Promise<void> {
    if (!this.connections.has(socket)) {
      return;
    }

    // Acquire semaphore (concurrency control)
    await state.semaphore.acquire();
    state.activeRequests++;

    try {
      const reqId = getRequestId(request.headers);
      logger.debug(
        `[SocketServer] HTTP request (${reqId}): ${request.method} ${request.path}`
      );

      // Create a unique request ID for tracking
      const requestId = ++state.requestCounter;

      // Create promise for this request
      const responsePromise = new Promise<SocketHttpResponse>((resolve, reject) => {
        state.pendingRequests.set(requestId, {
          message: request,
          resolve,
          reject,
          timestamp: Date.now(),
        });
      });

      // Start processing (don't await - let it run concurrently)
      this.processRequest(socket, state, requestId, request)
        .then((response) => {
          state.pendingRequests.get(requestId)?.resolve(response);
        })
        .catch((error) => {
          state.pendingRequests.get(requestId)?.reject(error);
        })
        .finally(() => {
          state.pendingRequests.delete(requestId);
        });

      // Wait for response
      const response = await responsePromise;

      // Add request ID to response headers for correlation
      const responseHeaders = {
        ...response.headers,
        'x-request-id': reqId,
      };

      // Send response back
      this.sendHttpResponse(
        socket,
        response.statusCode,
        response.statusMessage,
        responseHeaders,
        response.body
      );

      logger.debug(
        `[SocketServer] HTTP response (${reqId}): ${response.statusCode}`
      );
    } finally {
      state.activeRequests--;
      state.semaphore.release();
    }
  }

  /**
   * Process a single request through Express
   */
  private async processRequest(
    socket: net.Socket,
    state: ConnectionState,
    requestId: number,
    request: SocketHttpRequest
  ): Promise<SocketHttpResponse> {
    const reqId = getRequestId(request.headers);

    try {
      // Create mock request and response
      const req = this.createMockRequest(request);
      const { res, responsePromise } = this.createMockResponse();

      // Forward to Express app
      this.options.app(req, res);

      // Wait for response (with timeout)
      const timeout = 30000; // 30 seconds
      const response = await Promise.race([
        responsePromise,
        this.timeoutAfter<SocketHttpResponse>(timeout),
      ]);

      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(
        `[SocketServer] Request processing error (${reqId}): ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Create a timeout promise
   */
  private timeoutAfter<T>(ms: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
    });
  }

  /**
   * Create a mock IncomingMessage
   */
  private createMockRequest(request: SocketHttpRequest): IncomingMessage {
    const url = request.query ? `${request.path}?${request.query}` : request.path;

    return {
      method: request.method,
      url,
      headers: request.headers as any,
      connection: { encrypted: false } as any,
      socket: { encrypted: false, readable: true, writable: true } as any,
    } as IncomingMessage;
  }

  /**
   * Create a mock ServerResponse
   */
  private createMockResponse(): {
    res: ServerResponse;
    responsePromise: Promise<{
      statusCode: number;
      statusMessage: string;
      headers: Record<string, string>;
      body: Buffer;
    }>;
  } {
    type ResponsePromiseValue = {
      statusCode: number;
      statusMessage: string;
      headers: Record<string, string>;
      body: Buffer;
    };

    let resolveResponse!: (value: ResponsePromiseValue) => void;
    const responsePromise = new Promise<ResponsePromiseValue>((resolve) => {
      resolveResponse = resolve;
    });

    const chunks: Buffer[] = [];
    const responseHeaders: Record<string, string> = {};

    // @ts-expect-error - Creating a partial mock
    const mockRes = Object.create(ServerResponse.prototype);

    // Set up properties
    mockRes.statusCode = 200;
    mockRes.statusMessage = 'OK';
    mockRes.headersSent = false;
    mockRes.writableEnded = false;
    mockRes.strictContentLength = false;

    // Define headers getter
    Object.defineProperty(mockRes, 'headers', {
      get(): Record<string, string> {
        return responseHeaders;
      },
      enumerable: true,
      configurable: true,
    });

    // Stub methods
    mockRes.assignSocket = () => {};
    mockRes.detachSocket = () => {};
    mockRes.writeContinue = () => {};
    mockRes.writeProcessing = () => mockRes;
    mockRes.addTrailers = () => {};
    mockRes.flushHeaders = () => {};

    // Event emitter stubs
    mockRes.on = () => mockRes;
    mockRes.once = () => mockRes;
    mockRes.addListener = () => mockRes;
    mockRes.prependListener = () => mockRes;
    mockRes.removeListener = () => mockRes;
    mockRes.off = () => mockRes;
    mockRes.removeAllListeners = () => mockRes;
    mockRes.setMaxListeners = () => mockRes;
    mockRes.getMaxListeners = () => 0;
    mockRes.emit = () => false;
    mockRes.eventNames = () => [];
    mockRes.listenerCount = () => 0;
    mockRes.listeners = () => [];
    mockRes.rawListeners = () => [];
    mockRes.prependOnceListener = () => mockRes;

    // Header methods
    mockRes.setHeader = (name: string, value: string | string[]): ServerResponse => {
      responseHeaders[name.toLowerCase()] = Array.isArray(value)
        ? value[0]
        : value;
      return mockRes;
    };

    mockRes.getHeader = (name: string): string | string[] | undefined => {
      return responseHeaders[name.toLowerCase()];
    };

    mockRes.getHeaders = (): Record<string, string> => {
      return { ...responseHeaders };
    };

    mockRes.hasHeader = (name: string): boolean => {
      return name.toLowerCase() in responseHeaders;
    };

    mockRes.removeHeader = (name: string): void => {
      delete responseHeaders[name.toLowerCase()];
    };

    // writeHead
    mockRes.writeHead = (
      statusCodeArg: number,
      statusMessageArg?: string | Record<string, string | string[]>,
      headersArg?: Record<string, string | string[]>
    ): ServerResponse => {
      mockRes.statusCode = statusCodeArg;

      if (typeof statusMessageArg === 'string') {
        mockRes.statusMessage = statusMessageArg;
      } else if (typeof statusMessageArg === 'object') {
        for (const [key, val] of Object.entries(statusMessageArg)) {
          responseHeaders[key.toLowerCase()] = Array.isArray(val) ? val[0] : val;
        }
      }

      if (headersArg) {
        for (const [key, val] of Object.entries(headersArg)) {
          responseHeaders[key.toLowerCase()] = Array.isArray(val) ? val[0] : val;
        }
      }

      mockRes.headersSent = true;
      return mockRes;
    };

    // write
    mockRes.write = (chunk: any): boolean => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    };

    // end
    mockRes.end = (data?: any): ServerResponse => {
      if (data) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      mockRes.writableEnded = true;

      resolveResponse({
        statusCode: mockRes.statusCode,
        statusMessage: mockRes.statusMessage,
        headers: responseHeaders,
        body: Buffer.concat(chunks.length > 0 ? chunks : [Buffer.alloc(0)]),
      });
      return mockRes;
    };

    return { res: mockRes, responsePromise };
  }

  /**
   * Send HTTP response message
   */
  private sendHttpResponse(
    socket: net.Socket,
    statusCode: number,
    statusMessage: string,
    headers: Record<string, string>,
    body?: Buffer
  ): void {
    const response: SocketHttpResponse = {
      version: 0x01,
      type: SocketMessageType.HTTP_RESPONSE,
      flags: 0,
      statusCode,
      statusMessage,
      headers,
      body,
    };

    response.flags =
      (Object.keys(headers).length > 0 ? 1 : 0) |
      (body ? 2 : 0) |
      (body ? 4 : 0);

    const encoded = encodeMessage(response);
    socket.write(encoded);
  }

  /**
   * Send error response
   */
  private sendErrorResponse(
    socket: net.Socket,
    code: SocketErrorCode,
    message: string,
    details?: string
  ): void {
    const response = {
      version: 0x01,
      type: SocketMessageType.ERROR as const,
      flags: 1,
      code,
      message,
      details,
    };

    const encoded = encodeMessage(response as SocketMessage);
    socket.write(encoded);
  }

  /**
   * Send pong response
   */
  private sendPong(socket: net.Socket): void {
    const pong = {
      version: 0x01,
      type: SocketMessageType.PONG as const,
      flags: 0,
      timestamp: Date.now(),
    };

    const encoded = encodeMessage(pong as SocketMessage);
    socket.write(encoded);
  }

  /**
   * Start connection timeout check
   */
  private startConnectionTimeoutCheck(): void {
    const timeout = this.options.connectionTimeout || 30000;

    this.connectionTimeoutTimer = setInterval(() => {
      const now = Date.now();

      for (const [socket, state] of this.connections) {
        // Check for idle timeout (no recent activity AND no active requests)
        const isIdle =
          now - state.lastActivity > timeout && state.activeRequests === 0;

        if (isIdle) {
          logger.warn(`[SocketServer] Connection timeout (${state.requestId})`);
          socket.destroy();
        }
      }
    }, 5000);
  }

  /**
   * Stop connection timeout check
   */
  private stopConnectionTimeoutCheck(): void {
    if (this.connectionTimeoutTimer) {
      clearInterval(this.connectionTimeoutTimer);
      this.connectionTimeoutTimer = null;
    }
  }

  /**
   * Get server statistics
   */
  getStats(): {
    connections: number;
    activeRequests: number;
    queuedRequests: number;
  } {
    let activeRequests = 0;
    let queuedRequests = 0;

    for (const state of this.connections.values()) {
      activeRequests += state.activeRequests;
      queuedRequests += state.queuedRequests;
    }

    return {
      connections: this.connections.size,
      activeRequests,
      queuedRequests,
    };
  }
}
