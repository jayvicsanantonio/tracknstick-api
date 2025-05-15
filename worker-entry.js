/**
 * Cloudflare Workers entry point
 * This file is separate from index.js to avoid importing SQLite3 in the Workers environment
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import logger from './src/utils/logger.js';
import habitRoutes from './src/api/habits.routes.js';
import errorHandler from './src/middlewares/errorHandler.js';
import { NotFoundError } from './src/utils/errors/index.js';

// Create the Hono app
const app = new Hono();

// CORS middleware
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (
        process.env.NODE_ENV === 'development' &&
        /^http:\/\/localhost:\d+$/.test(origin)
      ) {
        return origin;
      }
      return undefined;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
  })
);

// Security headers
app.use('*', secureHeaders());

// Logger middleware
app.use('*', honoLogger());

// Database middleware - handled directly by D1 binding
app.use('*', async (c, next) => {
  // Make D1 database available to handlers via c.get('db')
  c.set('db', c.env.DB);
  await next();
});

// Mount routes
app.route('/api/v1/habits', habitRoutes);

// 404 handler (catch-all)
app.notFound((c) => {
  const error = new NotFoundError(`Cannot ${c.req.method} ${c.req.path}`);
  return errorHandler(c, error);
});

// Error handler
app.onError(errorHandler);

export default app;
