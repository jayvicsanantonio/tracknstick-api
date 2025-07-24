import { Context, MiddlewareHandler, Next } from 'hono';
import { sanitizeObject } from '../utils/sanitizer.js';
import logger from '../utils/logger.js';

/**
 * Middleware to sanitize user input to prevent XSS and injection attacks
 */
export const sanitizeInput = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    try {
      // Sanitize JSON body if present
      const originalJson = c.req.json;
      c.req.json = async <T = any>(): Promise<T> => {
        const data = await originalJson.call(c.req);
        if (data && typeof data === 'object') {
          const sanitized = sanitizeObject(data);
          logger.debug('Input sanitized', { 
            originalKeys: Object.keys(data),
            sanitizedKeys: Object.keys(sanitized)
          });
          return sanitized as T;
        }
        return data as T;
      };

      await next();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error in input sanitization middleware', err);
      throw err;
    }
  };
};