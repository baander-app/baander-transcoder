/**
 * Unix Socket Protocol Codec
 *
 * Handles encoding and decoding of binary protocol messages.
 */

import * as net from 'net';
import {
  PROTOCOL_MAGIC,
  PROTOCOL_VERSION,
  FLAG_HAS_HEADERS,
  FLAG_HAS_BODY,
  SocketMessageType,
  type SocketMessage,
  type SocketHttpRequest,
  type SocketHttpResponse,
  type SocketErrorResponse,
  type SocketPingMessage,
  type SocketPongMessage,
  isHttpRequest,
  isHttpResponse,
  isError,
} from './protocol';

/**
 * Protocol error class
 */
export class ProtocolError extends Error {
  constructor(message: string, public readonly code: number = 0) {
    super(message);
    this.name = 'ProtocolError';
  }
}

/**
 * Codec state for incremental parsing
 */
export interface CodecState {
  buffer: Buffer;
  expectedBytes: number | null;
  stage: 'header' | 'lengths' | 'data' | 'complete';
}

/**
 * Create initial codec state
 */
export function createCodecState(): CodecState {
  return {
    buffer: Buffer.alloc(0),
    expectedBytes: null,
    stage: 'header',
  };
}

/**
 * Encode a socket message to binary format
 */
export function encodeMessage(message: SocketMessage): Buffer {
  const buffers: Buffer[] = [];

  // Determine if we have headers and body
  const hasHeaders = (message.flags & FLAG_HAS_HEADERS) !== 0;
  const hasBody = (message.flags & FLAG_HAS_BODY) !== 0;

  // Prepare headers JSON if present
  let headersBuffer: Buffer = Buffer.alloc(0);
  if (hasHeaders) {
    let headersObj: Record<string, any> = {};

    if (isHttpRequest(message)) {
      headersObj = message.headers;
      // Add method, path, query to headers for transmission
      headersObj['_method'] = message.method;
      headersObj['_path'] = message.path;
      if (message.query) headersObj['_query'] = message.query;
    } else if (isHttpResponse(message)) {
      headersObj = message.headers;
      // Add status info
      headersObj['_statusCode'] = message.statusCode;
      headersObj['_statusMessage'] = message.statusMessage;
    } else if (isError(message)) {
      headersObj = {
        '_code': message.code,
        '_message': message.message,
        '_details': message.details,
      };
    }

    headersBuffer = Buffer.from(JSON.stringify(headersObj), 'utf-8');
  }

  // Prepare body if present
  const bodyBuffer = (message as any).body ? Buffer.from((message as any).body) : Buffer.alloc(0);

  // Build fixed header (8 bytes)
  const headerBuffer = Buffer.alloc(8);
  headerBuffer.writeUInt32BE(PROTOCOL_MAGIC, 0);           // Magic: 4 bytes
  headerBuffer.writeUInt8(PROTOCOL_VERSION, 4);            // Version: 1 byte
  headerBuffer.writeUInt8(message.type, 5);                // Type: 1 byte
  headerBuffer.writeUInt8(message.flags, 6);               // Flags: 1 byte
  headerBuffer.writeUInt8(0, 7);                           // Reserved: 1 byte

  buffers.push(headerBuffer);

  // Headers length (4 bytes) if has headers
  if (hasHeaders) {
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(headersBuffer.length, 0);
    buffers.push(lengthBuffer);
    buffers.push(headersBuffer);
  }

  // Body length (8 bytes) and body if has body
  if (hasBody) {
    const lengthBuffer = Buffer.alloc(8);
    lengthBuffer.writeBigUInt64BE(BigInt(bodyBuffer.length), 0);
    buffers.push(lengthBuffer);
    buffers.push(bodyBuffer);
  }

  return Buffer.concat(buffers);
}

/**
 * Decode a socket message from binary format
 */
