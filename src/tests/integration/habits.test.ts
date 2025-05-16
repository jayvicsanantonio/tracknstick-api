// @ts-nocheck
// Add this comment to suppress TypeScript errors during migration to Hono
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestEnv, mockAuthentication, resetMocks } from '../setup.js';
import { habitRoutes } from '../../routes/habits.js';
import { clerkMiddleware } from '../../middlewares/clerkMiddleware.js';

describe('Habits API Integration', () => {
  const { app, env, mockDb, mockResults } = createTestEnv();

  beforeEach(() => {
    resetMocks();
    mockAuthentication();

    // Configure the app with routes and middleware
    app.use('*', (c, next) => {
      // Set the environment bindings
      c.env = env;
      return next();
    });

    // Add authentication middleware
    app.use('*', clerkMiddleware());

    // Add habit routes
    app.route('/', habitRoutes);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /habits', () => {
    it('should return a list of habits', async () => {
      // Set up mock data
      const mockHabits = [
        {
          id: 1,
          user_id: 'test-user-123',
          name: 'Meditate',
          icon: '🧘',
          frequency_type: 'daily',
          frequency_days: null,
          frequency_dates: null,
          start_date: '2023-06-01',
          end_date: null,
          streak: 5,
          best_streak: 10,
          created_at: '2023-06-01T00:00:00Z',
          updated_at: '2023-06-01T00:00:00Z',
        },
      ];

      // Configure the mock D1 to return our test data
      mockResults.results = mockHabits;

      const prepare = mockDb.prepare as vi.Mock;
      prepare.mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue(mockResults),
        run: vi.fn().mockResolvedValue(mockResults),
      });

      // Make the request - today's date should be used as the default
      const req = new Request('http://localhost/habits');
      const res = await app.fetch(req);

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('habits');
      expect(Array.isArray(data.habits)).toBe(true);
    });
  });

  describe('POST /habits', () => {
    it('should create a new habit', async () => {
      // Set up mock data for successful creation
      mockResults.meta.last_row_id = 42;

      // Create the request with habit data
      const habitData = {
        name: 'New Habit',
        icon: '🏃',
        frequency: {
          type: 'weekly',
          days: [1, 3, 5],
        },
        startDate: '2023-06-01',
      };

      const req = new Request('http://localhost/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(habitData),
      });

      const res = await app.fetch(req);

      // Check response
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data).toHaveProperty('id');
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
        },
        body: JSON.stringify(invalidData),
      });

      const res = await app.fetch(req);

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

      // Configure mock to return the habit when queried
      mockResults.results = [habit];

      const prepare = mockDb.prepare as vi.Mock;
      prepare
        .mockReturnValueOnce({
          // For finding the habit
          bind: vi.fn().mockReturnThis(),
          first: vi.fn().mockResolvedValue(habit),
        })
        .mockReturnValueOnce({
          // For deleting the habit
          bind: vi.fn().mockReturnThis(),
          run: vi
            .fn()
            .mockResolvedValue({ success: true, meta: { changes: 1 } }),
        });

      // Make the delete request
      const req = new Request(`http://localhost/habits/${habitId}`, {
        method: 'DELETE',
      });

      const res = await app.fetch(req);

      // Check response
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('message', 'Habit deleted successfully');
    });
  });
});
