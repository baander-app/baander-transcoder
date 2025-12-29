import { Worker } from './worker';
import { Task, TaskProcessor, WorkerStats } from './types';
import { logger } from '../services/logger';

export class Pool<T> {
  private workers: Worker<T>[] = [];
  private taskMap: Map<string, { worker: Worker<T>, task: Task<T> }> = new Map();
  private processor: TaskProcessor<T>;
  private concurrency: number;
  private name: string;

  constructor(name: string, concurrency: number, processor: TaskProcessor<T>) {
    this.name = name;
    this.concurrency = concurrency;
    this.processor = processor;
    this.initializeWorkers();
  }

  private initializeWorkers() {
    logger.debug(`[${this.name}] Initializing pool with ${this.concurrency} workers`);
    for (let i = 0; i < this.concurrency; i++) {
      this.workers.push(new Worker(this.name, this.processor));
    }
  }

  async execute(task: Task<T>): Promise<void> {
    const worker = this.getFreeWorker();
    if (!worker) {
      throw new Error('No free workers available');
    }

    this.taskMap.set(task.id, { worker, task });
    try {
      await worker.execute(task);
    } finally {
      this.taskMap.delete(task.id);
    }
  }

  cancel(taskId: string): boolean {
    const entry = this.taskMap.get(taskId);
    if (entry) {
      entry.worker.cancel();
      return true;
    }
    return false;
  }

  get activeCount(): number {
    return this.workers.filter(w => w.isBusy).length;
  }

  get freeCount(): number {
    return this.concurrency - this.activeCount;
  }

  get activeTasks(): string[] {
    return Array.from(this.taskMap.keys());
  }

  getStats(): WorkerStats[] {
    return this.workers.filter(w => w.isBusy).map(w => w.stats!);
  }

  terminate(): Task<T>[] {
    const cancelledTasks: Task<T>[] = [];
    for (const { worker, task } of this.taskMap.values()) {
      worker.cancel();
      cancelledTasks.push(task);
    }
    this.taskMap.clear();
    // Also cancel any workers that might be in an inconsistent state (though taskMap should cover busy ones)
    // Actually, taskMap exactly covers busy workers.
    return cancelledTasks;
  }

  private getFreeWorker(): Worker<T> | undefined {
    return this.workers.find(w => !w.isBusy);
  }
}
