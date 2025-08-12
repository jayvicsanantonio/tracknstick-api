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

export const getAllHabits = async (
  userId: string,
  db: D1Database
) => {
  try {
    const habits = await habitRepository.getAllHabits(db, userId);

    if (!habits || habits.length === 0) {
      return [];
    }

    // Default to today in UTC for completion status when no date context provided
    const today = new Date();
    const timeZone = 'UTC';
    const dayOfWeek = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    }).format(today);

    // Get habits that should be active today
    const activeHabitsToday = habits.filter((habit) => {
      const startDate = new Date(habit.start_date);
      const endDate = habit.end_date ? new Date(habit.end_date) : null;
      const frequency = habit.frequency.split(',');
      
      // Check if habit is active today
      const isActiveToday = startDate <= today && (!endDate || endDate >= today);
      const isScheduledToday = frequency.includes(dayOfWeek);
      
      return isActiveToday && isScheduledToday;
    });

    // If no habits are active today, return all habits as not completed
    if (activeHabitsToday.length === 0) {
      return habits.map((habit) => ({
        id: habit.id,
        name: habit.name,
        icon: habit.icon || '',
        frequency: habit.frequency.split(','),
        startDate: habit.start_date,
        endDate: habit.end_date,
        streak: habit.streak,
        totalCompletions: habit.total_completions,
        lastCompleted: habit.last_completed,
        completed: false,
      }));
    }

    // Get today's date range in UTC
    const { getLocaleStartEnd } = await import('../utils/dateUtils.js');
    const { localeStartISO, localeEndISO } = getLocaleStartEnd(today, timeZone);

    const habitIds = habits.map((h) => h.id);
    const trackers = await trackerRepository.findTrackersByDateRange(
      db,
      userId,
      habitIds,
      localeStartISO,
      localeEndISO
    );

    const completedHabitIds = new Set(trackers.map((t) => t.habit_id));

    return habits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      icon: habit.icon || '',
      frequency: habit.frequency.split(','),
      startDate: habit.start_date,
      endDate: habit.end_date,
      streak: habit.streak,
      totalCompletions: habit.total_completions,
      lastCompleted: habit.last_completed,
      completed: completedHabitIds.has(habit.id),
    }));
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
    console.log(`[SERVICE] Starting manageTracker: habit=${habitId}, timestamp=${timestamp}, timezone=${timeZone}`);
    
    // Validate inputs
    if (!isValidTimeZone(timeZone)) {
      throw new Error(`Invalid timezone: ${timeZone}`);
    }

    if (!safeDateParse(timestamp)) {
      throw new Error(`Invalid timestamp format: ${timestamp}`);
    }

    // Get habit data to determine frequency and streak info
    const habit = await habitRepository.getHabitById(db, userId, habitId);
    console.log(`[SERVICE] Found habit: id=${habit.id}, name=${habit.name}, frequency=${habit.frequency}`);

    // Import date utilities to get date in user's timezone
    const { getDateInTimeZone } = await import('../utils/dateUtils.js');
    const dateInTimezone = getDateInTimeZone(timestamp, timeZone);
    console.log(`[SERVICE] Date in timezone: ${dateInTimezone}`);
    
    // Check for existing tracker on the same DATE (simplified - no soft-deletion)
    const existingDayTrackerQuery = `
      SELECT id, timestamp FROM trackers 
      WHERE habit_id = ? AND user_id = ? 
      AND DATE(timestamp, 'localtime') = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    console.log(`[SERVICE] Checking for existing day tracker with query: ${existingDayTrackerQuery}`);
    console.log(`[SERVICE] Query params: habitId=${habitId}, userId=${userId}, dateInTimezone=${dateInTimezone}`);
    
    const existingDayTracker = await db
      .prepare(existingDayTrackerQuery)
      .bind(habitId, userId, dateInTimezone)
      .first<{ id: number; timestamp: string }>();

    console.log(`[SERVICE] Existing day tracker result: ${JSON.stringify(existingDayTracker)}`);

    if (existingDayTracker) {
      console.log(`[SERVICE] Found existing tracker ${existingDayTracker.id}, deleting it`);
      
      // Tracker exists for this date - delete it to toggle off
      const deleteResult = await db
        .prepare('DELETE FROM trackers WHERE id = ?')
        .bind(existingDayTracker.id)
        .run();
        
      console.log(`[SERVICE] Delete result: ${JSON.stringify(deleteResult)}`);

      await updateHabitStreakInfo(db, userId, habitId, habit.frequency, timeZone);
      
      const response = {
        status: 'removed' as const,
        message: 'Habit marked as not completed',
      };
      console.log(`[SERVICE] Returning: ${JSON.stringify(response)}`);
      return response;
    }

    // Check for exact timestamp match to avoid UNIQUE constraint violation
    const exactTimestampQuery = `
      SELECT id FROM trackers 
      WHERE habit_id = ? AND user_id = ? 
      AND timestamp = ?
    `;
    console.log(`[SERVICE] Checking for exact timestamp match: ${exactTimestampQuery}`);
    console.log(`[SERVICE] Query params: habitId=${habitId}, userId=${userId}, timestamp=${timestamp}`);
    
    const exactTimestampTracker = await db
      .prepare(exactTimestampQuery)
      .bind(habitId, userId, timestamp)
      .first<{ id: number }>();

    console.log(`[SERVICE] Exact timestamp tracker result: ${JSON.stringify(exactTimestampTracker)}`);

    if (exactTimestampTracker) {
      console.log(`[SERVICE] Found exact timestamp tracker ${exactTimestampTracker.id}, deleting it`);
      
      // Exact timestamp already exists - delete it (toggle off)
      const deleteResult = await db
        .prepare('DELETE FROM trackers WHERE id = ?')
        .bind(exactTimestampTracker.id)
        .run();
        
      console.log(`[SERVICE] Delete result: ${JSON.stringify(deleteResult)}`);

      await updateHabitStreakInfo(db, userId, habitId, habit.frequency, timeZone);
      
      const response = {
        status: 'removed' as const,
        message: 'Habit marked as not completed',
      };
      console.log(`[SERVICE] Returning: ${JSON.stringify(response)}`);
      return response;
    }

    // No existing tracker - create new one
    console.log(`[SERVICE] No existing tracker found, creating new one`);
    console.log(`[SERVICE] Insert params: habitId=${habitId}, userId=${userId}, timestamp=${timestamp}, notes=${notes || null}`);
    
    const insertResult = await db
      .prepare('INSERT INTO trackers (habit_id, user_id, timestamp, notes) VALUES (?, ?, ?, ?)')
      .bind(habitId, userId, timestamp, notes || null)
      .run();

    console.log(`[SERVICE] Insert result: ${JSON.stringify(insertResult)}`);

    if (!insertResult.success) {
      console.log(`[SERVICE] Insert failed: ${insertResult.error}`);
      throw new Error('Failed to add tracker');
    }

    // If we added or removed a tracker, recalculate streak
    await updateHabitStreakInfo(db, userId, habitId, habit.frequency, timeZone);

    // Return success result for new tracker
    const response = {
      status: 'added' as const,
      message: 'Habit marked as completed',
      trackerId: insertResult.meta.last_row_id?.toString(),
    };
    console.log(`[SERVICE] Returning: ${JSON.stringify(response)}`);
    return response;
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
      getMostRecentCompletionDate 
    } = await import('../utils/streakUtils.js');

    // Calculate timezone-aware streaks
    const currentStreak = calculateCurrentStreak(trackers, frequencyDays, timeZone);
    const historicalLongestStreak = calculateLongestStreakFromTrackers(trackers, frequencyDays, timeZone);
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
