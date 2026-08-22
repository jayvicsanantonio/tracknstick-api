import { Hono } from 'hono';
import { D1Database } from '@cloudflare/workers-types';
import logger from '../utils/logger.js';

type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
  CLERK_SECRET_KEY: string;
};

type ComponentStatus =
  | { status: 'ok'; responseTime: string }
  | { status: 'error'; responseTime: string; message: string };

/**
 * Health check routes for monitoring the API
 * These routes are intentionally unauthenticated.
 */
const app = new Hono<{ Bindings: Bindings }>();

/**
 * Single owner for "is the database reachable". Both /db and /details
 * derive their status from this rather than each deciding separately.
 */
async function checkDatabase(db: D1Database): Promise<ComponentStatus> {
  const startTime = Date.now();

  try {
    const result = await db.prepare('SELECT 1 as db_check').bind().first();
    const responseTime = `${Date.now() - startTime}ms`;

    if (!result) {
      logger.error('Database health check failed: no result returned');
      return {
        status: 'error',
        responseTime,
        message: 'Database check returned no result',
      };
    }

    return { status: 'ok', responseTime };
  } catch (error) {
    logger.error('Database health check failed', error as Error);
    return {
      status: 'error',
      responseTime: `${Date.now() - startTime}ms`,
      message: 'Database connection failed',
    };
  }
}

// Liveness check - does not touch the database
app.get('/', async (c) => {
  logger.info('Health check requested');
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  });
});

// Database readiness check
// Response shape and status codes are unchanged from before the
// checkDatabase extraction, so existing monitors keep working.
app.get('/db', async (c) => {
  const database = await checkDatabase(c.env.DB);

  if (database.status === 'error') {
    return c.json(
      {
        status: 'error',
        message: 'Database check failed',
        timestamp: new Date().toISOString(),
        responseTime: database.responseTime,
      },
      500
    );
  }

  return c.json({
    status: 'ok',
    message: 'Database connection successful',
    timestamp: new Date().toISOString(),
    responseTime: database.responseTime,
  });
});

// Detailed check including component status
app.get('/details', async (c) => {
  const database = await checkDatabase(c.env.DB);

  return c.json(
    {
      // Derived from the components, not asserted independently of them
      status: database.status,
      timestamp: new Date().toISOString(),
      environment: c.env.ENVIRONMENT,
      responseTime: database.responseTime,
      components: { database },
    },
    database.status === 'ok' ? 200 : 503
  );
});

export { app as healthRoutes };
