// @ts-nocheck
// Add this comment to suppress TypeScript errors during migration to Hono

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { D1Database } from '@cloudflare/workers-types';
import * as trackerRepository from '../tracker.repository.js';

// Mock D1 database functions
const mockD1Result = {
  results: [],
  success: true,
  meta: { changes: 0, last_row_id: 0 },
};

const mockD1Prepare = vi.fn().mockReturnValue({
  bind: vi.fn().mockReturnThis(),
  first: vi.fn().mockResolvedValue(null),
  all: vi.fn().mockResolvedValue(mockD1Result),
  run: vi.fn().mockResolvedValue(mockD1Result),
});

describe('Tracker Repository', () => {
  let mockDB: D1Database;
  const userId = 'user123';
  const habitId = 1;
  const trackerRows = [
    {
      id: 1,
      habit_id: 1,
      timestamp: '2023-06-01T10:00:00Z',
      notes: 'Test note 1',
    },
    {
      id: 2,
      habit_id: 1,
      timestamp: '2023-06-02T10:00:00Z',
      notes: 'Test note 2',
    },
  ];

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Mock database
    mockDB = {
      prepare: mockD1Prepare,
    } as unknown as D1Database;

    // Set default mock returns
    mockD1Result.results = [...trackerRows];
    mockD1Result.meta = { changes: 1, last_row_id: 1 };
  });

  describe('findTrackersByDateRange', () => {
    it('should return an empty array if no habit IDs provided', async () => {
      const result = await trackerRepository.findTrackersByDateRange(
        mockDB,
        userId,
        [],
        '2023-06-01T00:00:00Z',
        '2023-06-30T23:59:59Z'
      );

      expect(result).toEqual([]);
      expect(mockDB.prepare).not.toHaveBeenCalled();
    });

    it('should query trackers for the given habits and date range', async () => {
      await trackerRepository.findTrackersByDateRange(
        mockDB,
        userId,
        [1, 2],
        '2023-06-01T00:00:00Z',
        '2023-06-30T23:59:59Z'
      );

      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('habit_id IN (?,?)')
      );
      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('timestamp BETWEEN ? AND ?')
      );
    });

    it('should throw error if the database query fails', async () => {
      // Mock failed query
      const mockFailedResult = { ...mockD1Result, success: false };
      const mockPrepare = mockDB.prepare as jest.Mock;
      mockPrepare().all.mockResolvedValue(mockFailedResult);

      await expect(
        trackerRepository.findTrackersByDateRange(
          mockDB,
          userId,
          [1],
          '2023-06-01T00:00:00Z',
          '2023-06-30T23:59:59Z'
        )
      ).rejects.toThrow('Failed to fetch trackers by date range');
    });
  });

  describe('create', () => {
    it('should create a new tracker', async () => {
      const timestamp = '2023-06-15T10:00:00Z';
      const notes = 'Test notes';
      const lastRowId = 5;

      mockD1Result.meta.last_row_id = lastRowId;

      const result = await trackerRepository.create(
        mockDB,
        habitId,
        userId,
        timestamp,
        notes
      );

      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO trackers')
      );
      expect(result).toBe(lastRowId);
    });
  });

  describe('removeTrackersByIds', () => {
    it('should return 0 changes if no tracker IDs provided', async () => {
      const result = await trackerRepository.removeTrackersByIds(
        mockDB,
        [],
        habitId,
        userId
      );

      expect(result).toEqual({ changes: 0 });
      expect(mockDB.prepare).not.toHaveBeenCalled();
    });

    it('should delete trackers by IDs', async () => {
      const trackerIds = [1, 2, 3];
      mockD1Result.meta.changes = trackerIds.length;

      const result = await trackerRepository.removeTrackersByIds(
        mockDB,
        trackerIds,
        habitId,
        userId
      );

      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM trackers')
      );
      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('id IN (?,?,?)')
      );
      expect(result).toEqual({ changes: trackerIds.length });
    });
  });
});
