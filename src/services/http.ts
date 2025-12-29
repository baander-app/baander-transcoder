import { RateLimiter } from './rateLimiter';
import { PlaylistCache } from './playlistCache';
import { getConfig } from '../config';

// Singleton instances
let rateLimiter: RateLimiter | null = null;
let playlistCache: PlaylistCache | null = null;

export function initHttpService(configPath: string) {
  const config = getConfig(configPath);
  if (config.http) {
    rateLimiter = new RateLimiter(config.http.rateLimit);
    playlistCache = new PlaylistCache(config.http.cacheTTL);
  }
}

export function getRateLimiter(): RateLimiter {
  if (!rateLimiter) {
    // Fallback default if not initialized
    rateLimiter = new RateLimiter({ windowMs: 60000, max: 100 });
  }
  return rateLimiter;
}

export function getPlaylistCache(): PlaylistCache {
  if (!playlistCache) {
    // Fallback default
    playlistCache = new PlaylistCache(5);
  }
  return playlistCache;
}
