const { dbAll, dbGet, dbRun } = require('../utils/dbUtils');
const { DatabaseError } = require('../utils/errors');

/**
 * @description Finds tracker entries for multiple habits within a specific ISO date range for a user.
 * @param {number} userId - The ID of the user.
 * @param {Array<number>} habitIds - An array of habit IDs.
 * @param {string} startDateISO - The start date in ISO 8601 format (UTC).
 * @param {string} endDateISO - The end date in ISO 8601 format (UTC).
 * @returns {Promise<Array<object>>} A promise that resolves to an array of tracker objects.
 * @throws {Error} If a database error occurs.
 */
async function findTrackersByDateRange(
  userId,
  habitIds,
  startDateISO,
  endDateISO
) {
  if (!habitIds || habitIds.length === 0) {
    return [];
  }

  const placeholders = habitIds.map(() => '?').join(',');
  const sql = `
    SELECT id, habit_id, timestamp, notes
    FROM trackers
    WHERE user_id = ? AND habit_id IN (${placeholders}) AND (timestamp BETWEEN ? AND ?)
  `;
  const params = [userId, ...habitIds, startDateISO, endDateISO];

  try {
    const trackers = await dbAll(sql, params);
    return trackers;
  } catch (error) {
    console.error(
      `Error in findTrackersByDateRange repository: ${error.message}`
    );
    throw new DatabaseError('Failed to fetch trackers by date range', error);
  }
}

/**
 * @description Finds tracker entries for a specific habit, optionally filtered by a date range (YYYY-MM-DD).
 * @param {number} habitId - The ID of the habit.
 * @param {number} userId - The ID of the user.
 * @param {string} [startDate] - Optional start date string (YYYY-MM-DD).
 * @param {string} [endDate] - Optional end date string (YYYY-MM-DD).
 * @returns {Promise<Array<object>>} A promise that resolves to an array of tracker objects.
 * @throws {Error} If a database error occurs.
 */
async function findTrackersByHabitAndDateRange(
  habitId,
  userId,
  startDate,
  endDate
) {
  let sql = `
    SELECT id, habit_id, user_id, timestamp, notes
    FROM trackers
    WHERE habit_id = ? AND user_id = ?
  `;
  const params = [habitId, userId];

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

  try {
    const trackers = await dbAll(sql, params);
    return trackers;
  } catch (error) {
    console.error(
      `Error in findTrackersByHabitAndDateRange repository: ${error.message}`
    );
    throw new DatabaseError(
      'Failed to fetch trackers by habit and date range',
      error
    );
  }
}

/**
 * @description Finds tracker IDs for a specific habit within a precise ISO date range (used for checking existence).
 * @param {number} habitId - The ID of the habit.
 * @param {number} userId - The ID of the user.
 * @param {string} startDateISO - The start date in ISO 8601 format (UTC).
 * @param {string} endDateISO - The end date in ISO 8601 format (UTC).
 * @returns {Promise<Array<{id: number}>>} A promise that resolves to an array of objects containing tracker IDs.
 * @throws {Error} If a database error occurs.
 */
async function findTrackersInDateRange(
  habitId,
  userId,
  startDateISO,
  endDateISO
) {
  const sql = `
    SELECT id
    FROM trackers
    WHERE habit_id = ? AND user_id = ? AND (timestamp BETWEEN ? AND ?)
  `;
  const params = [habitId, userId, startDateISO, endDateISO];
  try {
    const trackers = await dbAll(sql, params);
    return trackers;
  } catch (error) {
    console.error(
      `Error in findTrackersInDateRange repository: ${error.message}`
    );
    throw new DatabaseError(
      'Failed to check for trackers in date range',
      error
    );
  }
}

/**
 * @description Removes specific tracker entries by their IDs for a given habit and user.
 * @param {Array<number>} trackerIds - An array of tracker IDs to remove.
 * @param {number} habitId - The ID of the associated habit.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<{changes: number}>} A promise that resolves to an object indicating the number of rows changed.
 * @throws {Error} If a database error occurs.
 */
async function removeTrackersByIds(trackerIds, habitId, userId) {
  if (!trackerIds || trackerIds.length === 0) {
    return { changes: 0 };
  }
  const placeholders = trackerIds.map(() => '?').join(',');
  const sql = `
    DELETE FROM trackers
    WHERE id IN (${placeholders}) AND habit_id = ? AND user_id = ?
  `;
  const params = [...trackerIds, habitId, userId];
  try {
    const result = await dbRun(sql, params);
    return { changes: result.changes };
  } catch (error) {
    console.error(`Error in removeTrackersByIds repository: ${error.message}`);
    throw new DatabaseError('Failed to remove trackers by IDs', error);
  }
}

/**
 * @description Removes all tracker entries associated with a specific habit for a user.
 * @param {number} habitId - The ID of the habit.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<{changes: number}>} A promise that resolves to an object indicating the number of rows changed.
 * @throws {Error} If a database error occurs.
 */
async function removeAllByHabit(habitId, userId) {
  const sql = `DELETE FROM trackers WHERE habit_id = ? AND user_id = ?`;
  const params = [habitId, userId];
  try {
    const result = await dbRun(sql, params);
    return { changes: result.changes };
  } catch (error) {
    console.error(
      `Error in removeAllByHabit tracker repository: ${error.message}`
    );
    throw new DatabaseError('Failed to remove trackers by habit', error);
  }
}

/**
 * @description Creates a new tracker entry for a habit.
 * @param {number} habitId - The ID of the habit.
 * @param {number} userId - The ID of the user.
 * @param {string} timestamp - The timestamp of the tracker entry (ISO 8601 format, UTC).
 * @param {string} [notes] - Optional notes for the tracker entry.
 * @returns {Promise<number>} A promise that resolves to the ID of the newly created tracker.
 * @throws {Error} If a database error occurs.
 */
async function create(habitId, userId, timestamp, notes) {
  const sql = `
    INSERT INTO trackers (habit_id, user_id, timestamp, notes)
    VALUES (?, ?, ?, ?)
  `;
  const params = [habitId, userId, timestamp, notes || null];
  try {
    const result = await dbRun(sql, params);
    return result.lastID;
  } catch (error) {
    console.error(`Error in create tracker repository: ${error.message}`);
    throw new DatabaseError('Failed to create tracker', error);
  }
}

/**
 * @description Finds all tracker entries for a specific habit, ordered by timestamp descending.
 * @param {number} habitId - The ID of the habit.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of tracker objects.
 * @throws {Error} If a database error occurs.
 */
async function findAllByHabit(habitId, userId) {
  const sql = `
    SELECT id, timestamp, notes
    FROM trackers
    WHERE habit_id = ? AND user_id = ?
    ORDER BY timestamp DESC
  `;
  const params = [habitId, userId];
  try {
    const trackers = await dbAll(sql, params);
    return trackers;
  } catch (error) {
    console.error(
      `Error in findAllByHabit tracker repository: ${error.message}`
    );
    throw new DatabaseError('Failed to fetch all trackers for habit', error);
  }
}

module.exports = {
  findTrackersByDateRange,
  findTrackersByHabitAndDateRange,
  findTrackersInDateRange,
  removeAllByHabit,
  removeTrackersByIds,
  create,
  findAllByHabit,
};
