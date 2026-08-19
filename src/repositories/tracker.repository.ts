// @ts-nocheck
// Add this comment to suppress TypeScript errors during migration to Hono
import { D1Database } from '@cloudflare/workers-types';
import { NotFoundError } from '../utils/errors.js';
import { computeStreaks } from '../utils/streakUtils.js';
import { getLocaleStartEndForDateKey, isValidTimeZone } from '../utils/dateUtils.js';
import { TrackerInsert, Tracker } from '../types/d1.js';

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
 * Finds tracker entries for multiple habits within a specific ISO date range for a user.
 */
export async function findTrackersByDateRange(
  db: D1Database,
  userId: string,
  habitIds: number[],
  startDate: string,
  endDate: string
): Promise<TrackerRow[]> {
  if (!habitIds || habitIds.length === 0) {
    return [];
  }

  // Convert habitIds to strings for SQL placeholders
  const placeholders = habitIds.map(() => '?').join(',');

  // Build the parameter list with userId first, then all habitIds
  const params = [userId, ...habitIds, startDate, endDate];

  const trackers = await db
    .prepare(
      `SELECT * FROM trackers 
       WHERE user_id = ? 
       AND habit_id IN (${placeholders})
       AND timestamp >= ? 
       AND timestamp <= ?
       AND deleted_at IS NULL`
    )
    .bind(...params)
    .all();

  if (!trackers.success) {
    throw new Error('Failed to fetch trackers');
  }

  return trackers.results as TrackerRow[];
}

/**
 * Finds tracker entries for a specific habit, optionally filtered by a date range (YYYY-MM-DD).
 */
