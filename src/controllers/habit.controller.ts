import { Context } from 'hono';
import * as habitService from '../services/habit.service.js';

// Define types for request data
export interface HabitData {
  name?: string;
  icon?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string | null;
}

export interface TrackerResult {
  status: 'added' | 'removed';
  message: string;
  trackerId?: string;
}

/**
 * Get habits scheduled for a specific date.
 */
export const getHabits = async (c: Context) => {
  const { userId } = c.get('auth');
  const { date, timeZone } = c.get('validated_query');

  try {
    const habits = await habitService.getHabitsForDate(
      userId,
      date,
      timeZone,
      c.env.DB
    );
    const data = c.json(habits);

    return c.json(
      habits.map((habit) => ({
        id: habit.id.toString(),
        name: habit.name,
        icon: habit.icon,
        frequency: habit.frequency,
        startDate: habit.startDate,
        endDate: habit.endDate,
        completed: habit.completed,
      }))
    );
  } catch (error) {
    console.error(`Error in getHabits controller for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Create a new habit.
 */
export const createHabit = async (c: Context) => {
  const { userId } = c.get('auth');
  const habitData = c.get('validated_json');

  try {
    const result = await habitService.createHabit(userId, habitData, c.env.DB);
    return c.json(
      {
        message: 'Habit created successfully',
        habitId: result.habitId,
      },
      201
    );
  } catch (error) {
    console.error(`Error in createHabit controller for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Update an existing habit.
 */
export const updateHabit = async (c: Context) => {
  const { userId } = c.get('auth');
  const { habitId } = c.get('validated_param');
  const habitData = c.get('validated_json');

  try {
    await habitService.updateHabit(userId, habitId, habitData, c.env.DB);
    return c.json({ message: 'Habit updated successfully' });
  } catch (error) {
    console.error(
      `Error in updateHabit controller for user ${userId}, habit ${habitId}:`,
      error
    );
    throw error;
  }
};

/**
 * Delete a specific habit.
 */
export const deleteHabit = async (c: Context) => {
  const { userId } = c.get('auth');
  const { habitId } = c.get('validated_param');

  try {
    await habitService.deleteHabit(userId, habitId, c.env.DB);
    return c.json({ message: 'Habit deleted successfully' });
  } catch (error) {
    console.error(
      `Error in deleteHabit controller for user ${userId}, habit ${habitId}:`,
      error
    );
    throw error;
  }
};

/**
 * Get tracker entries for a specific habit.
 */
export const getTrackers = async (c: Context) => {
  const { userId } = c.get('auth');
  const { habitId } = c.get('validated_param');
  const { startDate, endDate } = c.get('validated_query');

  try {
    const trackers = await habitService.getTrackersForHabit(
      userId,
      habitId,
      startDate,
      endDate,
      c.env.DB
    );

    // Return a cleaner response with only relevant fields
    return c.json({
      trackers: trackers.map((tracker) => ({
        id: tracker.id.toString(),
        habitId: tracker.habitId.toString(),
        timestamp: tracker.timestamp,
        notes: tracker.notes || undefined,
      })),
    });
  } catch (error) {
    console.error(
      `Error in getTrackers controller for user ${userId}, habit ${habitId}:`,
      error
    );
    throw error;
  }
};

/**
 * Add or remove a tracker entry for a habit on a specific date.
 */
export const manageTracker = async (c: Context) => {
  const { userId } = c.get('auth');
  const { habitId } = c.get('validated_param');
  const { timestamp, timeZone, notes } = c.get('validated_json');

  try {
    const result = await habitService.manageTracker(
      userId,
      habitId,
      timestamp,
      timeZone,
      notes,
      c.env.DB
    );

    const statusCode = result.status === 'added' ? 201 : 200;
    return c.json(
      {
        message: result.message,
        ...(result.trackerId && { trackerId: result.trackerId }),
      },
      statusCode
    );
  } catch (error) {
    console.error(
      `Error in manageTracker controller for user ${userId}, habit ${habitId}:`,
      error
    );
    throw error;
  }
};

/**
 * Get statistics for a specific habit.
 */
export const getHabitStats = async (c: Context) => {
  const { userId } = c.get('auth');
  const { habitId } = c.get('validated_param');
  const { timeZone } = c.get('validated_query');

  try {
    const stats = await habitService.getHabitStats(userId, habitId, c.env.DB);
    return c.json(stats);
  } catch (error) {
    console.error(
      `Error in getHabitStats controller for user ${userId}, habit ${habitId}:`,
      error
    );
    throw error;
  }
};

/**
 * Get progress overview for a user for a given month.
 */
export const getProgressOverview = async (c: Context) => {
  const { userId } = c.get('auth');
  const { month, timeZone } = c.get('validated_query');

  try {
    const overview = await habitService.getProgressOverview(
      userId,
      month,
      timeZone,
      c.env.DB
    );
    return c.json(overview);
  } catch (error) {
    console.error(
      `Error in getProgressOverview controller for user ${userId}:`,
      error
    );
    throw error;
  }
};
