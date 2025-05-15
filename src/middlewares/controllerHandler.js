import { getAuth } from '@hono/clerk-auth';
import logger from '../utils/logger.js';

/**
 * Higher-order function that wraps controller handlers to provide
 * standard error handling, authentication, and logging
 *
 * @param {Function} controllerFn - The controller function to wrap
 * @returns {Function} A Hono middleware function
 */
export const withErrorHandling = (controllerFn) => {
  return async (c) => {
    try {
      return await controllerFn(c);
    } catch (error) {
      logger.error(`Error in controller: ${error.message}`, {
        error,
        path: c.req.path,
        method: c.req.method,
      });

      // Re-throw the error to be handled by the global error handler
      throw error;
    }
  };
};

/**
 * Higher-order function that ensures authentication and adds userId to context
 * before running the controller function
 *
 * @param {Function} controllerFn - The controller function to wrap
 * @returns {Function} A Hono middleware function
 */
export const withAuth = (controllerFn) => {
  return async (c) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      const error = new Error('Authentication required');
      error.statusCode = 401;
      error.status = 'fail';
      error.isOperational = true;
      error.errorCode = 'UNAUTHORIZED';
      throw error;
    }

    // Set auth in context for the controller to use
    c.set('userId', auth.userId);

    return controllerFn(c);
  };
};

/**
 * Combines authentication, error handling, and logging into a single wrapper
 *
 * @param {Function} controllerFn - The controller function to wrap
 * @returns {Function} A Hono middleware function
 */
export const controller = (controllerFn) => {
  return withErrorHandling(withAuth(controllerFn));
};
