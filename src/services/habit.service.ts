import { D1Database } from '@cloudflare/workers-types';
import { HabitData, TrackerResult } from '../controllers/habit.controller.js';
import * as habitRepository from '../repositories/habit.repository.js';
import * as trackerRepository from '../repositories/tracker.repository.js';
import { NotFoundError } from '../utils/errors.js';
import {
  getLocaleStartEnd,
  isValidTimeZone,
  safeDateParse,
} from '../utils/dateUtils.js';
import {
  calculateDailyStreak,
  calculateNonDailyStreak,
} from '../utils/streakUtils.js';
import logger from '../utils/logger.js';

// Interface definitions
interface TrackerRow {
  id: number;
  habit_id: number;
  user_id: string;
  timestamp: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * One habit as the API presents it. Both list endpoints emit this shape, so
 * they cannot drift in id type, icon fallback or which fields are present.
 */
interface HabitListItem {
  id: string;
  name: string;
  icon?: string;
  frequency: string[];
  startDate: string;
  endDate?: string;
  streak: number;
  totalCompletions: number;
  longestStreak: number;
  lastCompleted?: string;
  completed: boolean;
}

// HabitRow.frequency is a comma-joined string; parsed in exactly one place.
const toHabitListItem = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any,
  completed: boolean
): HabitListItem => ({
  id: row.id.toString(),
  name: row.name,
  icon: row.icon || undefined,
  frequency: row.frequency ? row.frequency.split(',') : [],
  startDate: row.start_date,
  endDate: row.end_date || undefined,
  streak: row.streak,
  totalCompletions: row.total_completions,
  longestStreak: row.longest_streak,
  lastCompleted: row.last_completed || undefined,
  completed,
});

/** Ids of habits with a tracker inside the given day, in the user's timezone. */
const completedIdsForDay = async (
  db: D1Database,
  userId: string,
  habitIds: number[],
  day: Date,
  timeZone: string
): Promise<Set<number>> => {
  const { localeStartISO, localeEndISO } = getLocaleStartEnd(day, timeZone);
  const trackers = await trackerRepository.findTrackersByDateRange(
    db,
    userId,
    habitIds,
    localeStartISO,
    localeEndISO
  );
  return new Set(trackers.map((t) => t.habit_id));
};

export const getAllHabits = async (
  userId: string,
  db: D1Database,
  timeZone = 'UTC'
) => {
  try {
    const habits = await habitRepository.getAllHabits(db, userId);

    if (!habits || habits.length === 0) {
      return [];
    }

    const completedHabitIds = await completedIdsForDay(
      db,
      userId,
      habits.map((h) => h.id),
      new Date(),
      timeZone
    );

    return habits.map((habit) =>
      toHabitListItem(habit, completedHabitIds.has(habit.id))
    );
  } catch (error) {
    logger.error(
      `Error in getAllHabits service for user ${userId}:`,
      error as Error
    );
    throw error;
  }
};

export const getHabitsForDate = async (
  userId: string,
  date: string,
  timeZone: string,
  db: D1Database
) => {
  try {
    const utcDate = new Date(date);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    });
    const dayOfWeek = formatter.format(utcDate);

    const habits = await habitRepository.getHabitsByDate(
      db,
      userId,
      date,
      dayOfWeek
    );

    if (!habits || habits.length === 0) {
      return [];
    }

    const completedHabitIds = await completedIdsForDay(
      db,
      userId,
      habits.map((h) => h.id),
      utcDate,
      timeZone
    );

    return habits.map((habit) =>
      toHabitListItem(habit, completedHabitIds.has(habit.id))
    );
  } catch (error) {
    console.error(
      `Error in getHabitsForDate service for user ${userId}:`,
      error
    );
    throw error;
  }
};

export const createHabit = async (
  userId: string,
  habitData: HabitData,
  db: D1Database
) => {
  try {
    const result = await habitRepository.createHabit(db, userId, habitData);
    return { habitId: result.habitId.toString() };
  } catch (error) {
    console.error(`Error in createHabit service for user ${userId}:`, error);
    throw error;
  }
};

export const updateHabit = async (
  userId: string,
  habitId: string,
  habitData: HabitData,
  db: D1Database
) => {
  try {
    await habitRepository.updateHabit(db, userId, habitId, habitData);
    return true;
  } catch (error) {
    console.error(
      `Error in updateHabit service for user ${userId}, habit ${habitId}:`,
      error
    );
    throw error;
  }
};

export const deleteHabit = async (
  userId: string,
  habitId: string,
  db: D1Database
) => {
  try {
    await habitRepository.deleteHabit(db, userId, habitId);
    return true;
  } catch (error) {
    console.error(
      `Error in deleteHabit service for user ${userId}, habit ${habitId}:`,
      error
    );
    throw error;
  }
};

export const restoreHabit = async (
  userId: string,
  habitId: string,
  db: D1Database
) => {
  try {
    await habitRepository.restoreHabit(db, userId, habitId);
    return true;
  } catch (error) {
    console.error(
      `Error in restoreHabit service for user ${userId}, habit ${habitId}:`,
      error
    );
    throw error;
  }
};