export async function findTrackersByHabitAndDateRange(
  db: D1Database,
  habitId: number,
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<Tracker[]> {
  let sql = `
    SELECT id, habit_id, user_id, timestamp, notes, created_at, updated_at
    FROM trackers
    WHERE habit_id = ? AND user_id = ? AND deleted_at IS NULL
  `;
  const params: (string | number)[] = [habitId, userId];

  if (startDate && endDate) {
    sql += ` AND DATE(timestamp) BETWEEN DATE(?) AND DATE(?)`;
    params.push(startDate, endDate);
  } else if (startDate) {
    sql += ` AND DATE(timestamp) >= DATE(?)`;
    params.push(startDate);
  } else if (endDate) {
    sql += ` AND DATE(timestamp) <= DATE(?)`;
    params.push(endDate);
  }

  sql += ` ORDER BY timestamp DESC`;

  const result = await db
    .prepare(sql)
    .bind(...params)
    .all();

  if (!result.success) {
    throw new Error('Failed to fetch trackers by habit and date range');
  }

  return result.results as Tracker[];
}

/**
 * Finds tracker IDs for a specific habit within a precise ISO date range (used for checking existence).
 */
export async function findTrackersInDateRange(
  db: D1Database,
  habitId: number,
  userId: string,
  startDateISO: string,
  endDateISO: string
): Promise<{ id: number }[]> {
  const sql = `
    SELECT id
    FROM trackers
    WHERE habit_id = ? AND user_id = ? AND (timestamp BETWEEN ? AND ?)
    AND deleted_at IS NULL
  `;
  const params = [habitId, userId, startDateISO, endDateISO];

  const result = await db
    .prepare(sql)
    .bind(...params)
    .all();

  if (!result.success) {
    throw new Error('Failed to check for trackers in date range');
  }

  return result.results as { id: number }[];
}

/**
 * Removes specific tracker entries by their IDs for a given habit and user.
 */
export async function removeTrackersByIds(
  db: D1Database,
  trackerIds: number[],
  habitId: number,
  userId: string
): Promise<{ changes: number }> {
  if (!trackerIds || trackerIds.length === 0) {
    return { changes: 0 };
  }

  // D1 doesn't support array parameters directly, so we need to build the query
  const placeholders = trackerIds.map(() => '?').join(',');
  const sql = `
    DELETE FROM trackers
    WHERE id IN (${placeholders}) AND habit_id = ? AND user_id = ?
  `;
  const params = [...trackerIds, habitId, userId];

  const result = await db
    .prepare(sql)
    .bind(...params)
    .run();

  if (!result.success) {
    throw new Error('Failed to remove trackers by IDs');
  }

  return { changes: result.meta.changes || 0 };
}

/**
 * Removes all tracker entries associated with a specific habit for a user.
 */
export async function removeAllByHabit(
  db: D1Database,
  habitId: number,
  userId: string
): Promise<{ changes: number }> {
  const sql = `DELETE FROM trackers WHERE habit_id = ? AND user_id = ?`;
  const params = [habitId, userId];

  const result = await db
    .prepare(sql)
    .bind(...params)
    .run();

  if (!result.success) {
    throw new Error('Failed to remove trackers by habit');
  }

  return { changes: result.meta.changes || 0 };
}

/**
 * Creates a new tracker entry for a habit.
 */
export async function create(
  db: D1Database,
  habitId: number,
  userId: string,
  timestamp: string,
  notes?: string
): Promise<number> {
  const sql = `
    INSERT INTO trackers (habit_id, user_id, timestamp, notes)
    VALUES (?, ?, ?, ?)
  `;
  const params = [habitId, userId, timestamp, notes || null];

  const result = await db
    .prepare(sql)
    .bind(...params)
    .run();

  if (!result.success) {
    throw new Error('Failed to create tracker');
  }

  return result.meta.last_row_id as number;
}

/**
 * Finds all tracker entries for a specific habit, ordered by timestamp descending.
 */
export async function findAllByHabit(
  db: D1Database,
  habitId: number,
  userId: string
): Promise<Tracker[]> {
  const sql = `
    SELECT id, habit_id, user_id, timestamp, notes, created_at, updated_at
    FROM trackers
    WHERE habit_id = ? AND user_id = ? AND deleted_at IS NULL
    ORDER BY timestamp DESC
  `;
  const params = [habitId, userId];

  const result = await db
    .prepare(sql)
    .bind(...params)
    .all();

  if (!result.success) {
    throw new Error('Failed to fetch all trackers for habit');
  }

  return result.results as Tracker[];
}

/**
 * Get all trackers for a specific habit
 */
export async function getAllTrackersForHabit(
  db: D1Database,
  userId: string,
  habitId: string | number
): Promise<TrackerRow[]> {
  const trackers = await db
    .prepare(
      `SELECT * FROM trackers 
       WHERE user_id = ? 
       AND habit_id = ?
       AND deleted_at IS NULL
       ORDER BY timestamp DESC`
    )
    .bind(userId, habitId)
    .all();

  if (!trackers.success) {
    throw new Error(`Failed to fetch trackers for habit ${habitId}`);
  }

  return trackers.results as TrackerRow[];
}

/**
 * Gets the user's progress history showing completion rate for each day
 * This uses a fixed calculation window of the past 365 days to ensure comprehensive tracking
 * Optional date parameters can restrict what's returned to the client but don't affect calculation
 * @param db D1Database instance
 * @param userId User's Clerk ID
 * @param startDate Optional start date (ISO format) to filter returned results
 * @param endDate Optional end date (ISO format) to filter returned results
 * @param timeZone User's timezone (IANA format, e.g., 'America/Los_Angeles')
 * @returns Array of daily completion records with date and completion percentage
 */
export async function getUserProgressHistory(
  db: D1Database,
  userId: string,
  startDate?: string,
  endDate?: string,
  timeZone: string = 'UTC'
): Promise<Array<{ date: string; completionRate: number }>> {
  try {
    if (!isValidTimeZone(timeZone)) {
      console.warn(`Invalid timezone "${timeZone}", falling back to UTC`);
      timeZone = 'UTC';
    }

    const now = new Date();

    // Get today's date in user's timezone (YYYY-MM-DD format)
    const todayInTZ = new Intl.DateTimeFormat('en-CA', { timeZone }).format(
      now
    );

    // Calculate start date (365 days ago in user's timezone)
    const startDateObj = new Date();
    startDateObj.setDate(startDateObj.getDate() - 365);
    const calculationStartDate = new Intl.DateTimeFormat('en-CA', {
      timeZone,
    }).format(startDateObj);

    // Generate list of all dates in range (in user's timezone)
    const dates: string[] = [];
    const currentDate = new Date(calculationStartDate + 'T12:00:00Z'); // Use noon to avoid DST issues
    const endDateObj = new Date(todayInTZ + 'T12:00:00Z');

    while (currentDate <= endDateObj) {
      dates.push(
        new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(
          currentDate
        )
      );
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Fetch all habits for user (including deleted ones for historical accuracy)
    const habitsResult = await db
      .prepare(
        `
        SELECT id, frequency, start_date, end_date, deleted_at
        FROM habits 
        WHERE user_id = ?
      `
      )
      .bind(userId)
      .all();

    if (!habitsResult.success) {
      throw new Error('Failed to fetch habits for progress history');
    }

    const habits = habitsResult.results as Array<{
      id: number;
      frequency: string;
      start_date: string;
      end_date: string | null;
      deleted_at: string | null;
    }>;

    if (habits.length === 0) {
      return [];
    }

    // Fetch all trackers in the date range
    // We need to query with UTC boundaries that cover the entire range in user's timezone
    const rangeStart = getLocaleStartEndForDateKey(
      calculationStartDate,
      timeZone
    ).localeStartISO;
    const rangeEnd = getLocaleStartEndForDateKey(
      todayInTZ,
      timeZone
    ).localeEndISO;

    const trackersResult = await db
      .prepare(
        `
        SELECT habit_id, timestamp 
        FROM trackers 
        WHERE user_id = ? 
        AND timestamp >= ? 
        AND timestamp <= ?
        AND deleted_at IS NULL
      `
      )
      .bind(userId, rangeStart, rangeEnd)
      .all();

    if (!trackersResult.success) {
      throw new Error('Failed to fetch trackers for progress history');
    }

    const trackers = trackersResult.results as Array<{
      habit_id: number;
      timestamp: string;
    }>;

    // Build a map of tracker completions by date (in user's timezone)
    const trackersByDate = new Map<string, Set<number>>();
    for (const tracker of trackers) {
      const trackerDate = trackerDateKey(new Date(tracker.timestamp));
      if (!trackersByDate.has(trackerDate)) {
        trackersByDate.set(trackerDate, new Set());
      }
      trackersByDate.get(trackerDate)!.add(tracker.habit_id);
    }

    // Calculate completion rate for each date
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const history: Array<{ date: string; completionRate: number }> = [];

    for (const dateStr of dates) {
      // Get day of week for this date
      const date = new Date(dateStr + 'T12:00:00Z');
      const dayOfWeek = dayNames[date.getUTCDay()];

      // Count habits that should be active on this date
      let totalHabits = 0;
      const activeHabitIds: number[] = [];

      for (const habit of habits) {
        // Check if habit was active on this date
        const habitStartDate = habit.start_date.split('T')[0];
        const habitEndDate = habit.end_date
          ? habit.end_date.split('T')[0]
          : null;
        const habitDeletedAt = habit.deleted_at
          ? habit.deleted_at.split('T')[0]
          : null;

        // Habit must have started before or on this date
        if (habitStartDate > dateStr) continue;

        // Habit must not have ended before this date
        if (habitEndDate && habitEndDate < dateStr) continue;

        // If habit was deleted, it should still count for dates before deletion
        // (for historical accuracy)
        if (habitDeletedAt && habitDeletedAt <= dateStr) continue;

        // Check if habit is scheduled for this day of week
        const frequencyDays = habit.frequency.split(',');
        if (!frequencyDays.includes(dayOfWeek)) continue;

        totalHabits++;
        activeHabitIds.push(habit.id);
      }

      // Skip days with no scheduled habits
      if (totalHabits === 0) continue;

      // Count completed habits for this date
      const completedHabits = trackersByDate.get(dateStr);
      let completedCount = 0;

      if (completedHabits) {
        for (const habitId of activeHabitIds) {
          if (completedHabits.has(habitId)) {
            completedCount++;
          }
        }
      }

      const completionRate = Math.round((completedCount / totalHabits) * 100);
      history.push({ date: dateStr, completionRate });
    }

    // Sort by date descending (most recent first)
    history.sort((a, b) => b.date.localeCompare(a.date));

    // If startDate and endDate are provided, filter the results to the requested range
    if (startDate || endDate) {
      const filterStart = startDate ? startDate.split('T')[0] : null;
      const filterEnd = endDate ? endDate.split('T')[0] : null;

      return history.filter((entry) => {
        const afterStart = !filterStart || entry.date >= filterStart;
        const beforeEnd = !filterEnd || entry.date <= filterEnd;
        return afterStart && beforeEnd;
      });
    }

    return history;
  } catch (error) {
    console.error('Error fetching user progress history:', error);
    throw error;
  }
}

/**
 * Gets the user's current and longest streaks based on 100% completion days
 * @param db D1Database instance
 * @param userId User's Clerk ID
 * @param timeZone User's timezone (IANA format)
 * @returns Object containing current streak and longest streak
 */
export async function getUserStreaks(
  db: D1Database,
  userId: string,
  timeZone: string = 'UTC'
): Promise<{ currentStreak: number; longestStreak: number }> {
  try {
    if (!isValidTimeZone(timeZone)) {
      console.warn(`Invalid timezone "${timeZone}", falling back to UTC`);
      timeZone = 'UTC';
    }

    // Get the user's progress history with full year of data to ensure accurate streak calculation
    const history = await getUserProgressHistory(
      db,
      userId,
      undefined,
      undefined,
      timeZone
    );

    // history is already ordered newest-first by getUserProgressHistory and
    // contains one entry per *scheduled* day, so the fold can work by array
    // position without re-parsing or re-sorting dates.
    const today = new Intl.DateTimeFormat('en-CA', { timeZone }).format(
      new Date()
    );

    return computeStreaks(history, today);
  } catch (error) {
    console.error('Error calculating user streaks:', error);
    throw error;
  }
}
