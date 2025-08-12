import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { D1Database } from '@cloudflare/workers-types';
import { habitRoutes } from './routes/habits.js';
import { healthRoutes } from './routes/health.js';
import progressRoutes from './routes/progress.js';
import { achievementRoutes } from './routes/achievements.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { initBindings } from './middlewares/initBindings.js';
import logger from './utils/logger.js';

// Define environment variable types for TypeScript
type Bindings = {
  ENVIRONMENT: string;
  CLERK_SECRET_KEY: string;
  DB: D1Database;
};

// Create the main Hono app
const app = new Hono<{ Bindings: Bindings }>();

// Apply global middlewares
app.use('*', requestLogger());
app.use('*', secureHeaders());
app.use('*', initBindings()); // Initialize bindings middleware
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'https://tracknstick.com'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// Log application startup
app.use('*', async (c, next) => {
  logger.info(`Application starting in ${c.env.ENVIRONMENT} environment`);
  await next();
});

// Set up API routes
app.route('/api/v1/habits', habitRoutes);
app.route('/api/v1/progress', progressRoutes);
app.route('/api/v1/achievements', achievementRoutes);

// Health check routes - no authentication required
app.route('/health', healthRoutes);

// 404 handler for unmatched routes
app.notFound((c) => {
  const { path } = c.req;
  const { method } = c.req;
  logger.warn(`Route not found: ${method} ${path}`);

  return c.json(
    {
      error: {
        message: `Cannot ${method} ${path}`,
        code: 'not_found',
      },
    },
    404
  );
});

// Global error handler
app.onError(errorHandler);

// Export the app for the worker runtime
export default app;
