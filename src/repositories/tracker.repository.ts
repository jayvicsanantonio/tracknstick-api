// @ts-nocheck
// Add this comment to suppress TypeScript errors during migration to Hono
import { D1Database } from '@cloudflare/workers-types';
import { NotFoundError } from '../utils/errors.js';
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
       AND timestamp <= ?`
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
       ORDER BY timestamp DESC`
    )
    .bind(userId, habitId)
    .all();

  if (!trackers.success) {
    throw new Error(`Failed to fetch trackers for habit ${habitId}`);
  }

  return trackers.results as TrackerRow[];
}