export const getTrackersForHabit = async (
  userId: string,
  habitId: string,
  startDate: string,
  endDate: string,
  db: D1Database
) => {
  try {
    const trackers = await habitRepository.getTrackers(
      db,
      userId,
      habitId,
      startDate,
      endDate
    );

    // Transform database rows to response format with consistent naming
    return trackers.map((tracker) => ({
      id: tracker.id,
      habitId: tracker.habit_id,
      timestamp: tracker.timestamp,
      notes: tracker.notes || undefined,
    }));
  } catch (error) {
    console.error(
      `Error in getTrackersForHabit service for user ${userId}, habit ${habitId}:`,
      error
    );
    throw error;
  }
};

export const manageTracker = async (
  userId: string,
  habitId: string,
  timestamp: string,
  timeZone: string,
  notes?: string,
  db?: D1Database
): Promise<TrackerResult> => {
  if (!db) {
    throw new Error('Database instance is required');
  }

  try {
    if (!isValidTimeZone(timeZone)) {
      throw new Error(`Invalid timezone: ${timeZone}`);
    }

    if (!safeDateParse(timestamp)) {
      throw new Error(`Invalid timestamp format: ${timestamp}`);
    }

    // Verifies the habit exists and belongs to this user
    const habit = await habitRepository.getHabitById(db, userId, habitId);

    const { localeStartISO, localeEndISO } = getLocaleStartEnd(
      new Date(timestamp),
      timeZone
    );

    const existing = await habitRepository.findTrackerForDay(
      db,
      userId,
      habitId,
      {
        startISO: localeStartISO,
        endISO: localeEndISO,
        exactTimestamp: timestamp,
      }
    );

    let result: TrackerResult;

    if (existing) {
      await habitRepository.deleteTrackerById(db, existing.id);
      result = {
        status: 'removed',
        message: 'Habit marked as not completed',
      };
    } else {
      const trackerId = await habitRepository.createTracker(
        db,
        userId,
        habitId,
        timestamp,
        notes
      );
      result = {
        status: 'added',
        trackerId: trackerId.toString(),
        message: 'Habit marked as completed',
      };
    }

    await updateHabitStreakInfo(
      db,
      userId,
      habitId,
      habit.frequency,
      timeZone
    );

    logger.info('Tracker toggled', { userId, habitId, status: result.status });

    return result;
  } catch (error) {
    logger.error(
      `Error in manageTracker service for user ${userId}, habit ${habitId}:`,
      error as Error
    );
    throw error;
  }
};

/**
 * Updates streak information for a habit based on completed trackers
 */
async function updateHabitStreakInfo(
  db: D1Database,
  userId: string,
  habitId: string,
  frequency: string,
  timeZone: string = 'UTC'
): Promise<void> {
  try {
    // Get all active (non-deleted) trackers for this habit
    const trackers = await trackerRepository.getAllTrackersForHabit(
      db,
      userId,
      habitId
    );

    if (!trackers || trackers.length === 0) {
      // No trackers, reset streak to 0
      await habitRepository.updateHabitStats(db, habitId, {
        streak: 0,
        lastCompleted: null,
        totalCompletions: 0,
        longestStreak: 0,
      });
      return;
    }

    // Get frequency as array
    const frequencyDays = Array.isArray(frequency)
      ? frequency
      : frequency.split(',');

    // Import timezone utilities
    const {
      calculateCurrentStreak,
      calculateLongestStreakFromTrackers,
      getMostRecentCompletionDate,
    } = await import('../utils/streakUtils.js');

    // Calculate timezone-aware streaks
    const currentStreak = calculateCurrentStreak(
      trackers,
      frequencyDays,
      timeZone
    );
    const historicalLongestStreak = calculateLongestStreakFromTrackers(
      trackers,
      frequencyDays,
      timeZone
    );
    const longestStreak = Math.max(currentStreak, historicalLongestStreak);
    const lastCompleted = getMostRecentCompletionDate(trackers, timeZone);

    // Count only active (non-deleted) trackers for total completions
    const totalCompletions = trackers.length;

    // Update the habit with new streak information
    await habitRepository.updateHabitStats(db, habitId, {
      streak: currentStreak,
      lastCompleted,
      totalCompletions,
      longestStreak,
    });
  } catch (error) {
    console.error(`Error updating habit streak for habit ${habitId}:`, error);
    throw error;
  }
}

export const getHabitStats = async (
  userId: string,
  habitId: string,
  db: D1Database
) => {
  try {
    const stats = await habitRepository.getHabitStats(db, userId, habitId);

    return {
      streak: stats.streak,
      longestStreak: stats.longestStreak,
      totalCompletions: stats.totalCompletions,
      lastCompleted: stats.lastCompleted || undefined,
    };
  } catch (error) {
    console.error(
      `Error in getHabitStats service for user ${userId}, habit ${habitId}:`,
      error
    );
    throw error;
  }
};
