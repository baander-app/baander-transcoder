import type { TranscodeOptions } from '../config';

// Core IPC message type registry
export interface IPCMessageRegistry {
  // Transcoder -> Worker messages (Commands)
  startSession: {
    sessionId: string;
    file: string;
    config: TranscodeOptions;
    height: number;
    outputDir: string;
    format: 'hls' | 'dash';
    startTime: number;
    startNumber: number;
    videoStreamIndex: number;
  };

  stopSession: {
    sessionId: string;
  };

  pauseSession: {
    sessionId: string;
  };

  resumeSession: {
    sessionId: string;
  };

  extractIFrame: {
    file: string;
    index: number;
    requestId: string;
  };

  // Worker -> Transcoder messages (Events/Responses)
  segmentAvailable: {
    sessionId: string;
    segment: string;
  };

  sessionStarted: {
    sessionId: string;
  };

  sessionStopped: {
    sessionId: string;
    code?: number;
  };

  sessionError: {
    sessionId: string;
    error: string;
  };

  iFrameResponse: {
    requestId: string;
    data: {
      path?: string;
      error?: string;
    };
  };
}

// Helper type to extract the data type for a message type
export type IPCMessageData<T extends keyof IPCMessageRegistry> = IPCMessageRegistry[T];

// Typed IPC message interface
export interface IPCMessage<T extends keyof IPCMessageRegistry> {
  type: T;
  data: IPCMessageData<T>;
}

// Type guard to check if a message is valid IPC message
export function isIPCMessage<T extends keyof IPCMessageRegistry>(
  message: any,
  type: T
): message is IPCMessage<T> {
  return message && typeof message === 'object' && message.type === type;
}

// Direction-specific message types for better type safety
export interface WorkerToTranscoderMessage {
  type: 'segmentAvailable' | 'sessionStarted' | 'sessionStopped' | 'sessionError' | 'iFrameResponse';
  data: any;
}

export interface TranscoderToWorkerMessage {
  type: 'startSession' | 'stopSession' | 'pauseSession' | 'resumeSession' | 'extractIFrame';
  data: any;
}