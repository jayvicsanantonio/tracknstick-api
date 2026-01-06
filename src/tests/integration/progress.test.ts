// @ts-nocheck
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestEnv, mockAuthentication, resetMocks } from '../setup.js';
import progressRoutes from '../../routes/progress.js';
import { clerkMiddleware } from '../../middlewares/clerkMiddleware.js';
import { errorHandlerEnhanced } from '../../middlewares/errorHandlerEnhanced.js';

describe('Progress API Integration Tests', () => {
  let app: any;
  let testDb: any;
  let authHeader: { headers: { Authorization: string } };
  let testEnv: any;
  let userId: string;

  // Set up test environment
  beforeEach(async () => {
    resetMocks();
    mockAuthentication(); // Mock authentication without a specific user initially

    testEnv = createTestEnv();
    app = testEnv.app;
    testDb = testEnv.mockDb; // Keep this line from original
    userId = 'test-user-123'; // Keep this line from original
    authHeader = { headers: { Authorization: 'Bearer test-token' } }; // Keep this line from original

    // Re-mock authentication with specific user after env is set up, if needed for the test
    // The original mockAuthentication(userId) was here, but the new snippet implies it's done earlier.
    // Let's assume the initial mockAuthentication() is sufficient for the setup,
    // and specific user mocking happens later if needed, or the global mockAuthentication needs to be updated.
    // For now, I'll keep the original mockAuthentication(userId) as it seems more specific.
    mockAuthentication(userId);

    // Add progress routes
    app.route('/api/v1/progress', progressRoutes);

    // Global error handler
    app.onError(errorHandlerEnhanced);
  });

  // Clean up after tests
  afterEach(async () => {
    resetMocks();
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/progress/history', () => {
    it('should return progress history data', async () => {
      const response = await app.request(
        '/api/v1/progress/history',
        {
          ...authHeader,
        },
        testEnv.env
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as {
        history: Array<{ date: string; completionRate: number }>;
      };
      expect(data).toHaveProperty('history');
      expect(Array.isArray(data.history)).toBe(true);

      // If any entries are returned, verify their structure
      if (data.history.length > 0) {
        expect(data.history[0]).toHaveProperty('date');
        expect(data.history[0]).toHaveProperty('completionRate');
        expect(typeof data.history[0].completionRate).toBe('number');
      }
    });

    it('should filter history by date range', async () => {
      // Get data for a specific date range
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';

      const response = await app.request(
        `/api/v1/progress/history?startDate=${startDate}&endDate=${endDate}`,
        {
          ...authHeader,
        },
        testEnv.env
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('history');
    });

    it('should validate date format', async () => {
      const response = await app.request(
        '/api/v1/progress/history?startDate=invalid-date',
        {
          ...authHeader,
        },
        testEnv.env
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/progress/streaks', () => {
    it('should return streak information', async () => {
      const response = await app.request(
        '/api/v1/progress/streaks',
        {
          ...authHeader,
        },
        testEnv.env
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as {
        currentStreak: number;
        longestStreak: number;
      };
      expect(data).toHaveProperty('currentStreak');
      expect(data).toHaveProperty('longestStreak');
      expect(typeof data.currentStreak).toBe('number');
      expect(typeof data.longestStreak).toBe('number');
    });
  });

  describe('GET /api/v1/progress/overview', () => {
    it('should return combined history and streak data', async () => {
      const response = await app.request(
        '/api/v1/progress/overview',
        {
          ...authHeader,
        },
        testEnv.env
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        data: {
          history: Array<{ date: string; completionRate: number }>;
          currentStreak: number;
          longestStreak: number;
        };
        meta: {
          timestamp: string;
          timeZone: string;
        };
      };

      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');

      const { data, meta } = body;

      expect(data).toHaveProperty('history');
      expect(data).toHaveProperty('currentStreak');
      expect(data).toHaveProperty('longestStreak');

      expect(meta).toHaveProperty('timestamp');
      expect(meta).toHaveProperty('timeZone');

      expect(Array.isArray(data.history)).toBe(true);
      expect(typeof data.currentStreak).toBe('number');
      expect(typeof data.longestStreak).toBe('number');
    });

    it('should filter overview by date range', async () => {
      // Get data for a specific date range
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';

      const response = await app.request(
        `/api/v1/progress/overview?startDate=${startDate}&endDate=${endDate}`,
        {
          ...authHeader,
        },
        testEnv.env
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        data: {
          history: Array<{ date: string; completionRate: number }>;
          currentStreak: number;
          longestStreak: number;
        };
      };
      expect(body.data).toHaveProperty('history');
      expect(body.data).toHaveProperty('currentStreak');
      expect(body.data).toHaveProperty('longestStreak');
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all progress endpoints', async () => {
      // Mock unauthenticated state
      mockAuthentication(undefined, false);

      // Test each endpoint without auth header
      const endpoints = [
        '/api/v1/progress/history',
        '/api/v1/progress/streaks',
        '/api/v1/progress/overview',
      ];

      for (const endpoint of endpoints) {
        const response = await app.request(endpoint, undefined, testEnv.env);
        expect(response.status).toBe(401);
      }
    });
  });
});
