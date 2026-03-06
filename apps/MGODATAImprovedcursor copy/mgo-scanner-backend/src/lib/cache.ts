/**
 * In-memory LRU cache implementation (Redis-ready structure)
 */
import { LRUCache } from 'lru-cache';

export interface CacheOptions {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
}

export class Cache {
  private cache: LRUCache<string, any>;

  constructor(options: CacheOptions = {}) {
    this.cache = new LRUCache({
      max: options.maxSize || 1000,
      ttl: options.ttl || 1000 * 60 * 60, // Default 1 hour
    });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    if (ttl) {
      this.cache.set(key, value, { ttl });
    } else {
      this.cache.set(key, value);
    }
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}

// Singleton instances for different cache types
export const placesCache = new Cache({ maxSize: 500, ttl: 1000 * 60 * 60 * 24 }); // 24h
export const websiteCache = new Cache({ maxSize: 1000, ttl: 1000 * 60 * 60 * 6 }); // 6h
export const directoryCache = new Cache({ maxSize: 2000, ttl: 1000 * 60 * 60 * 6 }); // 6h

// Explain cache (15–60m recommended; default 30m)
export const meoExplainCache = new Cache({
  maxSize: 2000,
  ttl: Number(process.env.MEO_EXPLAIN_CACHE_TTL_MS) || 1000 * 60 * 30,
});// GEO benchmark cache (6–24h recommended; default 12h)
export const geoBenchmarkCache = new Cache({
  maxSize: 500,
  ttl: Number(process.env.GEO_BENCHMARK_CACHE_TTL_MS) || 1000 * 60 * 60 * 12,
});