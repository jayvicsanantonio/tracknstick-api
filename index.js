import dotenv from 'dotenv';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { secureHeaders } from 'hono/secure-headers';
import { fileURLToPath } from 'url';
import logger from './src/utils/logger.js';
import habitRoutes from './src/api/habits.routes.js';
import errorHandler from './src/middlewares/errorHandler.js';
import dbMiddleware from './src/middlewares/dbMiddleware.js';
import { NotFoundError } from './src/utils/errors/index.js';

dotenv.config();

const app = new Hono();
const port = process.env.PORT || 3000;

// CORS middleware (replaces express CORS)
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';

      // Allow localhost in development
      if (
        process.env.NODE_ENV === 'development' &&
        /^http:\/\/localhost:\d+$/.test(origin)
      ) {
        return origin;
      }

      // Allow tracknstick.com domain
      if (origin.match(/^https?:\/\/(.*\.)?tracknstick\.com$/)) {
        return origin;
      }

      return undefined;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 0,
  })
);

// Security headers (replaces helmet)
app.use('*', secureHeaders());

// Logger middleware
app.use('*', honoLogger());

// Database middleware - adds db to context
app.use('*', dbMiddleware());

// Body parser middleware (built into Hono)
// No need for express.json() or express.urlencoded()

// Mount routes
app.route('/api/v1/habits', habitRoutes);

// 404 handler (catch-all)
app.notFound((c) => {
  const error = new NotFoundError(`Cannot ${c.req.method} ${c.req.path}`);
  return errorHandler(c, error);
});

// Error handler (comes built-in to Hono)
app.onError(errorHandler);

// For Node.js local runtime
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      logger.info(`Server listening on port ${info.port}`);
    }
  );
}

// Export the app for Cloudflare Workers
export default app;
