// @ts-nocheck
// Add this comment to suppress TypeScript errors during migration to Hono

import { D1Database } from '@cloudflare/workers-types';
import { HabitData } from '../controllers/habit.controller.js';
import { NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';

interface HabitRow {
  id: number;
  user_id: string;
  name: string;
  icon: string | null;
  frequency: string;
  start_date: string;
  end_date: string | null;
  streak: number;
  total_completions: number;
  longest_streak: number;
  last_completed: string | null;
  created_at: string;
  updated_at: string;
}

interface TrackerRow {
  id: number;
  habit_id: number;
  user_id: string;
  timestamp: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Create a user if they don't exist
export async function ensureUserExists(
  db: D1Database,
  clerkUserId: string
): Promise<void> {
  try {
    const user = await db
      .prepare('SELECT id FROM users WHERE clerk_user_id = ?')
      .bind(clerkUserId)
      .first();

    if (!user) {
      logger.info(`Creating new user with clerk_user_id: ${clerkUserId}`);
      const result = await db
        .prepare('INSERT INTO users (clerk_user_id) VALUES (?)')
        .bind(clerkUserId)
        .run();

      if (!result.success) {
        logger.error(
          `Failed to create user with clerk_user_id: ${clerkUserId}`,
          { result }
        );
        throw new Error(
          `Failed to create user with clerk_user_id: ${clerkUserId}`
        );
      }

      // Verify the user was created
      const verifyUser = await db
        .prepare('SELECT id FROM users WHERE clerk_user_id = ?')
        .bind(clerkUserId)
        .first();

      if (!verifyUser) {
        logger.error(
          `User creation verification failed for clerk_user_id: ${clerkUserId}`
        );
        throw new Error(
          `User creation verification failed for clerk_user_id: ${clerkUserId}`
        );
      }
    }
  } catch (error) {
    logger.error(
      `Error in ensureUserExists for clerk_user_id: ${clerkUserId}`,
      { error }
    );
    throw error;
  }
}

// Get habits for a given date
export async function getHabitsByDate(
  db: D1Database,
  userId: string,
  date: string,
  dayOfWeek: string
): Promise<HabitRow[]> {
  // Ensure user exists
  await ensureUserExists(db, userId);

  // Get habits active on the given date
  const habits = await db
    .prepare(
      `
      SELECT * FROM habits 
      WHERE user_id = ? 
      AND start_date <= ? 
      AND (end_date IS NULL OR end_date >= ?)
      AND (frequency LIKE ? OR frequency LIKE ? OR frequency LIKE ? OR frequency = ?)
    `
    )
    .bind(
      userId,
      date,
      date,
      `%${dayOfWeek},%`, // Pattern: "Fri," (beginning or middle)
      `%,${dayOfWeek},%`, // Pattern: ",Fri," (middle)
      `%,${dayOfWeek}`, // Pattern: ",Fri" (end)
      dayOfWeek // Pattern: "Fri" (exact match)
    )
    .all();

  if (!habits.success) {
    logger.error('Failed to fetch habits by date', { userId, date });
    throw new Error('Failed to fetch habits by date');
  }

  return habits.results as HabitRow[];
}

// Create a new habit
export async function createHabit(
  db: D1Database,
  userId: string,
  habitData: HabitData
): Promise<{ habitId: number }> {
  try {
    // Ensure user exists
    await ensureUserExists(db, userId);

    const { name, icon, frequency, startDate, endDate } = habitData;

    const frequencyString = Array.isArray(frequency)
      ? frequency.join(',')
      : frequency;

    const result = await db
      .prepare(
        `
        INSERT INTO habits (
          user_id, name, icon, frequency, 
          start_date, end_date
        ) VALUES (?, ?, ?, ?, ?, ?)
      `
      )
      .bind(
        userId,
        name,
        icon || null,
        frequencyString,
        startDate,
        endDate || null
      )
      .run();

    if (!result.success) {
      logger.error('Failed to create habit', {
        userId,
        habitData,
        error: result.error,
      });
      throw new Error(
        `Failed to create habit: ${result.error || 'Unknown error'}`
      );
    }

    return { habitId: result.meta.last_row_id as number };
  } catch (error) {
    logger.error(`Error in createHabit for user ${userId}:`, {
      error,
      habitData,
    });
    throw error;
  }
}

// Get a single habit by ID
export async function getHabitById(
  db: D1Database,
  userId: string,
  habitId: number | string
): Promise<HabitRow> {
  const habit = await db
    .prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?')
    .bind(habitId, userId)
    .first();

  if (!habit) {
    throw new NotFoundError(`Habit with ID ${habitId} not found`);
  }

  return habit as HabitRow;
}

// Update an existing habit
export async function updateHabit(
  db: D1Database,
  userId: string,
  habitId: number | string,
  habitData: HabitData
): Promise<void> {
  // Check if habit exists and belongs to user
  await getHabitById(db, userId, habitId);

  // Build the update query dynamically based on provided fields
  const updateFields: string[] = [];
  const values: any[] = [];

  if (habitData.name !== undefined) {
    updateFields.push('name = ?');
    values.push(habitData.name);
  }

  if (habitData.icon !== undefined) {
    updateFields.push('icon = ?');
    values.push(habitData.icon || null);
  }

  if (habitData.frequency !== undefined) {
    const frequencyString = Array.isArray(habitData.frequency)
      ? habitData.frequency.join(',')
      : habitData.frequency;
    updateFields.push('frequency = ?');
    values.push(frequencyString);
  }

  if (habitData.startDate !== undefined) {
    updateFields.push('start_date = ?');
    values.push(habitData.startDate);
  }

  if (habitData.endDate !== undefined) {
    updateFields.push('end_date = ?');
    values.push(habitData.endDate);
  }

  // Add update timestamp
  updateFields.push('updated_at = CURRENT_TIMESTAMP');

  if (updateFields.length === 0) {
    return; // Nothing to update
  }

  // Add the habit ID and user ID to the values array
  values.push(habitId);
  values.push(userId);

  const query = `
    UPDATE habits 
    SET ${updateFields.join(', ')} 
    WHERE id = ? AND user_id = ?
  `;

  const result = await db
    .prepare(query)
    .bind(...values)
    .run();

  if (!result.success || result.meta.changes === 0) {
    throw new Error('Failed to update habit');
  }
}

// Delete a habit
export async function deleteHabit(
  db: D1Database,
  userId: string,
  habitId: number | string
): Promise<void> {
  // Check if habit exists and belongs to user
  await getHabitById(db, userId, habitId);

  const result = await db
    .prepare('DELETE FROM habits WHERE id = ? AND user_id = ?')
    .bind(habitId, userId)
    .run();

  if (!result.success || result.meta.changes === 0) {
    throw new Error('Failed to delete habit');
  }
}

// Get trackers for a habit
export async function getTrackers(
  db: D1Database,
  userId: string,
  habitId: number | string,
  startDate: string,
  endDate: string
): Promise<TrackerRow[]> {
  // Check if habit exists and belongs to user
  await getHabitById(db, userId, habitId);

  const trackers = await db
    .prepare(
      `
      SELECT * FROM trackers 
      WHERE habit_id = ? AND user_id = ? 
      AND timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
    `
    )
    .bind(habitId, userId, startDate, endDate)
    .all();

  return trackers.results as TrackerRow[];
}

// Add or remove a tracker for a habit
export async function manageTracker(
  db: D1Database,
  userId: string,
  habitId: number | string,
  timestamp: string,
  notes?: string
): Promise<{
  status: 'added' | 'removed';
  trackerId?: number;
  message: string;
}> {
  // Check if habit exists and belongs to user
  await getHabitById(db, userId, habitId);

  // Check if tracker already exists
  const existingTracker = await db
    .prepare('SELECT id FROM trackers WHERE habit_id = ? AND timestamp = ?')
    .bind(habitId, timestamp)
    .first<{ id: number }>();

  // If tracker exists, remove it
  if (existingTracker) {
    await db
      .prepare('DELETE FROM trackers WHERE id = ?')
      .bind(existingTracker.id)
      .run();

    return {
      status: 'removed',
      message: 'Habit marked as not completed',
    };
  }

  // Add a new tracker
  const result = await db
    .prepare(
      `
      INSERT INTO trackers (habit_id, user_id, timestamp, notes) 
      VALUES (?, ?, ?, ?)
    `
    )
    .bind(habitId, userId, timestamp, notes || null)
    .run();

  if (!result.success) {
    throw new Error('Failed to add tracker');
  }

  return {
    status: 'added',
    trackerId: result.meta.last_row_id as number,
    message: 'Habit marked as completed',
  };
}

// Get habit stats
export async function getHabitStats(
  db: D1Database,
  userId: string,
  habitId: number | string
): Promise<{
  streak: number;
  longestStreak: number;
  totalCompletions: number;
  lastCompleted: string | null;
}> {
  // Check if habit exists and belongs to user
  const habit = await getHabitById(db, userId, habitId);

  return {
    streak: habit.streak,
    longestStreak: habit.longest_streak,
    totalCompletions: habit.total_completions,

    lastCompleted: habit.last_completed,
  };
}

// Update habit statistics (streak, longest_streak, etc.)
export async function updateHabitStats(
  db: D1Database,
  habitId: number | string,
  stats: {
    streak?: number;
    lastCompleted?: string | null;
    totalCompletions?: number;
    longestStreak?: number;
  }
): Promise<void> {
  // Build the update query dynamically based on provided fields
  const updateFields: string[] = [];
  const values: any[] = [];

  if (stats.streak !== undefined) {
    updateFields.push('streak = ?');
    values.push(stats.streak);

    // If we're updating streak and it's greater than longest_streak, update longest_streak too
    updateFields.push(
      'longest_streak = CASE WHEN ? > longest_streak THEN ? ELSE longest_streak END'
    );
    values.push(stats.streak, stats.streak);
  }

  if (stats.lastCompleted !== undefined) {
    updateFields.push('last_completed = ?');
    values.push(stats.lastCompleted);
  }

  if (stats.totalCompletions !== undefined) {
    updateFields.push('total_completions = ?');
    values.push(stats.totalCompletions);
  }

  if (stats.longestStreak !== undefined) {
    updateFields.push('longest_streak = ?');
    values.push(stats.longestStreak);
  }

  // Add update timestamp
  updateFields.push('updated_at = CURRENT_TIMESTAMP');

  if (updateFields.length === 0) {
    return; // Nothing to update
  }

  // Add the habit ID to the values array
  values.push(habitId);

  const query = `
    UPDATE habits 
    SET ${updateFields.join(', ')} 
    WHERE id = ?
  `;

  const result = await db
    .prepare(query)
    .bind(...values)
    .run();

  if (!result.success) {
    throw new Error(`Failed to update habit stats for habit ${habitId}`);
  }
}
