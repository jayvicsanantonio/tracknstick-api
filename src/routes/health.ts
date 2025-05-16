import { Hono } from 'hono';
import { D1Database } from '@cloudflare/workers-types';
import logger from '../utils/logger.js';

type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
  CLERK_SECRET_KEY: string;
};

/**
 * Health check routes for monitoring the API
 */
const app = new Hono<{ Bindings: Bindings }>();

// Simple health check that doesn't require authentication
app.get('/', async (c) => {
  logger.info('Health check requested');
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  });
});

// Database health check - requires authentication
app.get('/db', async (c) => {
  const db = c.env.DB;
  const startTime = Date.now();

  try {
    // Simple query to check database connectivity
    const result = await db.prepare('SELECT 1 as db_check').bind().first();

    const duration = Date.now() - startTime;

    if (!result) {
      logger.error('Database health check failed: No result returned');
      return c.json(
        {
          status: 'error',
          message: 'Database check failed',
          timestamp: new Date().toISOString(),
        },
        500
      );
    }

    logger.info('Database health check successful', {
      duration: `${duration}ms`,
    });

    return c.json({
      status: 'ok',
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
      responseTime: `${duration}ms`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Database health check failed', error as Error);

    return c.json(
      {
        status: 'error',
        message: 'Database connection failed',
        timestamp: new Date().toISOString(),
        responseTime: `${duration}ms`,
      },
      500
    );
  }
});

// Detailed health check that includes version info
app.get('/details', async (c) => {
  const startTime = Date.now();
  const packageInfo = {
    name: 'tracknstick-api',
    version: '2.0.0', // This should be dynamically loaded from package.json in a production app
  };

  // Check database connection
  let dbStatus = 'unknown';
  try {
    await c.env.DB.prepare('SELECT 1').first();
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'error';
    logger.error(
      'Database check failed during detailed health check',
      error as Error
    );
  }

  const duration = Date.now() - startTime;

  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
    version: packageInfo.version,
    uptime: process.uptime(),
    database: {
      status: dbStatus,
    },
    responseTime: `${duration}ms`,
  });
});

export { app as healthRoutes };
