import { Context, MiddlewareHandler, Next } from 'hono';

/**
 * Middleware to initialize bindings for the application
 * This ensures KV namespaces and other bindings are properly set up
 */
export const initBindings =
  (): MiddlewareHandler => async (c: Context, next: Next) => {
    // Initialize any bindings here when needed in the future

    // Continue processing the request
    await next();
  };
