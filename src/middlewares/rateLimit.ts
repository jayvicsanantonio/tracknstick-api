import { Context, MiddlewareHandler, Next } from 'hono';
import { RateLimitError } from '../utils/errors.js';
import logger from '../utils/logger.js';

type RateLimitOptions = {
  /** Maximum number of requests allowed in the time window */
  limit: number;
  /** Time window in milliseconds */
  window: number;
};

/**
 * Simple in-memory rate limiting implementation for Cloudflare Workers
 *
 * IMPORTANT: This uses an in-memory store which is ephemeral per worker instance.
 * For production, consider using Cloudflare KV or Durable Objects for a distributed rate limiter.
 */
export const rateLimit = (options: RateLimitOptions): MiddlewareHandler => {
  const { limit, window } = options;

  // In-memory store for request counts
  const store = new Map<string, { count: number; resetAt: number }>();

  // Clean up expired entries periodically
  const cleanup = () => {
    const now = Date.now();
    // Use Array.from instead of for..of loop
    Array.from(store.entries()).forEach(([key, data]) => {
      if (now > data.resetAt) {
        store.delete(key);
      }
    });
  };

  // Schedule cleanup every minute
  setInterval(cleanup, 60000);

  return async (c: Context, next: Next) => {
    // Get identifier for rate limiting (IP address or user ID)
    const identifier =
      c.req.header('CF-Connecting-IP') ||
      c.get('userId') ||
      c.req.header('X-Forwarded-For') ||
      'unknown';

    // Create a scoped key based on the path to separate API endpoints
    const pathKey = c.req.path.split('/').slice(0, 3).join('/');
    const key = `${identifier}:${pathKey}`;

    const now = Date.now();

    // Initialize or get current count
    if (!store.has(key)) {
      store.set(key, { count: 0, resetAt: now + window });
    }

    const data = store.get(key)!;

    // Reset if window has passed
    if (now > data.resetAt) {
      data.count = 0;
      data.resetAt = now + window;
    }

    // Increment count without using ++
    data.count = data.count + 1;

    // Set headers
    c.header('X-RateLimit-Limit', limit.toString());
    c.header(
      'X-RateLimit-Remaining',
      Math.max(0, limit - data.count).toString()
    );
    c.header('X-RateLimit-Reset', Math.ceil(data.resetAt / 1000).toString());

    // Check if rate limit is exceeded
    if (data.count > limit) {
      logger.warn(`Rate limit exceeded for ${key}`, {
        identifier,
        path: c.req.path,
        method: c.req.method,
        count: data.count,
        limit,
      });

      throw new RateLimitError('Too many requests');
    }

    // Continue to the next middleware/handler
    await next();
  };
};
