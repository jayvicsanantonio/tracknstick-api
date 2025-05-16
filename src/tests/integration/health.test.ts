// @ts-nocheck
// Add this comment to suppress TypeScript errors during migration to Hono
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestEnv, resetMocks } from '../setup.js';
import { healthRoutes } from '../../routes/health.js';

describe('Health API Integration', () => {
  const { app, env, mockDb, mockResults } = createTestEnv();

  beforeEach(() => {
    resetMocks();

    // Configure the app with environment and routes
    app.use('*', (c, next) => {
      c.env = env;
      return next();
    });

    // Add health routes
    app.route('/', healthRoutes);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /health', () => {
    it('should return a 200 OK response', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.fetch(req);

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('environment', 'test');
    });
  });

  describe('GET /health/db', () => {
    it('should return OK when the database check passes', async () => {
      // Mock a successful DB connection
      mockResults.results = [{ db_check: 1 }];

      const prepare = mockDb.prepare as vi.Mock;
      prepare.mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ db_check: 1 }),
      });

      const req = new Request('http://localhost/health/db');
      const res = await app.fetch(req);

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('message', 'Database connection successful');
      expect(data).toHaveProperty('responseTime');
    });

    it('should return error status when the database check fails', async () => {
      // Mock a failed DB connection
      const prepare = mockDb.prepare as vi.Mock;
      prepare.mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      });

      const req = new Request('http://localhost/health/db');
      const res = await app.fetch(req);

      expect(res.status).toBe(500);

      const data = await res.json();
      expect(data).toHaveProperty('status', 'error');
      expect(data).toHaveProperty('message', 'Database check failed');
    });
  });

  describe('GET /health/details', () => {
    it('should return detailed health information', async () => {
      // Mock a successful DB connection for details
      const prepare = mockDb.prepare as vi.Mock;
      prepare.mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ result: 1 }),
      });

      const req = new Request('http://localhost/health/details');
      const res = await app.fetch(req);

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('environment', 'test');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('database.status', 'connected');
      expect(data).toHaveProperty('responseTime');
    });
  });
});
