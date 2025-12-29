/**
 * Unix Socket Protocol Definition
 *
 * Application-layer protocol for communication between PHP frontend and transcoder service
 * over Unix domain sockets.
 *
 * Message Format:
 * - Header: 8 bytes fixed length
 *   - Magic: 4 bytes (0x54434E54 = "TCNT" for TransCoNnecT)
 *   - Version: 1 byte (0x01)
 *   - Message Type: 1 byte (see SocketMessageType enum)
 *   - Flags: 1 byte (bit 0: hasHeaders, bit 1: hasBody)
 *   - Reserved: 1 byte
 * - Headers Length: 4 bytes (uint32 BE) - if hasHeaders flag set
 * - Body Length: 8 bytes (uint64 BE) - if hasBody flag set
 * - Headers: JSON object serialized as UTF-8 string
 * - Body: Raw bytes for file data or JSON string for API responses
 */

import type { IncomingMessage, ServerResponse } from 'http';

// Magic number for protocol identification (0x54434E54 = "TCNT")
export const PROTOCOL_MAGIC = 0x54434e54;
export const PROTOCOL_VERSION = 0x01;

// Header flags
export const FLAG_HAS_HEADERS = 0x01;
export const FLAG_HAS_BODY = 0x02;
export const FLAG_BINARY_BODY = 0x04;

// Message types
export enum SocketMessageType {
  // Request messages (Client -> Server)
  HTTP_REQUEST = 0x01,
  PING = 0x02,

  // Response messages (Server -> Client)
  HTTP_RESPONSE = 0x80,
  PONG = 0x81,
  ERROR = 0x82,
}

// Error codes
export enum SocketErrorCode {
  UNKNOWN_MESSAGE_TYPE = 1,
  INVALID_REQUEST = 2,
  INTERNAL_ERROR = 3,
  NOT_FOUND = 4,
  BAD_REQUEST = 5,
}

/**
 * HTTP method enumeration
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'PATCH';

/**
 * Socket request headers interface
 */
export interface SocketRequestHeaders {
  'accept'?: string;
  'accept-language'?: string;
  'cache-control'?: string;
  'host'?: string;
  'user-agent'?: string;
  'range'?: string;
  'forwarded'?: string;
  'x-forwarded-for'?: string;
  'x-forwarded-host'?: string;
  'x-forwarded-proto'?: string;
  'x-request-id'?: string;
  [key: string]: string | undefined;
}

/**
 * Socket response headers interface
 */
export interface SocketResponseHeaders {
  'content-type'?: string;
  'content-length'?: string;
  'content-disposition'?: string;
  'cache-control'?: string;
  'etag'?: string;
  'server'?: string;
  'access-control-allow-origin'?: string;
  'access-control-allow-methods'?: string;
  'access-control-allow-headers'?: string;
  [key: string]: string | undefined;
}

/**
 * Base socket message interface
 */
export interface BaseSocketMessage {
  version: number;
  type: SocketMessageType;
  flags: number;
}

/**
 * HTTP request message (sent from PHP to transcoder)
 * Maps to HTTP requests that would normally be sent to the API
 */
export interface SocketHttpRequest extends BaseSocketMessage {
  type: SocketMessageType.HTTP_REQUEST;
  method: HttpMethod;
  path: string; // e.g., "/api/hls/playlist/video123.m3u8"
  query?: string; // Query string without leading "?"
  headers: SocketRequestHeaders;
  body?: Buffer; // Only for POST/PUT requests
}

/**
 * HTTP response message (sent from transcoder to PHP)
 */
export interface SocketHttpResponse extends BaseSocketMessage {
  type: SocketMessageType.HTTP_RESPONSE;
  statusCode: number;
  statusMessage: string;
  headers: SocketResponseHeaders;
  body?: Buffer;
}

/**
 * Error response message
 */
export interface SocketErrorResponse extends BaseSocketMessage {
  type: SocketMessageType.ERROR;
  code: SocketErrorCode;
  message: string;
  details?: string;
}

/**
 * Ping message for health checking
 */
export interface SocketPingMessage extends BaseSocketMessage {
  type: SocketMessageType.PING;
  timestamp?: number;
}

/**
 * Pong message
 */
export interface SocketPongMessage extends BaseSocketMessage {
  type: SocketMessageType.PONG;
  timestamp?: number;
}

/**
 * Union type of all socket messages
 */
export type SocketMessage =
  | SocketHttpRequest
  | SocketHttpResponse
  | SocketErrorResponse
  | SocketPingMessage
  | SocketPongMessage;

/**
 * Type guard for HTTP request messages
 */
export function isHttpRequest(msg: SocketMessage): msg is SocketHttpRequest {
  return msg.type === SocketMessageType.HTTP_REQUEST;
}

/**
 * Type guard for HTTP response messages
 */
export function isHttpResponse(msg: SocketMessage): msg is SocketHttpResponse {
  return msg.type === SocketMessageType.HTTP_RESPONSE;
}

/**
 * Type guard for error messages
 */
export function isError(msg: SocketMessage): msg is SocketErrorResponse {
  return msg.type === SocketMessageType.ERROR;
}

/**
 * Convert a Node.js IncomingMessage headers to SocketRequestHeaders
 */
export function nodeHeadersToSocketHeaders(headers: IncomingMessage['headers']): SocketRequestHeaders {
  const socketHeaders: SocketRequestHeaders = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      socketHeaders[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
    }
  }

  return socketHeaders;
}

/**
 * Convert Node.js headers to SocketResponseHeaders format
 */
export function nodeHeadersToSocketResponseHeaders(headers: Record<string, string | string[] | undefined>): SocketResponseHeaders {
  const socketHeaders: SocketResponseHeaders = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      socketHeaders[key] = Array.isArray(value) ? value[0] : value;
    }
  }

  return socketHeaders;
}

/**
 * Convert a Node.js ServerResponse to SocketHttpResponse
 */
export function serverResponseToSocketResponse(
  statusCode: number,
  statusMessage: string,
  headers: Record<string, string | string[] | undefined>,
  body?: Buffer
): SocketHttpResponse {
  return {
    version: PROTOCOL_VERSION,
    type: SocketMessageType.HTTP_RESPONSE,
    flags: (Object.keys(headers).length > 0 ? FLAG_HAS_HEADERS : 0) |
           (body ? FLAG_HAS_BODY : 0) |
           (body ? FLAG_BINARY_BODY : 0),
    statusCode,
    statusMessage,
    headers: nodeHeadersToSocketResponseHeaders(headers),
    body,
  };
}

/**
 * Get the request ID from headers for tracing
 */
export function getRequestId(headers: SocketRequestHeaders): string {
  return headers['x-request-id'] || `socket-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
