import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { D1Database } from '@cloudflare/workers-types';
import { habitRoutes } from './routes/habits.js';
import { healthRoutes } from './routes/health.js';
import progressRoutes from './routes/progress.js';
import { achievementRoutes } from './routes/achievements.js';
import { errorHandlerEnhanced } from './middlewares/errorHandlerEnhanced.js';
import { createRateLimit } from './middlewares/rateLimitEnhanced.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { initBindings } from './middlewares/initBindings.js';
import { getSecurityConfig } from './config/security.js';
import { withFailureHandling, withRateLimitFailureHandling } from './middlewares/middlewareFailureHandler.js';
import logger from './utils/logger.js';

// Define environment variable types for TypeScript
type Bindings = {
  ENVIRONMENT: string;
  CLERK_SECRET_KEY: string;
  DB: D1Database;
};

// Create the main Hono app
const app = new Hono<{ Bindings: Bindings }>();

// Apply global middlewares in security-optimized order
// 1. Request logging - Track all incoming requests
app.use('*', requestLogger());

// 2. Initialize bindings early for configuration access
app.use('*', initBindings());

// 3. Rate limiting - Block excessive requests before processing (with failure handling)
app.use('*', withRateLimitFailureHandling(createRateLimit()));

// 4. CORS - Handle cross-origin requests with environment-aware configuration (with failure handling)
app.use('*', withFailureHandling('cors_middleware', async (c, next) => {
  const config = getSecurityConfig();
  return cors({
    origin: config.cors.origins,
    allowMethods: config.cors.methods,
    allowHeaders: config.cors.allowedHeaders,
    credentials: config.cors.credentials,
    maxAge: 86400,
  })(c, next);
}));

// 5. Security headers - Set security headers based on environment (with failure handling)
app.use('*', withFailureHandling('security_headers', async (c, next) => {
  const config = getSecurityConfig();
  
  // Apply environment-specific security headers
  if (config.headers.enableHsts) {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  if (config.headers.enableContentTypeOptions) {
    c.header('X-Content-Type-Options', 'nosniff');
  }
  
  if (config.headers.enableFrameOptions) {
    c.header('X-Frame-Options', 'DENY');
  }
  
  if (config.headers.enableXssProtection) {
    c.header('X-XSS-Protection', '1; mode=block');
  }
  
  // Add security policy headers
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  await next();
}));

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

// Global error handler - Enhanced with environment awareness
app.onError(errorHandlerEnhanced);

// Export the app for the worker runtime
export default app;
