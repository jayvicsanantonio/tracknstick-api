/**
 * Simple in-memory cache with TTL (Time To Live) support
 * For production with multiple workers, consider using Cloudflare KV
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

class Cache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;

  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get a value from cache
   */
  get(key: string): T | null {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set a value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    const actualTTL = ttl ?? this.defaultTTL;
    const now = Date.now();
    
    this.store.set(key, {
      value,
      expiresAt: now + actualTTL,
      createdAt: now,
    });
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.store.values());
    const expired = entries.filter(entry => now > entry.expiresAt).length;
    
    return {
      totalEntries: this.store.size,
      expiredEntries: expired,
      activeEntries: this.store.size - expired,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      // Use a simple log since we can't import logger here to avoid circular dependencies
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`Cache cleaned up ${cleanedCount} expired entries`);
      }
    }
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  private estimateMemoryUsage(): number {
    let size = 0;
    
    for (const [key, entry] of this.store.entries()) {
      size += key.length * 2; // Rough estimate for string size
      size += JSON.stringify(entry.value).length * 2; // Rough estimate for value size
      size += 24; // Rough estimate for entry metadata
    }
    
    return size;
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<R extends T>(
    key: string,
    factory: () => Promise<R> | R,
    ttl?: number
  ): Promise<R> {
    const cached = this.get(key) as R | null;
    
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
}

// Create cache instances for different types of data
export const habitCache = new Cache<any>(10 * 60 * 1000); // 10 minutes for habits
export const userCache = new Cache<any>(30 * 60 * 1000); // 30 minutes for user data
export const statsCache = new Cache<any>(5 * 60 * 1000); // 5 minutes for statistics

/**
 * Generate cache key for habits by date
 */
export function getHabitCacheKey(userId: string, date: string, timeZone: string): string {
  return `habits:${userId}:${date}:${timeZone}`;
}

/**
 * Generate cache key for habit statistics
 */
export function getHabitStatsCacheKey(userId: string, habitId: string): string {
  return `stats:${userId}:${habitId}`;
}

/**
 * Generate cache key for user data
 */
export function getUserCacheKey(userId: string): string {
  return `user:${userId}`;
}

/**
 * Invalidate cache entries for a specific user
 */
export function invalidateUserCache(userId: string): void {
  // Delete all cache entries that start with the user ID
  for (const cache of [habitCache, userCache, statsCache]) {
    const keysToDelete: string[] = [];
    
    // We can't iterate over Map keys directly and delete during iteration
    // So we collect keys first, then delete them
    for (const [key] of (cache as any).store.entries()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => cache.delete(key));
  }
}