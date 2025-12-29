import { PriorityQueue } from './priorityQueue';
import { Pool } from './pool';
import { Metrics } from './metrics';
import { Task, QueueConfig, TaskProcessor, QueueMetrics } from './types';
import { logger } from '../services/logger';
import * as crypto from 'crypto';

export class QueueManager<T> {
  private queue: PriorityQueue<T>;
  private pool: Pool<T>;
  private metrics: Metrics;
  private config: QueueConfig;
  private paused = false;

  // Rate Limiting
  private intervalStart = 0;
  private executionsInInterval = 0;
  private rateLimitTimeout: NodeJS.Timeout | null = null;

  constructor(config: QueueConfig, processor: TaskProcessor<T>) {
    this.config = config;
    this.queue = new PriorityQueue<T>();
    this.pool = new Pool<T>(config.name, config.concurrency, processor);
    this.metrics = new Metrics();
  }

  add(data: T, id?: string, priority: number = 0): string {
    const taskId = id || crypto.randomUUID();
    
    // Check if active in pool
    if (this.pool.activeTasks.includes(taskId)) {
      return taskId;
    }

    const task: Task<T> = { id: taskId, data, priority };
    if (this.queue.enqueue(task)) {
      logger.debug(`[${this.config.name}] Added task ${taskId}`);
      this.processNext();
    }
    return taskId;
  }

  addBulk(items: { data: T, id?: string, priority?: number }[]) {
    for (const item of items) {
      this.add(item.data, item.id, item.priority);
    }
  }

  remove(id: string): boolean {
    // Check queue
    if (this.queue.remove(id)) return true;
    
    // Check pool (cancel)
    return this.pool.cancel(id);
  }

  has(id: string): boolean {
    return this.queue.has(id) || this.pool.activeTasks.includes(id);
  }

  get(id: string): T | undefined {
    return this.queue.get(id)?.data; // Only from pending for now? Or active too?
    // We don't store data in pool explicitly accessible, but pool has taskMap.
    // Pool doesn't expose data retrieval easily. 
    // For now, only pending.
  }

  start() {
    this.paused = false;
    logger.info(`[${this.config.name}] Queue started`);
    this.processNext();
  }

  stop() {
    this.paused = true;
    logger.info(`[${this.config.name}] Queue stopped`);
    if (this.rateLimitTimeout) {
      clearTimeout(this.rateLimitTimeout);
      this.rateLimitTimeout = null;
    }
  }

  shutdown(): Task<T>[] {
    this.stop();
    const pending = this.queue.getAll();
    this.queue.clear();
    const active = this.pool.terminate();
    logger.info(`[${this.config.name}] Shutdown complete. Cancelled ${active.length} active tasks, removed ${pending.length} pending tasks.`);
    return [...active, ...pending];
  }
  
  getMetrics(): QueueMetrics {
    return {
      pending: this.queue.size,
      active: this.pool.activeCount,
      completed: this.metrics.completed,
      failed: this.metrics.failed,
      throughput: this.metrics.throughput,
      paused: this.paused
    };
  }

  private async processNext() {
    if (this.paused) return;
    
    // Check Rate Limit
    if (this.config.rateLimit) {
      const now = Date.now();
      if (now - this.intervalStart > this.config.rateLimit.intervalMs) {
        this.intervalStart = now;
        this.executionsInInterval = 0;
      }
      
      if (this.executionsInInterval >= this.config.rateLimit.limit) {
        if (!this.rateLimitTimeout) {
          const delay = this.config.rateLimit.intervalMs - (now - this.intervalStart) + 10;
          logger.debug(`[${this.config.name}] Rate limit exceeded, pausing for ${delay}ms`);
          this.rateLimitTimeout = setTimeout(() => {
             this.rateLimitTimeout = null;
             this.processNext();
          }, delay);
        }
        return;
      }
    }

    if (this.pool.freeCount === 0) return;

    const task = this.queue.dequeue();
    if (!task) return;

    logger.debug(`[${this.config.name}] Dequeued task ${task.id} (Priority: ${task.priority})`);

    if (this.config.rateLimit) {
      this.executionsInInterval++;
    }

    const startTime = Date.now();

    // execute (fire and forget from scheduler perspective, but track completion)
    this.pool.execute(task)
      .then(() => {
        const duration = Date.now() - startTime;
        logger.info(`[${this.config.name}] Task ${task.id} completed in ${duration}ms`);
        this.metrics.recordCompletion();
      })
      .catch((err) => {
        const duration = Date.now() - startTime;
        logger.error(`[${this.config.name}] Task ${task.id} failed after ${duration}ms: ${err}`);
        this.metrics.recordFailure();
      })
      .finally(() => {
        this.processNext();
      });
      
    // Try to schedule more if we have concurrency
    this.processNext();
  }
}
