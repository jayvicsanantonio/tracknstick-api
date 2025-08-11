import { D1Database } from '@cloudflare/workers-types';
import { HabitData, TrackerResult } from '../controllers/habit.controller.js';
import * as habitRepository from '../repositories/habit.repository.js';
import * as trackerRepository from '../repositories/tracker.repository.js';
import { NotFoundError } from '../utils/errors.js';
import { getLocaleStartEnd } from '../utils/dateUtils.js';
import {
  calculateDailyStreak,
  calculateNonDailyStreak,
} from '../utils/streakUtils.js';

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

    const habitIds = habits.map((h) => h.id);
    const { localeStartISO, localeEndISO } = getLocaleStartEnd(
      utcDate,
      timeZone
    );

    const trackers = await trackerRepository.findTrackersByDateRange(
      db,
      userId,
      habitIds,
      localeStartISO,
      localeEndISO
    );

    const completedHabitIds = new Set(trackers.map((t) => t.habit_id));

    return habits.map((habit) => {
      return {
        id: habit.id.toString(),
        name: habit.name,
        icon: habit.icon || undefined,
        frequency: Array.isArray(habit.frequency) 
          ? habit.frequency 
          : habit.frequency.split(','),
        startDate: habit.start_date,
        endDate: habit.end_date || undefined,
        streak: habit.streak,
        totalCompletions: habit.total_completions,
        longestStreak: habit.longest_streak,
        lastCompleted: habit.last_completed || undefined,
        completed: completedHabitIds.has(habit.id),
      };
    });
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

  // Import date utilities
  const { safeDateParse, isValidTimeZone } = await import('../utils/dateUtils.js');

  try {
    // Validate inputs
    if (!isValidTimeZone(timeZone)) {
      throw new Error(`Invalid timezone: ${timeZone}`);
    }

    if (!safeDateParse(timestamp)) {
      throw new Error(`Invalid timestamp format: ${timestamp}`);
    }

    // Get habit data to determine frequency and streak info
    const habit = await habitRepository.getHabitById(db, userId, habitId);

    // Import date utilities to get date in user's timezone
    const { getDateInTimeZone } = await import('../utils/dateUtils.js');
    const dateInTimezone = getDateInTimeZone(timestamp, timeZone);
    
    // Debug logging
    console.log(`[DEBUG] manageTracker - habitId: ${habitId}, dateInTimezone: ${dateInTimezone}, timestamp: ${timestamp}`);
    
    // Check for existing tracker on the same DATE (not exact timestamp) in user's timezone
    const existingDayTracker = await db
      .prepare(`
        SELECT id, timestamp, deleted_at FROM trackers 
        WHERE habit_id = ? AND user_id = ? 
        AND DATE(timestamp, 'localtime') = ?
        AND deleted_at IS NULL
        ORDER BY timestamp DESC
        LIMIT 1
      `)
      .bind(habitId, userId, dateInTimezone)
      .first<{ id: number; timestamp: string; deleted_at: string | null }>();
      
    console.log(`[DEBUG] existingDayTracker found:`, existingDayTracker);

    if (existingDayTracker) {
      // Active tracker found for this date - soft delete it to toggle off
      await db
        .prepare('UPDATE trackers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(existingDayTracker.id)
        .run();

      await updateHabitStreakInfo(db, userId, habitId, habit.frequency);
      return {
        status: 'removed',
        message: 'Habit marked as not completed',
      };
    }

    // No existing tracker with this timestamp - create new one
    const result = await db
      .prepare('INSERT INTO trackers (habit_id, user_id, timestamp, notes) VALUES (?, ?, ?, ?)')
      .bind(habitId, userId, timestamp, notes || null)
      .run();

    if (!result.success) {
      throw new Error('Failed to add tracker');
    }

    // If we added or removed a tracker, recalculate streak
    await updateHabitStreakInfo(db, userId, habitId, habit.frequency);

    // Return success result for new tracker
    return {
      status: 'added',
      message: 'Habit marked as completed',
      trackerId: result.meta.last_row_id?.toString(),
    };
  } catch (error) {
    console.error(
      `Error in manageTracker service for user ${userId}, habit ${habitId}:`,
      error
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
  frequency: string
): Promise<void> {
  try {
    // Get all trackers for this habit ordered by date
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
      });
      return;
    }

    // Sort trackers by date, most recent first
    const sortedTrackers = trackers.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Get frequency as array
    const frequencyDays = Array.isArray(frequency) 
      ? frequency 
      : frequency.split(',');

    // Calculate current streak
    let currentStreak = 0;
    let lastCompleted = sortedTrackers[0].timestamp;
    let longestStreak = 0;

    // Simple implementation for daily habits
    // For more complex frequency patterns, this would need to be expanded
    if (frequencyDays.length === 7) {
      // It's a daily habit
      currentStreak = calculateDailyStreak(sortedTrackers);
    } else {
      // For non-daily habits, we need more complex logic
      currentStreak = calculateNonDailyStreak(sortedTrackers, frequencyDays);
    }

    // Update the habit with new streak information
    await habitRepository.updateHabitStats(db, habitId, {
      streak: currentStreak,
      lastCompleted,
      totalCompletions: sortedTrackers.length,
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

export const getProgressOverview = async (
  userId: string,
  month: string,
  timeZone: string,
  db: D1Database
) => {
  try {
    // This is a more complex query that would calculate statistics across all habits
    // for now returning a placeholder response
    return {
      totalHabits: 0,
      completionRate: 0,
      habitStats: [],
    };
  } catch (error) {
    console.error(
      `Error in getProgressOverview service for user ${userId}:`,
      error
    );
    throw error;
  }
};
