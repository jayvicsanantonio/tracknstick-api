// @ts-nocheck
// Add this comment to suppress TypeScript errors during migration to Hono
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestEnv, mockAuthentication, resetMocks } from '../setup.js';
import { habitRoutes } from '../../routes/habits.js';
import { errorHandlerEnhanced } from '../../middlewares/errorHandlerEnhanced.js';

describe('Habits API Integration', () => {
  let app: any;
  let env: any;
  let mockDb: any;
  let mockResults: any;

  beforeEach(() => {
    resetMocks();
    mockAuthentication();

    const testEnv = createTestEnv();
    app = testEnv.app;
    env = testEnv.env;
    mockDb = testEnv.mockDb;
    mockResults = testEnv.mockResults;

    // Add habit routes
    app.route('/habits', habitRoutes);

    // Global error handler
    app.onError(errorHandlerEnhanced);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /habits', () => {
    it('should return a list of habits', async () => {
      // Set up mock data
      const habit = {
        id: 1,
        user_id: 'test-user-123',
        name: 'Test Habit',
        icon: '🏃',
        frequency: 'Mon,Wed,Fri',
        start_date: '2023-01-01T00:00:00Z',
        streak: 5,
      };

      // Configure mock results
      mockResults.results = [habit];

      // Make the request
      const req = new Request('http://localhost/habits', {
        headers: {
          Authorization: 'Bearer test-token',
        },
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);
      expect(data[0]).toHaveProperty('name', 'Test Habit');
    });
  });

  describe('POST /habits', () => {
    it('should create a new habit', async () => {
      // Set up mock data for successful creation
      mockResults.meta.last_row_id = 42;
      mockResults.success = true;

      // Create the request with habit data
      const habitData = {
        name: 'New Habit',
        icon: '🏃',
        frequency: ['Mon', 'Wed', 'Fri'],
        startDate: '2023-01-01T00:00:00Z',
      };

      const req = new Request('http://localhost/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify(habitData),
      });

      const res = await app.fetch(req, env);

      // Check response
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data).toHaveProperty('habitId', '42');
      expect(data).toHaveProperty('message', 'Habit created successfully');
    });

    it('should validate the request body', async () => {
      // Create request with invalid data (missing required name)
      const invalidData = {
        icon: '🏃',
      };

      const req = new Request('http://localhost/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify(invalidData),
      });

      const res = await app.fetch(req, env);

      // Check response
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('code', 'validation_error');
    });
  });

  describe('DELETE /habits/:habitId', () => {
    it('should delete a habit', async () => {
      // Set up mock data for the habit to be deleted
      const habitId = 1;
      const habit = {
        id: habitId,
        user_id: 'test-user-123',
        name: 'Delete Me',
      };

      // Configure mock results
      // First call (getHabitById) will return this habit
      mockResults.results = [habit];
      mockResults.success = true;
      mockResults.meta.changes = 1;

      // Make the delete request
      const req = new Request(`http://localhost/habits/${habitId}`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer test-token',
        },
      });

      const res = await app.fetch(req, env);

      // Check response
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('message', 'Habit deleted successfully');
    });
  });
});
