import NodeCache from 'node-cache';

const cache = new NodeCache({ checkperiod: 60 });

export const CACHE_TTL = {
  MASTERS: 1800,       // 30 min
  SERVICES: 1800,      // 30 min
  SCHEDULE: 3600,      // 1 hour
  SLOTS: 60,           // 60 sec
  BOOKINGS: 600,       // 10 min
} as const;

export function getCache<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

export function setCache<T>(key: string, value: T, ttl: number): boolean {
  return cache.set(key, value, ttl);
}

export function delCache(key: string): number {
  return cache.del(key);
}

export function flushCache(): void {
  cache.flushAll();
}
