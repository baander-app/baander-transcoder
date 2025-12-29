// Main IPC module exports
export type { IPCMessageRegistry, IPCMessageData, IPCMessage, WorkerToTranscoderMessage, TranscoderToWorkerMessage } from './messages';
export { isIPCMessage } from './messages';
export { IPCClient, ipcClient } from './client';
export { IPCServer, ipcServer } from './server';
export { ipcDebugLogger } from './logger';

// Re-export for convenience
export type { DebugLogEntry } from './logger';