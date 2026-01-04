// @ts-nocheck
// Add this comment to suppress TypeScript errors during migration to Hono
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Context } from 'hono';
import * as habitService from '../../services/habit.service.js';
import * as habitController from '../habit.controller.js';

// Mock the services
vi.mock('../../services/habit.service.js', () => ({
  getAllHabits: vi.fn(),
  getHabitsForDate: vi.fn(),
  createHabit: vi.fn(),
  updateHabit: vi.fn(),
  deleteHabit: vi.fn(),
  restoreHabit: vi.fn(),
  getTrackersForHabit: vi.fn(),
  manageTracker: vi.fn(),
  getHabitStats: vi.fn(),
  getProgressOverview: vi.fn(),
}));

describe('Habit Controller', () => {
  let mockContext: Partial<Context>;
  let mockDB: any;
  let mockClerkUserId: string;

  beforeEach(() => {
    mockDB = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ success: true, results: [] }),
        run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      }),
    };
    mockClerkUserId = 'clerk_user_123';

    // Reset mock calls
    vi.resetAllMocks();

    // Setup mock context
    mockContext = {
      env: { DB: mockDB },
      get: vi.fn((key: string) => {
        if (key === 'userId') return mockClerkUserId;
        if (key === 'auth') return { userId: mockClerkUserId };
        if (key === 'validated_query') return mockContext.queryData || {};
        if (key === 'validated_json') return mockContext.jsonData || {};
        if (key === 'validated_param') return mockContext.paramData || {};
        return undefined;
      }),
      json: vi.fn(),
    };
  });

  describe('getHabits', () => {
    it('should return habits for the given date', async () => {
      const mockHabits = [
        { id: 1, name: 'Exercise', user_id: mockClerkUserId },
        { id: 2, name: 'Read', user_id: mockClerkUserId },
      ];

      mockContext.queryData = { date: '2023-01-01', timeZone: 'UTC' };
      vi.mocked(habitService.getHabitsForDate).mockResolvedValue(mockHabits);

      await habitController.getHabits(mockContext as Context);

      expect(habitService.getHabitsForDate).toHaveBeenCalledWith(
        mockClerkUserId,
        '2023-01-01',
        'UTC',
        mockDB
      );

      expect(mockContext.json).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'Exercise' }),
        expect.objectContaining({ name: 'Read' }),
      ]);
    });

    it('should return all habits if no date provided', async () => {
      const mockHabits = [
        { id: 1, name: 'Exercise', user_id: mockClerkUserId },
      ];

      mockContext.queryData = {};
      vi.mocked(habitService.getAllHabits).mockResolvedValue(mockHabits);

      await habitController.getHabits(mockContext as Context);

      expect(habitService.getAllHabits).toHaveBeenCalledWith(
        mockClerkUserId,
        mockDB
      );
    });
  });

  describe('createHabit', () => {
    it('should create a new habit', async () => {
      const habitData = {
        name: 'Meditate',
        icon: '🧘',
        frequency: ['daily'],
        startDate: '2023-01-01',
      };

      mockContext.jsonData = habitData;
      vi.mocked(habitService.createHabit).mockResolvedValue({ habitId: 1 });

      await habitController.createHabit(mockContext as Context);

      expect(habitService.createHabit).toHaveBeenCalledWith(
        mockClerkUserId,
        habitData,
        mockDB
      );

      expect(mockContext.json).toHaveBeenCalledWith(
        { habitId: 1, message: 'Habit created successfully' },
        201
      );
    });
  });

  describe('updateHabit', () => {
    it('should update an existing habit', async () => {
      const habitId = '1';
      const habitData = {
        name: 'Exercise More',
        icon: '🏋️',
      };

      mockContext.jsonData = habitData;
      mockContext.paramData = { habitId };

      await habitController.updateHabit(mockContext as Context);

      expect(habitService.updateHabit).toHaveBeenCalledWith(
        mockClerkUserId,
        habitId,
        habitData,
        mockDB
      );

      expect(mockContext.json).toHaveBeenCalledWith({
        message: 'Habit updated successfully',
      });
    });
  });

  describe('deleteHabit', () => {
    it('should delete a habit', async () => {
      const habitId = '1';

      mockContext.paramData = { habitId };

      await habitController.deleteHabit(mockContext as Context);

      expect(habitService.deleteHabit).toHaveBeenCalledWith(
        mockClerkUserId,
        habitId,
        mockDB
      );

      expect(mockContext.json).toHaveBeenCalledWith({
        message: 'Habit deleted successfully',
      });
    });
  });

  describe('manageTracker', () => {
    it('should add a tracker for a habit', async () => {
      const habitId = '1';
      const requestData = {
        timestamp: '2023-06-15T10:00:00Z',
        timeZone: 'UTC',
        notes: 'Great session',
      };

      mockContext.jsonData = requestData;
      mockContext.paramData = { habitId };

      vi.mocked(habitService.manageTracker).mockResolvedValue({
        status: 'added',
        trackerId: 1,
        message: 'Tracker added',
      });

      await habitController.manageTracker(mockContext as Context);

      expect(habitService.manageTracker).toHaveBeenCalledWith(
        mockClerkUserId,
        habitId,
        requestData.timestamp,
        requestData.timeZone,
        requestData.notes,
        mockDB
      );

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          trackerId: 1,
          message: 'Tracker added',
        },
        201
      );
    });
  });
});
