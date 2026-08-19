// Verifies progress routes surface errors through the app-wide handler
// Previously a private handleError forced every failure to 500

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestEnv, mockAuthentication, resetMocks } from '../setup.js';
import progressRoutes from '../../routes/progress.js';
import { errorHandlerEnhanced } from '../../middlewares/errorHandlerEnhanced.js';
import * as progressService from '../../services/progress.service.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

describe('Progress error envelope', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let testEnv: any;
  const authHeader = { headers: { Authorization: 'Bearer test-token' } };

  beforeEach(() => {
    resetMocks();
    mockAuthentication('test-user-123');
    testEnv = createTestEnv();
    app = testEnv.app;
    app.route('/api/v1/progress', progressRoutes);
    app.onError(errorHandlerEnhanced);
  });

  afterEach(() => {
    resetMocks();
    vi.restoreAllMocks();
  });

  it('propagates a NotFoundError as 404, not 500', async () => {
    vi.spyOn(progressService, 'getUserStreaks').mockRejectedValue(
      new NotFoundError('no such thing')
    );

    const res = await app.request(
      '/api/v1/progress/streaks',
      authHeader,
      testEnv.env
    );

    expect(res.status).toBe(404);
  });

  it('propagates a ValidationError as 400, not 500', async () => {
    vi.spyOn(progressService, 'getUserProgressHistory').mockRejectedValue(
      new ValidationError('bad input')
    );

    const res = await app.request(
      '/api/v1/progress/history',
      authHeader,
      testEnv.env
    );

    expect(res.status).toBe(400);
  });

  it('uses the app-wide error envelope, not a bare string', async () => {
    vi.spyOn(progressService, 'getUserStreaks').mockRejectedValue(
      new NotFoundError('no such thing')
    );

    const res = await app.request(
      '/api/v1/progress/streaks',
      authHeader,
      testEnv.env
    );
    const body = (await res.json()) as { error: { code?: string } };

    expect(typeof body.error).toBe('object');
    expect(body.error.code).toBe('not_found');
  });
});
