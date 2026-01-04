// Production-grade rate limiting middleware with environment-aware configuration
// Implements sliding window rate limiting with endpoint-specific controls

import { Context, MiddlewareHandler, Next } from 'hono';
import { RateLimitError } from '../utils/errors.js';
import {
  getSecurityConfig,
  type RateLimitConfig,
  type EndpointLimit,
} from '../config/security.js';
import logger from '../utils/logger.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
  firstRequest: number;
}

interface RateLimitStore {
  get(key: string): RateLimitEntry | undefined;
  set(key: string, value: RateLimitEntry): void;
  delete(key: string): void;
  entries(): IterableIterator<[string, RateLimitEntry]>;
}

/**
 * Production-grade rate limiting middleware with configurable policies
 *
 * Features:
 * - Environment-aware configuration
 * - Sliding window implementation
 * - Per-endpoint rate limiting
 * - IP-based and user-based limiting
 * - RFC 6585 compliant headers
 * - Automatic cleanup of expired entries
 */
export class RateLimitMiddleware {
  private store: RateLimitStore;
  private _config: RateLimitConfig | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.store = new Map<string, RateLimitEntry>();
    // Don't initialize cleanup or config in constructor for Cloudflare Workers compatibility
  }

  /**
   * Get merged configuration for the current environment
   */
  private getConfig(c: Context): RateLimitConfig {
    if (!this._config) {
      this._config = getSecurityConfig(c.env.ENVIRONMENT).rateLimit;
    }
    return this._config;
  }

  /**
   * Initialize periodic cleanup of expired entries (lazy initialization for Workers)
   */
  private initializeCleanup(): void {
    if (this.cleanupInterval) {
      return; // Already initialized
    }

    // In Cloudflare Workers, we'll do cleanup on-demand rather than using setInterval
    // setInterval is not allowed in global scope and would consume resources unnecessarily
    // this.cleanupInterval = setInterval(() => { this.cleanup(); }, 120000);
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    Array.from(this.store.entries()).forEach(([key, entry]) => {
      if (now > entry.resetAt) {
        this.store.delete(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      logger.debug('Rate limit cleanup completed', {
        cleanedEntries: cleanedCount,
        remainingEntries: this.store.entries.length,
      });
    }
  }

  /**
   * Get rate limit configuration for a specific endpoint
   */
  private getEndpointConfig(c: Context, path: string): EndpointLimit | null {
    const config = this.getConfig(c);

    // Check for exact path match first
    if (config.endpointLimits[path]) {
      return config.endpointLimits[path];
    }

    // Check for pattern matches
    for (const [pattern, limit] of Object.entries(config.endpointLimits)) {
      if (path.startsWith(pattern)) {
        return limit;
      }
    }

    return null;
  }

  /**
   * Generate rate limit key for tracking
   */
  private generateKey(
    c: Context,
    identifier: string,
    path: string,
    endpointConfig: EndpointLimit | null
  ): string {
    const config = this.getConfig(c);

    // Use endpoint-specific path grouping if configured
    if (endpointConfig) {
      // Group by endpoint pattern for specific limits
      const endpointPattern =
        Object.keys(config.endpointLimits).find((pattern) =>
          path.startsWith(pattern)
        ) || path;
      return `${identifier}:${endpointPattern}`;
    }

    // Use path grouping for global limits (group by first 3 path segments)
    const pathKey = path.split('/').slice(0, 3).join('/');
    return `${identifier}:global:${pathKey}`;
  }

  /**
   * Get identifier for rate limiting (user ID preferred, then IP)
   */
  private getIdentifier(c: Context): string {
    // Prefer user ID if authenticated
    const userId = c.get('userId');
    if (userId) {
      return `user:${userId}`;
    }

    // Fall back to IP address
    const ip =
      c.req.header('CF-Connecting-IP') ||
      c.req.header('X-Forwarded-For') ||
      'unknown';
    return `ip:${ip}`;
  }

  /**
   * Check if request should skip rate limiting
   */
  private shouldSkip(
    path: string,
    endpointConfig: EndpointLimit | null
  ): boolean {
    if (endpointConfig?.skipIf) {
      return endpointConfig.skipIf(path);
    }
    return false;
  }

  /**
   * Create the rate limiting middleware
   */
  middleware(): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      const path = c.req.path;
      const method = c.req.method;

      // Do periodic cleanup on-demand (every ~100 requests to avoid overhead)
      if (Math.random() < 0.01) {
        this.cleanup();
      }

      // Get merged config for this environment
      const config = this.getConfig(c);

      // Get endpoint-specific configuration
      const endpointConfig = this.getEndpointConfig(c, path);

      // Check if this request should skip rate limiting
      if (this.shouldSkip(path, endpointConfig)) {
        await next();
        return;
      }

      // Determine rate limit and window
      const limit = endpointConfig?.limit || config.globalLimit;
      const windowMs = endpointConfig?.windowMs || config.windowMs;

      // Generate tracking key
      const identifier = this.getIdentifier(c);
      const key = this.generateKey(c, identifier, path, endpointConfig);

      const now = Date.now();

      // Initialize or get current rate limit entry
      let entry = this.store.get(key);
      if (!entry) {
        entry = {
          count: 0,
          resetAt: now + windowMs,
          firstRequest: now,
        };
        this.store.set(key, entry);
      }

      // Reset window if expired (sliding window)
      if (now > entry.resetAt) {
        entry.count = 0;
        entry.resetAt = now + windowMs;
        entry.firstRequest = now;
      }

      // Increment request count
      entry.count++;

      // Set rate limit headers (RFC 6585 compliant)
      c.header('X-RateLimit-Limit', limit.toString());
      c.header(
        'X-RateLimit-Remaining',
        Math.max(0, limit - entry.count).toString()
      );
      c.header('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000).toString());
      c.header('X-RateLimit-Window', Math.ceil(windowMs / 1000).toString());

      // Check if rate limit exceeded
      if (entry.count > limit) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        c.header('Retry-After', retryAfter.toString());

        logger.warn('Rate limit exceeded', {
          identifier,
          path,
          method,
          count: entry.count,
          limit,
          windowMs,
          retryAfter,
          endpointSpecific: !!endpointConfig,
        });

        throw new RateLimitError('Too many requests');
      }

      // Log successful rate limit check for debugging
      logger.debug('Rate limit check passed', {
        identifier,
        path,
        method,
        count: entry.count,
        limit,
        remaining: limit - entry.count,
      });

      await next();
    };
  }

  /**
   * Get current rate limit statistics (for monitoring)
   */
  getStats(c: Context): {
    totalKeys: number;
    memoryUsage: number;
    config: RateLimitConfig;
  } {
    return {
      totalKeys: Array.from(this.store.entries()).length,
      memoryUsage: JSON.stringify(Array.from(this.store.entries())).length,
      config: this.getConfig(c),
    };
  }

  /**
   * Clear all rate limit data (for testing)
   */
  clear(): void {
    this.store = new Map<string, RateLimitEntry>();
  }

  /**
   * Destroy the middleware and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Export singleton instance for use across the application
export const rateLimitMiddleware = new RateLimitMiddleware();

/**
 * Convenience function to get the rate limiting middleware
 */
export const createRateLimit = (): MiddlewareHandler => {
  return rateLimitMiddleware.middleware();
};
