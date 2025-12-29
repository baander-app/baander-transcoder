import { QueueManager } from '../queue/queueManager';
import { Task, QueueMetrics } from '../queue/types';
import { stateManager } from '../state';
import { logger } from './logger';

type Serializer<T> = (item: T) => any;
type Deserializer<T> = (data: any) => T;

interface RegisteredQueue<T> {
  queue: QueueManager<T>;
  serializer: Serializer<T>;
  deserializer: Deserializer<T>;
}

class QueueRegistry {
  private queues = new Map<string, RegisteredQueue<any>>();

  register<T>(name: string, queue: QueueManager<T>, options: { serializer?: Serializer<T>, deserializer?: Deserializer<T> } = {}) {
    this.queues.set(name, {
      queue,
      serializer: options.serializer || ((i) => i),
      deserializer: options.deserializer || ((d) => d),
    });
  }

  async saveAll() {
    for (const [name, { queue, serializer }] of this.queues) {
      const tasks = queue.shutdown();
      if (tasks.length > 0) {
        logger.info(`Persisting ${tasks.length} items for queue '${name}'`);
        const data = tasks.map(task => ({
          id: task.id,
          data: serializer(task.data),
          priority: task.priority
        }));
        await stateManager.save(`queues/${name}.json`, data);
      }
    }
  }

  async loadAll() {
    for (const [name, { queue, deserializer }] of this.queues) {
      const data = await stateManager.load(`queues/${name}.json`);
      if (Array.isArray(data) && data.length > 0) {
        logger.info(`Restoring ${data.length} items for queue '${name}'`);
        const tasks = data.map((item: any) => ({
          id: item.id,
          data: deserializer(item.data),
          priority: item.priority || 0
        }));
        queue.addBulk(tasks);
        queue.start(); // Ensure queue is started after loading
      }
    }
  }

  getMetrics(): Record<string, QueueMetrics> {
    const metrics: Record<string, QueueMetrics> = {};
    for (const [name, { queue }] of this.queues) {
      metrics[name] = queue.getMetrics();
    }
    return metrics;
  }
}

export const queueManager = new QueueRegistry();
