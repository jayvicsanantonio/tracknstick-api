const { dbAll, dbGet, dbRun } = require('../utils/dbUtils'); // Import promise wrappers

async function findTrackersByDateRange(
  userId,
  habitIds, // Expect an array of habit IDs
  startDateISO,
  endDateISO // Expect ISO string dates
) {
  if (!habitIds || habitIds.length === 0) {
    return []; // No habits to check trackers for
  }

  // Create placeholders safely for the IN clause
  const placeholders = habitIds.map(() => '?').join(',');
  const sql = `
    SELECT id, habit_id, timestamp, notes -- Select only needed fields
    FROM trackers
    WHERE user_id = ? AND habit_id IN (${placeholders}) AND (timestamp BETWEEN ? AND ?)
  `;
  // Order matters for parameters: userId first, then habitIds, then dates
  const params = [userId, ...habitIds, startDateISO, endDateISO];

  try {
    const trackers = await dbAll(sql, params);
    return trackers;
  } catch (error) {
    console.error(
      `Error in findTrackersByDateRange repository: ${error.message}`
    );
    throw new Error('Database error fetching trackers by date range'); // Throw generic error
  }
}

async function findTrackersByHabitAndDateRange(
  habitId,
  userId,
  startDate, // Optional start date string (YYYY-MM-DD)
  endDate // Optional end date string (YYYY-MM-DD)
) {
  let sql = `
    SELECT id, habit_id, user_id, timestamp, notes
    FROM trackers
    WHERE habit_id = ? AND user_id = ?
  `;
  const params = [habitId, userId];

  // Build query dynamically based on date range
  // Using DATE() function assumes timestamp is stored in a format SQLite understands
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

  // Add ordering
  sql += ` ORDER BY timestamp DESC`;

  try {
    const trackers = await dbAll(sql, params);
    return trackers;
  } catch (error) {
    console.error(
      `Error in findTrackersByHabitAndDateRange repository: ${error.message}`
    );
    throw new Error('Database error fetching trackers by habit and date range');
  }
}

async function findTrackersInDateRange(
  habitId,
  userId,
  startDateISO,
  endDateISO // Expect ISO string dates
) {
  // This is specifically for checking existence within a locale day range
  const sql = `
    SELECT id -- Only need the ID
    FROM trackers
    WHERE habit_id = ? AND user_id = ? AND (timestamp BETWEEN ? AND ?)
  `;
  const params = [habitId, userId, startDateISO, endDateISO];
  try {
    const trackers = await dbAll(sql, params);
    return trackers; // Returns array of {id: ...} or empty array
  } catch (error) {
    console.error(
      `Error in findTrackersInDateRange repository: ${error.message}`
    );
    throw new Error('Database error checking for trackers in date range');
  }
}

async function removeTrackersByIds(trackerIds, habitId, userId) {
  if (!trackerIds || trackerIds.length === 0) {
    return { changes: 0 }; // Nothing to remove
  }
  const placeholders = trackerIds.map(() => '?').join(',');
  const sql = `
    DELETE FROM trackers
    WHERE id IN (${placeholders}) AND habit_id = ? AND user_id = ?
  `;
  // Ensure user owns these trackers for the specific habit
  const params = [...trackerIds, habitId, userId];
  try {
    const result = await dbRun(sql, params);
    return { changes: result.changes };
  } catch (error) {
    console.error(`Error in removeTrackersByIds repository: ${error.message}`);
    throw new Error('Database error removing trackers by IDs');
  }
}

async function removeAllByHabit(habitId, userId) {
  const sql = `DELETE FROM trackers WHERE habit_id = ? AND user_id = ?`;
  const params = [habitId, userId];
  try {
    const result = await dbRun(sql, params);
    // Return the number of changes (can be 0 or more)
    return { changes: result.changes };
  } catch (error) {
    console.error(
      `Error in removeAllByHabit tracker repository: ${error.message}`
    );
    throw new Error('Database error removing trackers by habit');
  }
}

async function create(habitId, userId, timestamp, notes) {
  const sql = `
    INSERT INTO trackers (habit_id, user_id, timestamp, notes)
    VALUES (?, ?, ?, ?)
  `;
  // Use the original UTC timestamp provided
  const params = [habitId, userId, timestamp, notes || null];
  try {
    const result = await dbRun(sql, params);
    return result.lastID; // Return the ID of the new tracker
  } catch (error) {
    console.error(`Error in create tracker repository: ${error.message}`);
    throw new Error('Database error creating tracker');
  }
}

async function findAllByHabit(habitId, userId) {
  // Fetch all trackers for a specific habit, ordered for streak calculation
  const sql = `
    SELECT id, timestamp, notes -- Select only needed fields
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
    throw new Error('Database error fetching all trackers for habit');
  }
}

// Add other tracker-related DB functions as needed

module.exports = {
  findTrackersByDateRange,
  findTrackersByHabitAndDateRange,
  findTrackersInDateRange,
  removeAllByHabit,
  removeTrackersByIds,
  create,
  findAllByHabit,
};
