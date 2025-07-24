import { Context, MiddlewareHandler, Next } from 'hono';
import { RateLimitError } from '../utils/errors.js';
import logger from '../utils/logger.js';

type RateLimitOptions = {
  /** Maximum number of requests allowed in the time window */
  limit: number;
  /** Time window in milliseconds */
  window: number;
  /** Custom key generator function */
  keyGenerator?: (c: Context) => string;
  /** Skip rate limiting for certain requests */
  skip?: (c: Context) => boolean;
};

/**
 * Improved rate limiting implementation for Cloudflare Workers
 * 
 * NOTE: This still uses in-memory storage which is ephemeral per worker instance.
 * For production with multiple workers, consider using:
 * - Cloudflare KV for distributed rate limiting
 * - Durable Objects for more complex rate limiting logic
 * - External Redis instance
 */
export const rateLimit = (options: RateLimitOptions): MiddlewareHandler => {
  const { 
    limit, 
    window, 
    keyGenerator = defaultKeyGenerator,
    skip = () => false 
  } = options;

  // In-memory store for request counts
  const store = new Map<string, { count: number; resetAt: number; firstRequest: number }>();

  // Clean up expired entries periodically (with error handling)
  const cleanup = () => {
    try {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [key, data] of store.entries()) {
        if (now > data.resetAt) {
          store.delete(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.debug(`Rate limiter cleaned up ${cleanedCount} expired entries`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error during rate limiter cleanup', err);
    }
  };

  // Schedule cleanup every minute
  const cleanupInterval = setInterval(cleanup, 60000);

  // Cleanup on process termination (if supported in the environment)
  if (typeof process !== 'undefined' && process.on) {
    process.on('exit', () => clearInterval(cleanupInterval));
  }

  return async (c: Context, next: Next) => {
    // Skip rate limiting if specified
    if (skip(c)) {
      await next();
      return;
    }

    // Generate rate limiting key
    const key = keyGenerator(c);
    const now = Date.now();

    // Initialize or get current count
    if (!store.has(key)) {
      store.set(key, { 
        count: 0, 
        resetAt: now + window,
        firstRequest: now
      });
    }

    const data = store.get(key)!;

    // Reset if window has passed
    if (now > data.resetAt) {
      data.count = 0;
      data.resetAt = now + window;
      data.firstRequest = now;
    }

    // Increment count
    data.count += 1;

    // Calculate remaining requests and reset time
    const remaining = Math.max(0, limit - data.count);
    const resetTime = Math.ceil(data.resetAt / 1000);

    // Set rate limit headers
    c.header('X-RateLimit-Limit', limit.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', resetTime.toString());
    c.header('X-RateLimit-Window', window.toString());

    // Check if rate limit is exceeded
    if (data.count > limit) {
      const rateLimitInfo = {
        key: key.replace(/:\d+\.\d+\.\d+\.\d+/, ':***'), // Mask IP for privacy
        path: c.req.path,
        method: c.req.method,
        count: data.count,
        limit,
        windowMs: window,
        userAgent: c.req.header('User-Agent'),
      };

      logger.warn('Rate limit exceeded', rateLimitInfo);

      // Add retry-after header
      const retryAfter = Math.ceil((data.resetAt - now) / 1000);
      c.header('Retry-After', retryAfter.toString());

      throw new RateLimitError(
        `Too many requests. Try again in ${retryAfter} seconds.`
      );
    }

    // Log high usage (above 80% of limit)
    if (data.count > limit * 0.8) {
      logger.info('High rate limit usage detected', {
        key: key.replace(/:\d+\.\d+\.\d+\.\d+/, ':***'),
        count: data.count,
        limit,
        remaining,
        path: c.req.path,
      });
    }

    // Continue to the next middleware/handler
    await next();
  };
};

/**
 * Default key generator function
 */
function defaultKeyGenerator(c: Context): string {
  // Get identifier for rate limiting (IP address or user ID)
  const identifier = 
    c.req.header('CF-Connecting-IP') ||
    c.get('auth')?.userId ||
    c.req.header('X-Forwarded-For') ||
    c.req.header('X-Real-IP') ||
    'unknown';

  // Create a scoped key based on the path to separate API endpoints
  const pathKey = c.req.path.split('/').slice(0, 4).join('/'); // Include version in path
  return `${identifier}:${pathKey}`;
}

/**
 * Create a rate limiter for authentication endpoints
 */
export const authRateLimit = rateLimit({
  limit: 5, // 5 requests
  window: 15 * 60 * 1000, // per 15 minutes
  keyGenerator: (c) => {
    const ip = c.req.header('CF-Connecting-IP') || 
              c.req.header('X-Forwarded-For') || 
              'unknown';
    return `auth:${ip}`;
  },
});

/**
 * Create a rate limiter for general API endpoints
 */
export const apiRateLimit = rateLimit({
  limit: 100, // 100 requests
  window: 15 * 60 * 1000, // per 15 minutes
  skip: (c) => {
    // Skip rate limiting for health checks
    return c.req.path.startsWith('/health');
  },
});
