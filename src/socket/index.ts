// Unix Socket Module exports
export type {
  SocketRequestHeaders,
  SocketResponseHeaders,
  BaseSocketMessage,
  SocketHttpRequest,
  SocketHttpResponse,
  SocketErrorResponse,
  SocketPingMessage,
  SocketPongMessage,
  SocketMessage,
} from './protocol';
export {
  PROTOCOL_MAGIC,
  PROTOCOL_VERSION,
  FLAG_HAS_HEADERS,
  FLAG_HAS_BODY,
  FLAG_BINARY_BODY,
  SocketMessageType,
  SocketErrorCode,
  isHttpRequest,
  isHttpResponse,
  isError,
  getRequestId,
  nodeHeadersToSocketHeaders,
  nodeHeadersToSocketResponseHeaders,
  serverResponseToSocketResponse,
} from './protocol';
export type { CodecState } from './codec';
export { ProtocolError, createCodecState, encodeMessage, decodeMessage, MessageStreamParser } from './codec';
export { SocketServer } from './server';
export type { SocketServerOptions } from './server';
