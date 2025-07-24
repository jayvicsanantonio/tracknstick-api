import { Context, MiddlewareHandler, Next } from 'hono';
import { validateConfig, Config } from '../utils/config.js';
import logger from '../utils/logger.js';

/**
 * Middleware to validate configuration and add it to context
 */
export const configValidator = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    try {
      const config = validateConfig(c.env);
      c.set('config', config);
      await next();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Configuration validation failed', err);
      throw err;
    }
  };
};