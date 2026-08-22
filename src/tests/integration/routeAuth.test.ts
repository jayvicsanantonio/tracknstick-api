// Pins the auth posture of every mounted route
// The achievements sub-app previously exempted a route by path suffix

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createTestEnv, resetMocks } from '../setup.js';
import { achievementRoutes } from '../../routes/achievements.js';
import progressRoutes from '../../routes/progress.js';
import { errorHandlerEnhanced } from '../../middlewares/errorHandlerEnhanced.js';

describe('route auth posture', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let testEnv: any;

  beforeEach(() => {
    resetMocks();
    testEnv = createTestEnv();
    app = new Hono();
    app.route('/api/v1/achievements', achievementRoutes);
    app.route('/api/v1/progress', progressRoutes);
    app.onError(errorHandlerEnhanced);
  });

  it.each([
    ['GET', '/api/v1/achievements'],
    ['GET', '/api/v1/achievements/earned'],
    ['GET', '/api/v1/achievements/stats'],
    ['POST', '/api/v1/achievements/check'],
    ['GET', '/api/v1/progress/history'],
    ['GET', '/api/v1/progress/streaks'],
    ['GET', '/api/v1/progress/overview'],
    // Seeding the catalogue is a write to state every user shares.
    ['POST', '/api/v1/achievements/initialize'],
  ])('%s %s rejects an unauthenticated request', async (method, path) => {
    const res = await app.request(path, { method }, testEnv.env);
    expect(res.status).toBe(401);
  });
})
