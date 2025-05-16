import { Context, MiddlewareHandler, Next } from 'hono';
import logger from '../utils/logger.js';

/**
 * Custom request logging middleware
 * Logs the request method, path, status code, and duration
 */
export const requestLogger =
  (): MiddlewareHandler => async (c: Context, next: Next) => {
    // Generate a unique ID for the request
    const requestId = crypto.randomUUID();

    // Get request information
    const { method, path } = c.req;

    // Create a request-specific logger with the request ID
    const requestLogger = logger.child('request', { requestId, method, path });

    // Log the request start
    const startTime = Date.now();
    requestLogger.info(`${method} ${path} started`);

    try {
      // Add the request ID and logger to the context for use in handlers
      c.set('requestId', requestId);
      c.set('logger', requestLogger);

      // Process the request
      await next();

      // Calculate request duration
      const duration = Date.now() - startTime;

      // Log successful response
      requestLogger.info(`${method} ${path} completed`, {
        status: c.res.status,
        duration: `${duration}ms`,
      });
    } catch (error) {
      // Calculate request duration
      const duration = Date.now() - startTime;

      // Log error response
      requestLogger.error(`${method} ${path} failed`, error as Error, {
        duration: `${duration}ms`,
      });

      // Re-throw the error to be handled by the error handler
      throw error;
    }
  };
