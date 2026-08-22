import { D1Database } from '@cloudflare/workers-types';
import { NotFoundError } from '../utils/errors.js';
import { computeStreaks } from '../utils/streakUtils.js';
import {
  summariseCompletion,
  type CompletionSummary,
  type HabitSchedule,
  type TrackerStamp,
} from '../utils/completionRates.js';
import {
  getLocaleStartEndForDateKey,
  isValidTimeZone,
  toLocalDateKey,
} from '../utils/dateUtils.js';
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

  return trackers.results as unknown as TrackerRow[];
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

  return result.results as unknown as Tracker[];
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

  return result.results as unknown as Tracker[];
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

  return trackers.results as unknown as TrackerRow[];
}

/**
 * The longest span of history any caller may ask for. Bounds the day loop
 * when a habit carries an implausible start_date.
 */
const MAX_WINDOW_DAYS = 1830;

/** How far back the progress history and its streaks are calculated. */
const HISTORY_WINDOW_DAYS = 365;

const shiftDateKey = (dateKey: string, days: number): string => {
  const shifted = new Date(`${dateKey}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
};

/**
 * Scores every scheduled day in a window against the habits due on it.
 *
 * One read of habits and one of trackers, scored by the shared
 * summariseCompletion. Progress history, streaks and the day-counting
 * achievements all go through here, so they cannot disagree about which
 * calendar day a completion belongs to.
 *
 * @param windowDays how far back to score; omit to cover the user's whole
 *   history, bounded by MAX_WINDOW_DAYS
 */
export async function getCompletionSummary(
  db: D1Database,
  userId: string,
  timeZone: string = 'UTC',
  windowDays?: number
): Promise<CompletionSummary & { today: string }> {
  if (!isValidTimeZone(timeZone)) {
    console.warn(`Invalid timezone "${timeZone}", falling back to UTC`);
    timeZone = 'UTC';
  }

  const today = toLocalDateKey(new Date(), timeZone);
  const earliestAllowed = shiftDateKey(today, -MAX_WINDOW_DAYS);

  // Deleted habits are included: the days they were live still happened, and
  // dropping them would retroactively raise past completion rates.
  const habitsResult = await db
    .prepare(
      `SELECT id, frequency, start_date, end_date, deleted_at
       FROM habits
       WHERE user_id = ?`
    )
    .bind(userId)
    .all();

  if (!habitsResult.success) {
    throw new Error('Failed to fetch habits for progress history');
  }

  const habits = habitsResult.results as unknown as HabitSchedule[];

  if (habits.length === 0) {
    return { days: [], habitsByDay: new Map(), today };
  }

  const windowStart =
    windowDays === undefined
      ? habits
          .map((habit) => habit.start_date.slice(0, 10))
          .reduce((earliest, key) => (key < earliest ? key : earliest), today)
      : shiftDateKey(today, -windowDays);

  const from = windowStart < earliestAllowed ? earliestAllowed : windowStart;

  const rangeStart = getLocaleStartEndForDateKey(from, timeZone).localeStartISO;
  const rangeEnd = getLocaleStartEndForDateKey(today, timeZone).localeEndISO;

  const trackersResult = await db
    .prepare(
      `SELECT habit_id, timestamp
       FROM trackers
       WHERE user_id = ?
       AND timestamp >= ?
       AND timestamp <= ?
       AND deleted_at IS NULL`
    )
    .bind(userId, rangeStart, rangeEnd)
    .all();

  if (!trackersResult.success) {
    throw new Error('Failed to fetch trackers for progress history');
  }

  const trackers = trackersResult.results as unknown as TrackerStamp[];

  return {
    ...summariseCompletion(habits, trackers, timeZone, from, today),
    today,
  };
}

/**
 * Gets the user's progress history showing completion rate for each day.
 *
 * Scores a fixed window of the past year regardless of the requested range,
 * so a narrow range cannot change the numbers inside it. The date arguments
 * only restrict which of those days are returned.
 *
 * @param startDate Optional start date key (YYYY-MM-DD) to filter results
 * @param endDate Optional end date key (YYYY-MM-DD) to filter results
 * @param timeZone User's timezone (IANA format, e.g., 'America/Los_Angeles')
 */
export async function getUserProgressHistory(
  db: D1Database,
  userId: string,
  startDate?: string,
  endDate?: string,
  timeZone: string = 'UTC'
): Promise<Array<{ date: string; completionRate: number }>> {
  try {
    const { days } = await getCompletionSummary(
      db,
      userId,
      timeZone,
      HISTORY_WINDOW_DAYS
    );

    const filterStart = startDate?.split('T')[0];
    const filterEnd = endDate?.split('T')[0];

    return days
      .filter(
        ({ date }) =>
          (!filterStart || date >= filterStart) &&
          (!filterEnd || date <= filterEnd)
      )
      .map(({ date, completionRate }) => ({ date, completionRate }));
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
    const { days, today } = await getCompletionSummary(
      db,
      userId,
      timeZone,
      HISTORY_WINDOW_DAYS
    );

    // days is newest-first and holds one entry per *scheduled* day, so
    // adjacency in the array is streak adjacency.
    return computeStreaks(days, today);
  } catch (error) {
    console.error('Error calculating user streaks:', error);
    throw error;
  }
}
