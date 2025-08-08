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
import * as googleService from './google.service.js';

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
        frequency: habit.frequency.split(','),
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
  db: D1Database,
  env?: { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string }
) => {
  try {
    const result = await habitRepository.createHabit(db, userId, habitData);

    // Fire-and-forget Google Calendar sync (non-blocking)
    // We pass minimal event details per spec
    const frequency = Array.isArray(habitData.frequency)
      ? habitData.frequency
      : (habitData.frequency || '').split(',').filter(Boolean);
    googleService
      .createOrUpdateHabitEvent(
        {
          GOOGLE_CLIENT_ID: env?.GOOGLE_CLIENT_ID || '',
          GOOGLE_CLIENT_SECRET: env?.GOOGLE_CLIENT_SECRET || '',
        } as any,
        db,
        userId,
        result.habitId,
        {
          name: habitData.name!,
          frequency,
          startDate: habitData.startDate!,
          endDate: habitData.endDate ?? null,
        }
      )
      .catch(() => {});

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
  db: D1Database,
  env?: { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string }
) => {
  try {
    await habitRepository.updateHabit(db, userId, habitId, habitData);

    // Fetch current habit to get latest fields for syncing
    const updated = await habitRepository.getHabitById(db, userId, habitId);
    const frequency = (updated.frequency || '')
      .split(',')
      .filter(Boolean);

    googleService
      .createOrUpdateHabitEvent(
        {
          GOOGLE_CLIENT_ID: env?.GOOGLE_CLIENT_ID || '',
          GOOGLE_CLIENT_SECRET: env?.GOOGLE_CLIENT_SECRET || '',
        } as any,
        db,
        userId,
        habitId,
        {
          name: updated.name,
          frequency,
          startDate: updated.start_date,
          endDate: updated.end_date || null,
        }
      )
      .catch(() => {});

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
  db: D1Database,
  env?: { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string }
) => {
  try {
    await habitRepository.deleteHabit(db, userId, habitId);

    googleService
      .deleteHabitEvent(
        {
          GOOGLE_CLIENT_ID: env?.GOOGLE_CLIENT_ID || '',
          GOOGLE_CLIENT_SECRET: env?.GOOGLE_CLIENT_SECRET || '',
        } as any,
        db,
        userId,
        habitId
      )
      .catch(() => {});

    return true;
  } catch (error) {
    console.error(
      `Error in deleteHabit service for user ${userId}, habit ${habitId}:`,
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
    // Get habit data to determine frequency and streak info
    const habit = await habitRepository.getHabitById(db, userId, habitId);

    // Add or remove the tracker
    const result = await habitRepository.manageTracker(
      db,
      userId,
      habitId,
      timestamp,
      notes
    );

    // If we added or removed a tracker, recalculate streak
    await updateHabitStreakInfo(db, userId, habitId, habit.frequency);

    // Return the repository result
    return {
      status: result.status,
      message: result.message,
      ...(result.trackerId && { trackerId: result.trackerId.toString() }),
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
    const frequencyDays = frequency.split(',');

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
