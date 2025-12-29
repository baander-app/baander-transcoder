import { Task } from './types';

export class PriorityQueue<T> {
  private items: Task<T>[] = [];
  private itemMap: Map<string, Task<T>> = new Map();

  enqueue(task: Task<T>): boolean {
    if (this.itemMap.has(task.id)) {
      // Optional: Update priority if new one is higher?
      // For now, strict deduplication based on ID.
      return false;
    }
    this.items.push(task);
    this.itemMap.set(task.id, task);
    this.sort();
    return true;
  }

  dequeue(): Task<T> | undefined {
    const task = this.items.shift();
    if (task) {
      this.itemMap.delete(task.id);
    }
    return task;
  }

  remove(id: string): Task<T> | undefined {
    const task = this.itemMap.get(id);
    if (task) {
      this.itemMap.delete(id);
      const idx = this.items.findIndex(t => t.id === id);
      if (idx !== -1) {
        this.items.splice(idx, 1);
      }
    }
    return task;
  }

  peek(): Task<T> | undefined {
    return this.items.at(0);
  }

  get(id: string): Task<T> | undefined {
    return this.itemMap.get(id);
  }

  has(id: string): boolean {
    return this.itemMap.has(id);
  }

  get size(): number {
    return this.items.length;
  }

  getAll(): Task<T>[] {
    return [...this.items];
  }

  clear() {
    this.items = [];
    this.itemMap.clear();
  }

  private sort() {
    this.items.sort((a, b) => b.priority - a.priority);
  }
}
