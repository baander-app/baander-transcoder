import { NextFunction, Request, Response } from 'express';
import { logger } from './logger';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private config: RateLimitConfig) {
    // Cleanup stale buckets every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private getClientIp(req: Request): string {
    return (req.ip || req.socket.remoteAddress || 'unknown') as string;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > this.config.windowMs) {
        this.buckets.delete(key);
      }
    }
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = this.getClientIp(req);
      const now = Date.now();
      
      let bucket = this.buckets.get(ip);
      if (!bucket) {
        bucket = {
          tokens: this.config.max,
          lastRefill: now,
        };
        this.buckets.set(ip, bucket);
      }

      // Refill tokens
      const timePassed = now - bucket.lastRefill;
      const tokensToAdd = Math.floor(timePassed * (this.config.max / this.config.windowMs));
      
      if (tokensToAdd > 0) {
        bucket.tokens = Math.min(this.config.max, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
      }

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        
        // Track duration
        const start = process.hrtime();
        res.on('finish', () => {
          const diff = process.hrtime(start);
          const duration = (diff[0] * 1000 + diff[1] / 1e6).toFixed(3);
          logger.debug(`[RateLimit] Request from ${ip} took ${duration}ms`);
        });

        next();
      } else {
        logger.warn(`[RateLimit] Blocked request from ${ip} - Rate limit exceeded`);
        res.status(429).set('Retry-After', String(Math.ceil(this.config.windowMs / 1000))).send('Too Many Requests');
      }
    };
  }
}
