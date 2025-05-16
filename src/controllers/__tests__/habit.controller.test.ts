// @ts-nocheck
// Add this comment to suppress TypeScript errors during migration to Hono
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Context } from 'hono';
import * as habitRepository from '../../repositories/habit.repository.js';
import * as habitController from '../habit.controller.js';

// Mock the repositories
vi.mock('../../repositories/habit.repository.js', () => ({
  getHabitsByDate: vi.fn(),
  createHabit: vi.fn(),
  getHabitById: vi.fn(),
  updateHabit: vi.fn(),
  deleteHabit: vi.fn(),
  getTrackers: vi.fn(),
  manageTracker: vi.fn(),
  getHabitStats: vi.fn(),
}));

describe('Habit Controller', () => {
  let mockContext: Partial<Context>;
  let mockDB: any;
  let mockClerkUserId: string;

  beforeEach(() => {
    mockDB = {};
    mockClerkUserId = 'clerk_user_123';

    // Reset mock calls
    vi.resetAllMocks();

    // Setup mock context
    mockContext = {
      env: { DB: mockDB },
      get: vi.fn((key: string) => {
        if (key === 'userId') return mockClerkUserId;
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

      vi.mocked(habitRepository.getHabitsByDate).mockResolvedValue(mockHabits);

      await habitController.getHabits(mockContext as Context);

      expect(habitRepository.getHabitsByDate).toHaveBeenCalledWith(
        mockDB,
        mockClerkUserId,
        expect.any(String)
      );

      expect(mockContext.json).toHaveBeenCalledWith({
        habits: mockHabits,
      });
    });
  });

  describe('createHabit', () => {
    it('should create a new habit', async () => {
      const habitData = {
        name: 'Meditate',
        icon: '🧘',
        frequency: { type: 'daily' },
        startDate: '2023-01-01',
      };

      mockContext.req = {
        valid: vi.fn().mockReturnValue(habitData),
      } as any;

      vi.mocked(habitRepository.createHabit).mockResolvedValue({ habitId: 1 });

      await habitController.createHabit(mockContext as Context);

      expect(habitRepository.createHabit).toHaveBeenCalledWith(
        mockDB,
        mockClerkUserId,
        habitData
      );

      expect(mockContext.json).toHaveBeenCalledWith(
        { id: 1, message: 'Habit created successfully' },
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

      mockContext.req = {
        valid: vi.fn().mockReturnValue(habitData),
        param: vi.fn().mockReturnValue(habitId),
      } as any;

      await habitController.updateHabit(mockContext as Context);

      expect(habitRepository.updateHabit).toHaveBeenCalledWith(
        mockDB,
        mockClerkUserId,
        habitId,
        habitData
      );

      expect(mockContext.json).toHaveBeenCalledWith({
        message: 'Habit updated successfully',
      });
    });
  });

  describe('deleteHabit', () => {
    it('should delete a habit', async () => {
      const habitId = '1';

      mockContext.req = {
        param: vi.fn().mockReturnValue(habitId),
      } as any;

      await habitController.deleteHabit(mockContext as Context);

      expect(habitRepository.deleteHabit).toHaveBeenCalledWith(
        mockDB,
        mockClerkUserId,
        habitId
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
        date: '2023-06-15',
        notes: 'Great session',
      };

      mockContext.req = {
        valid: vi.fn().mockReturnValue(requestData),
        param: vi.fn().mockReturnValue(habitId),
      } as any;

      vi.mocked(habitRepository.manageTracker).mockResolvedValue({
        status: 'added',
        trackerId: 1,
        message: 'Tracker added',
      });

      await habitController.manageTracker(mockContext as Context);

      expect(habitRepository.manageTracker).toHaveBeenCalledWith(
        mockDB,
        mockClerkUserId,
        habitId,
        expect.any(String),
        requestData.notes
      );

      expect(mockContext.json).toHaveBeenCalledWith({
        status: 'added',
        trackerId: 1,
        message: 'Tracker added',
      });
    });
  });
});