export function decodeMessage(data: Buffer, state: CodecState): { message: SocketMessage | null; state: CodecState; error?: Error } {
  // Append new data to buffer
  state.buffer = Buffer.concat([state.buffer, data]);

  try {
    while (state.buffer.length > 0) {
      if (state.stage === 'header') {
        // Need at least 8 bytes for header
        if (state.buffer.length < 8) {
          return { message: null, state };
        }

        // Verify magic number
        const magic = state.buffer.readUInt32BE(0);
        if (magic !== PROTOCOL_MAGIC) {
          throw new ProtocolError(`Invalid magic number: ${magic.toString(16)}`, 1);
        }

        // Parse header
        const version = state.buffer.readUInt8(4);
        if (version !== PROTOCOL_VERSION) {
          throw new ProtocolError(`Unsupported protocol version: ${version}`, 2);
        }

        const type = state.buffer.readUInt8(5) as SocketMessageType;
        const flags = state.buffer.readUInt8(6);

        // Remove header from buffer
        state.buffer = state.buffer.slice(8);
        state.stage = 'lengths';

        // Store parsed values temporarily
        (state as any)._type = type;
        (state as any)._flags = flags;
      }

      if (state.stage === 'lengths') {
        const flags = (state as any)._flags;
        const hasHeaders = (flags & FLAG_HAS_HEADERS) !== 0;
        const hasBody = (flags & FLAG_HAS_BODY) !== 0;

        // Parse headers length if present
        if (hasHeaders && state.expectedBytes === null) {
          if (state.buffer.length < 4) {
            return { message: null, state };
          }
          state.expectedBytes = state.buffer.readUInt32BE(0);
          state.buffer = state.buffer.slice(4);
          (state as any)._parsingHeaders = true;
        }

        // Parse headers if present
        if ((state as any)._parsingHeaders && state.expectedBytes !== null) {
          if (state.buffer.length < state.expectedBytes) {
            return { message: null, state };
          }
          const headersJson = state.buffer.toString('utf-8', 0, state.expectedBytes);
          (state as any)._headersJson = headersJson;
          state.buffer = state.buffer.slice(state.expectedBytes);
          state.expectedBytes = null;
          delete (state as any)._parsingHeaders;

          // Check for body next
          if (hasBody) {
            (state as any)._parsingBodyLength = true;
          } else {
            // No body, we're done
            state.stage = 'complete';
            break;
          }
        }

        // Parse body length if present
        if ((state as any)._parsingBodyLength) {
          if (state.buffer.length < 8) {
            return { message: null, state };
          }
          state.expectedBytes = Number(state.buffer.readBigUInt64BE(0));
          state.buffer = state.buffer.slice(8);
          delete (state as any)._parsingBodyLength;
          (state as any)._parsingBody = true;
        }

        // Parse body if present
        if ((state as any)._parsingBody && state.expectedBytes !== null) {
          if (state.buffer.length < state.expectedBytes) {
            return { message: null, state };
          }
          const body = state.buffer.slice(0, state.expectedBytes);
          (state as any)._body = body;
          state.buffer = state.buffer.slice(state.expectedBytes);
          state.expectedBytes = null;
          delete (state as any)._parsingBody;
          state.stage = 'complete';
          break;
        }

        // No headers or body, complete
        if (!hasHeaders && !hasBody) {
          state.stage = 'complete';
          break;
        }
      }

      if (state.stage === 'complete') {
        // Build message from parsed data
        const message = buildMessageFromState(state);

        // Reset state for next message
        state.buffer = Buffer.alloc(0);
        state.expectedBytes = null;
        state.stage = 'header';

        return { message, state };
      }
    }

    return { message: null, state };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { message: null, state, error };
  }
}

/**
 * Build a SocketMessage object from the codec state
 */
function buildMessageFromState(state: CodecState): SocketMessage {
  const type = (state as any)._type as SocketMessageType;
  const flags = (state as any)._flags;
  const headersJson = (state as any)._headersJson;
  const body = (state as any)._body;

  const baseMessage = {
    version: PROTOCOL_VERSION,
    type,
    flags,
  };

  if (type === SocketMessageType.HTTP_REQUEST) {
    const headers = headersJson ? JSON.parse(headersJson) : {};
    const method = headers._method || 'GET';
    const path = headers._path || '/';
    const query = headers._query;
    delete headers._method;
    delete headers._path;
    delete headers._query;

    return {
      ...baseMessage,
      type: SocketMessageType.HTTP_REQUEST,
      method,
      path,
      query,
      headers,
      body,
    } as SocketHttpRequest;
  }

  if (type === SocketMessageType.HTTP_RESPONSE) {
    const headers = headersJson ? JSON.parse(headersJson) : {};
    const statusCode = headers._statusCode || 200;
    const statusMessage = headers._statusMessage || 'OK';
    delete headers._statusCode;
    delete headers._statusMessage;

    return {
      ...baseMessage,
      type: SocketMessageType.HTTP_RESPONSE,
      statusCode,
      statusMessage,
      headers,
      body,
    } as SocketHttpResponse;
  }

  if (type === SocketMessageType.ERROR) {
    const data = headersJson ? JSON.parse(headersJson) : {};
    return {
      ...baseMessage,
      type: SocketMessageType.ERROR,
      code: data._code || 0,
      message: data._message || 'Unknown error',
      details: data._details,
    } as SocketErrorResponse;
  }

  if (type === SocketMessageType.PING || type === SocketMessageType.PONG) {
    const data = headersJson ? JSON.parse(headersJson) : {};
    return {
      ...baseMessage,
      type,
      timestamp: data.timestamp,
    } as SocketPingMessage | SocketPongMessage;
  }

  throw new ProtocolError(`Unknown message type: ${type}`);
}

/**
 * Message stream parser for handling incoming data
 */
export class MessageStreamParser {
  private state = createCodecState();

  /**
   * Feed data to the parser
   * Returns array of complete messages
   */
  feed(data: Buffer): SocketMessage[] {
    const messages: SocketMessage[] = [];
    const result = decodeMessage(data, this.state);

    if (result.error) {
      throw result.error;
    }

    if (result.message) {
      messages.push(result.message);
    }

    // Try to parse more messages if there's remaining data
    while (this.state.buffer.length > 0 && this.state.stage === 'header') {
      const nextResult = decodeMessage(Buffer.alloc(0), this.state);
      if (nextResult.error) {
        throw nextResult.error;
      }
      if (nextResult.message) {
        messages.push(nextResult.message);
      } else {
        break;
      }
    }

    return messages;
  }

  /**
   * Reset the parser state
   */
  reset(): void {
    this.state = createCodecState();
  }

  /**
   * Get remaining buffer bytes
   */
  getRemainingBuffer(): Buffer {
    return this.state.buffer;
  }
}
