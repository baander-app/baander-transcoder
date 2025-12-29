export interface Task<T> {
  id: string;
  data: T;
  priority: number;
}

export interface TaskResult<R> {
  taskId: string;
  result?: R;
  error?: Error;
}

export type TaskProcessor<T, R = any> = (data: T, signal: AbortSignal, updateProgress: (p: number) => void) => Promise<R>;

export interface QueueConfig {
  name: string;
  concurrency: number;
  rateLimit?: {
    limit: number;
    intervalMs: number;
  };
}

export interface WorkerStats {
  taskId: string;
  startTime: number;
  progress: number;
}

export interface QueueMetrics {
  pending: number;
  active: number;
  completed: number;
  failed: number;
  throughput: number; // tasks per minute (last minute)
  paused: boolean;
}
