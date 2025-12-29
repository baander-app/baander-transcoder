import { Task, TaskProcessor, WorkerStats } from './types';
import { logger } from '../services/logger';

export class Worker<T> {
  private _taskId: string | null = null;
  private controller: AbortController | null = null;
  private processor: TaskProcessor<T>;
  private _startTime: number = 0;
  private _progress: number = 0;
  private name: string;

  constructor(name: string, processor: TaskProcessor<T>) {
    this.name = name;
    this.processor = processor;
  }

  async execute(task: Task<T>): Promise<void> {
    if (this._taskId) {
      throw new Error('Worker is already busy');
    }

    this._taskId = task.id;
    this.controller = new AbortController();
    this._startTime = Date.now();
    this._progress = 0;

    logger.debug(`[${this.name}] Worker starting task ${task.id}`);

    const updateProgress = (p: number) => {
      this._progress = p;
    };

    try {
      await this.processor(task.data, this.controller.signal, updateProgress);
      logger.debug(`[${this.name}] Worker finished task ${task.id}`);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        logger.debug(`[${this.name}] Worker cancelled task ${task.id}`);
      } else {
        logger.error(`[${this.name}] Worker failed task ${task.id}: ${err}`);
        throw err;
      }
    } finally {
      this.reset();
    }
  }

  cancel() {
    if (this.controller) {
      this.controller.abort();
    }
  }

  get isBusy(): boolean {
    return this._taskId !== null;
  }

  get taskId(): string | null {
    return this._taskId;
  }

  get stats(): WorkerStats | null {
    if (!this._taskId) return null;
    return {
      taskId: this._taskId,
      startTime: this._startTime,
      progress: this._progress
    };
  }

  private reset() {
    if (this._taskId) {
      logger.debug(`[${this.name}] Worker released (Task: ${this._taskId})`);
    }
    this._taskId = null;
    this.controller = null;
    this._startTime = 0;
    this._progress = 0;
  }
}
