import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../../index.js';
import { Hono } from 'hono';
import { createTestEnv, mockAuthentication, resetMocks } from '../setup.js';
import { D1Database } from '@cloudflare/workers-types';

describe('Progress API Integration Tests', () => {
  let testApp: Hono;
  let testDb: D1Database;
  let authHeader: { headers: { Authorization: string } };
  let userId: string;

  // Set up test environment
  beforeAll(async () => {
    const testEnv = createTestEnv();
    testApp = testEnv.app;
    testDb = testEnv.mockDb;
    userId = 'test-user-123';
    authHeader = { headers: { Authorization: 'Bearer test-token' } };

    // Mock authentication
    mockAuthentication(userId);

    // Create some test habits and trackers for testing progress endpoints
    // This setup will vary based on your actual test environment
  });

  // Clean up after tests
  afterAll(async () => {
    resetMocks();
  });

  describe('GET /api/v1/progress/history', () => {
    it('should return progress history data', async () => {
      const response = await testApp.request('/api/v1/progress/history', {
        ...authHeader,
      });

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

      const response = await testApp.request(
        `/api/v1/progress/history?startDate=${startDate}&endDate=${endDate}`,
        {
          ...authHeader,
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('history');
    });

    it('should validate date format', async () => {
      const response = await testApp.request(
        '/api/v1/progress/history?startDate=invalid-date',
        {
          ...authHeader,
        }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/progress/streaks', () => {
    it('should return streak information', async () => {
      const response = await testApp.request('/api/v1/progress/streaks', {
        ...authHeader,
      });

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
      const response = await testApp.request('/api/v1/progress/overview', {
        ...authHeader,
      });

      expect(response.status).toBe(200);
      const data = (await response.json()) as {
        history: Array<{ date: string; completionRate: number }>;
        currentStreak: number;
        longestStreak: number;
      };
      expect(data).toHaveProperty('history');
      expect(data).toHaveProperty('currentStreak');
      expect(data).toHaveProperty('longestStreak');

      expect(Array.isArray(data.history)).toBe(true);
      expect(typeof data.currentStreak).toBe('number');
      expect(typeof data.longestStreak).toBe('number');
    });

    it('should filter overview by date range', async () => {
      // Get data for a specific date range
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';

      const response = await testApp.request(
        `/api/v1/progress/overview?startDate=${startDate}&endDate=${endDate}`,
        {
          ...authHeader,
        }
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as {
        history: Array<{ date: string; completionRate: number }>;
        currentStreak: number;
        longestStreak: number;
      };
      expect(data).toHaveProperty('history');
      expect(data).toHaveProperty('currentStreak');
      expect(data).toHaveProperty('longestStreak');
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all progress endpoints', async () => {
      // Test each endpoint without auth header
      const endpoints = [
        '/api/v1/progress/history',
        '/api/v1/progress/streaks',
        '/api/v1/progress/overview',
      ];

      for (const endpoint of endpoints) {
        const response = await testApp.request(endpoint);
        expect(response.status).toBe(401);
      }
    });
  });
});
