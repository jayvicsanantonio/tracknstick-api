import { D1Database } from '@cloudflare/workers-types';
import { NotFoundError, DatabaseError } from '../utils/errors.js';
import logger from '../utils/logger.js';

interface TrackerRow {
  id: number;
  habit_id: number;
  user_id: string;
  timestamp: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Define Tracker type (same as TrackerRow for now)
type Tracker = TrackerRow;

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
       AND timestamp <= ?`
    )
    .bind(...params)
    .all();

  if (!trackers.success) {
    logger.error('Failed to fetch trackers', undefined, { userId, habitIds, startDate, endDate });
    throw new DatabaseError('Failed to fetch trackers');
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
    WHERE habit_id = ? AND user_id = ?
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
    throw new DatabaseError('Failed to fetch trackers by habit and date range');
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
    WHERE habit_id = ? AND user_id = ?
    ORDER BY timestamp DESC
  `;
  const params = [habitId, userId];

  const result = await db
    .prepare(sql)
    .bind(...params)
    .all();

  if (!result.success) {
    throw new DatabaseError('Failed to fetch all trackers for habit');
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
 * Gets the user's progress history showing completion rate for each day
 * This uses a fixed calculation window of the past 365 days to ensure comprehensive tracking
 * Optional date parameters can restrict what's returned to the client but don't affect calculation
 * @param db D1Database instance
 * @param userId User's Clerk ID
 * @param startDate Optional start date (ISO format) to filter returned results
 * @param endDate Optional end date (ISO format) to filter returned results
 * @returns Array of daily completion records with date and completion percentage
 */
export async function getUserProgressHistory(
  db: D1Database,
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<Array<{ date: string; completionRate: number }>> {
  // Always calculate a full year of history for accurate streak calculation
  // This ensures we have enough data regardless of requested date range
  const fullHistoryStartDate = new Date();
  fullHistoryStartDate.setDate(fullHistoryStartDate.getDate() - 365); // Go back a full year
  const calculationStartDate = fullHistoryStartDate.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  // This query calculates the completion rate for each day using a more efficient date generation approach
  const sql = `
    WITH RECURSIVE dates(date) AS (
      -- Generate dates using recursive CTE instead of many UNIONs
      VALUES(?)
      UNION ALL
      SELECT date(date, '+1 day')
      FROM dates
      WHERE date < ?
    ),
    habit_dates AS (
      -- For each date, count active habits for that day of week
      SELECT 
        d.date,
        COUNT(h.id) AS total_habits
      FROM dates d
      JOIN habits h ON h.user_id = ?
        AND DATE(h.start_date) <= d.date
        AND (h.end_date IS NULL OR DATE(h.end_date) >= d.date)
        AND (
          h.frequency LIKE '%' || SUBSTR('MonTueWedThuFriSatSun', 1 + 3*STRFTIME('%w', d.date), 3) || '%'
          OR h.frequency = SUBSTR('MonTueWedThuFriSatSun', 1 + 3*STRFTIME('%w', d.date), 3)
        )
      GROUP BY d.date
    ),
    completed_habits AS (
      -- For each date, count completed habits
      SELECT 
        DATE(t.timestamp) AS date,
        COUNT(DISTINCT t.habit_id) AS completed_habits
      FROM trackers t
      JOIN habits h ON t.habit_id = h.id AND t.user_id = h.user_id
      WHERE t.user_id = ?
      GROUP BY DATE(t.timestamp)
    )
    -- Join to calculate completion rate
    SELECT 
      hd.date,
      CASE 
        WHEN hd.total_habits = 0 THEN 0
        ELSE ROUND((COALESCE(ch.completed_habits, 0) * 100.0) / hd.total_habits, 2)
      END AS completion_rate
    FROM habit_dates hd
    LEFT JOIN completed_habits ch ON hd.date = ch.date
    WHERE hd.total_habits > 0
    ORDER BY hd.date DESC;
  `;

  try {
    const result = await db
      .prepare(sql)
      .bind(calculationStartDate, today, userId, userId)
      .all();

    if (!result.success) {
      throw new Error('Failed to fetch user progress history');
    }

    // Map results to the expected format
    let history = result.results.map((row) => ({
      date: row.date,
      completionRate: row.completion_rate,
    }));

    // If startDate and endDate are provided, filter the results to the requested range
    if (startDate || endDate) {
      history = history.filter((entry) => {
        const entryDate = entry.date as string;
        const afterStart = !startDate || entryDate >= startDate;
        const beforeEnd = !endDate || entryDate <= endDate;
        return afterStart && beforeEnd;
      });
    }

    return history as { date: string; completionRate: number; }[];
  } catch (error) {
    console.error('Error fetching user progress history:', error);
    throw error;
  }
}

/**
 * Gets the user's current and longest streaks based on 100% completion days
 * @param db D1Database instance
 * @param userId User's Clerk ID
 * @returns Object containing current streak and longest streak
 */
export async function getUserStreaks(
  db: D1Database,
  userId: string
): Promise<{ currentStreak: number; longestStreak: number }> {
  try {
    // Get the user's progress history with full year of data to ensure accurate streak calculation
    const history = await getUserProgressHistory(
      db,
      userId,
      undefined,
      undefined
    );

    // Calculate streaks based on 100% completion days
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Sort by date descending to calculate current streak first
    const sortedHistory = [...history].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Calculate current streak (consecutive 100% days up to today)
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < sortedHistory.length; i++) {
      const entry = sortedHistory[i];

      // Break if we encounter a gap in dates
      if (i === 0 && entry.date !== today) {
        break;
      }

      if (i > 0) {
        const prevDate = new Date(sortedHistory[i - 1].date);
        const currDate = new Date(entry.date);
        const dayDiff = Math.floor(
          (prevDate.getTime() - currDate.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (dayDiff !== 1) {
          break;
        }
      }

      if (entry.completionRate === 100) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    // Sort by date ascending for longest streak calculation
    const chronologicalHistory = [...history].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (let i = 0; i < chronologicalHistory.length; i++) {
      if (chronologicalHistory[i].completionRate === 100) {
        tempStreak++;

        // Check for date continuity
        if (i > 0) {
          const prevDate = new Date(chronologicalHistory[i - 1].date);
          const currDate = new Date(chronologicalHistory[i].date);
          const dayDiff = Math.floor(
            (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)
          );

          // If dates aren't consecutive, reset the temporary streak
          if (dayDiff !== 1) {
            tempStreak = 1; // Reset to 1 (counting current day)
          }
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
      }
    }

    // Check final streak
    longestStreak = Math.max(longestStreak, tempStreak);

    return { currentStreak, longestStreak };
  } catch (error) {
    console.error('Error calculating user streaks:', error);
    throw error;
  }
}
