import { Mutex, MutexInterface } from 'async-mutex';

export class MutexMap<K, V> {
  data: Map<K, V>;
  lock: MutexInterface;

  constructor() {
    this.data = new Map<K, V>();
    this.lock = new Mutex();
  }

  async get(key: K): Promise<V | undefined> {
    await this.lock.acquire();
    const value = this.data.get(key);

    this.lock.release();

    return value;
  }

  async getOrCreate(key: K, create: () => V): Promise<V> {
    await this.lock.acquire();
    let value = this.data.get(key);

    if (!value) {
      value = create();
      this.data.set(key, value);
    }
    this.lock.release();

    return value;
  }

  async set(key: K, value: V): Promise<void> {
    await this.lock.acquire();
    this.data.set(key, value);
    this.lock.release();
  }

  async remove(key: K): Promise<void> {
    await this.lock.acquire();
    this.data.delete(key);
    this.lock.release();
  }

  async getAndRemove(key: K): Promise<V | undefined> {
    await this.lock.acquire();
    const value = this.data.get(key);

    this.data.delete(key);
    this.lock.release();

    return value;
  }
}