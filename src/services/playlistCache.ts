import { logger } from './logger';

interface CacheEntry {
  data: string;
  expiry: number;
}

export class PlaylistCache {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private ttlSeconds: number) {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      logger.debug(`[PlaylistCache] Cleaned up ${count} expired entries`);
    }
  }

  public get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  public set(key: string, data: string) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (this.ttlSeconds * 1000)
    });
  }
}
