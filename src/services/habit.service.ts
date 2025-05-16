import { D1Database } from '@cloudflare/workers-types';
import { HabitData, TrackerResult } from '../controllers/habit.controller.js';
import * as habitRepository from '../repositories/habit.repository.js';
import * as trackerRepository from '../repositories/tracker.repository.js';
import { NotFoundError } from '../utils/errors.js';
import { getLocaleStartEnd } from '../utils/dateUtils.js';

export const getHabitsForDate = async (
  userId: string,
  date: string,
  timeZone: string,
  db: D1Database
) => {
  try {
    const utcDate = new Date(date);

    // Get habits from repository
    const habits = await habitRepository.getHabitsByDate(db, userId, date);

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

    // Transform database rows to response format
    return trackers.map((tracker) => ({
      id: tracker.id.toString(),
      habitId: tracker.habit_id.toString(),
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
    const result = await habitRepository.manageTracker(
      db,
      userId,
      habitId,
      timestamp,
      notes
    );

    // Return the repository result directly since it matches our service result format
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

export const getHabitStats = async (
  userId: string,
  habitId: string,
  db: D1Database
) => {
  try {
    const stats = await habitRepository.getHabitStats(db, userId, habitId);

    return {
      total: stats.total,
      completed: stats.completed,
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
