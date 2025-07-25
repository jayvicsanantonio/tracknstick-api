import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { D1Database } from '@cloudflare/workers-types';
import './types/context.js'; // Import context type definitions
import { habitRoutes } from './routes/habits.js';
import { healthRoutes } from './routes/health.js';
import progressRoutes from './routes/progress.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { initBindings } from './middlewares/initBindings.js';
import { configValidator } from './middlewares/configValidator.js';
import { sanitizeInput } from './middlewares/sanitizeInput.js';
import { apiRateLimit } from './middlewares/rateLimit.js';
import { securityHeaders } from './middlewares/securityHeaders.js';
import { performanceMonitor } from './middlewares/performanceMonitor.js';
import logger from './utils/logger.js';

// Define environment variable types for TypeScript
type Bindings = {
  ENVIRONMENT: string;
  CLERK_SECRET_KEY: string;
  DB: D1Database;
};

// Create the main Hono app
const app = new Hono<{ Bindings: Bindings }>();

// Apply global middlewares in order of importance
app.use('*', requestLogger());
app.use('*', configValidator()); // Validate configuration early
app.use('*', performanceMonitor({ slowRequestThreshold: 500 })); // Monitor performance
app.use('*', securityHeaders()); // Apply comprehensive security headers
app.use('*', initBindings()); // Initialize bindings middleware
app.use('*', sanitizeInput()); // Sanitize user inputs

// CORS configuration
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow specific origins based on environment
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000', 
        'https://tracknstick.com',
        'https://www.tracknstick.com'
      ];
      
      // In development, allow any localhost origin
      if (process.env.NODE_ENV === 'development' && origin?.includes('localhost')) {
        return origin;
      }
      
      return allowedOrigins.includes(origin || '') ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    exposeHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining', 
      'X-RateLimit-Reset',
      'X-RateLimit-Window'
    ],
    maxAge: 86400, // 24 hours
    credentials: true,
  })
);

// Apply rate limiting to API routes only
app.use('/api/*', apiRateLimit);

// Log application startup
app.use('*', async (c, next) => {
  const config = c.get('config');
  logger.info(`Application starting in ${config.ENVIRONMENT} environment`);
  await next();
});

// Set up API routes
app.route('/api/v1/habits', habitRoutes);
app.route('/api/v1/progress', progressRoutes);

// Health check routes - no authentication required
app.route('/health', healthRoutes);

// Root endpoint for basic API information
app.get('/', (c) => {
  return c.json({
    name: 'TrackNStick API',
    version: '1.0.0',
    status: 'healthy',
    environment: c.get('config').ENVIRONMENT,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api/v1',
      habits: '/api/v1/habits',
      progress: '/api/v1/progress',
    },
  });
});

// 404 handler for unmatched routes
app.notFound((c) => {
  const { pathname } = new URL(c.req.url);
  const { method } = c.req;
  
  logger.warn(`Route not found: ${method} ${pathname}`, {
    method,
    path: pathname,
    userAgent: c.req.header('User-Agent'),
    ip: c.req.header('CF-Connecting-IP'),
  });

  return c.json(
    {
      error: {
        message: `Cannot ${method} ${pathname}`,
        code: 'not_found',
        suggestion: 'Check the API documentation for available endpoints',
      },
    },
    404
  );
});

// Global error handler
app.onError(errorHandler);

// Export the app for the worker runtime
export default app;
