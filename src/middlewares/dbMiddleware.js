import { createDbInstance } from '../utils/dbAdapter.js';
import logger from '../utils/logger.js';

/**
 * Middleware that adds a database adapter to the Hono context
 * Works with both SQLite3 (local development) and D1 (Cloudflare Workers)
 */
const dbMiddleware = () => {
  return async (c, next) => {
    try {
      // Create a database instance and attach it to the context
      const db = createDbInstance(c.env);
      c.set('db', db);
      
      // Continue to the next middleware/handler
      await next();
    } catch (error) {
      logger.error('Database middleware error:', { error });
      throw error;
    }
  };
};

export default dbMiddleware;
