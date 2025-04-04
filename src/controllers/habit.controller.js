// Placeholder functions - implementation will be moved here later
// TODO: Move db require to repository layer later
const db = require('../../db');
const { promisify } = require('util'); // For promisifying db methods

// Promisify db methods for async/await usage
// TODO: Move these wrappers to a dedicated db utility or repository base class
const dbAll = promisify(db.all).bind(db);
const dbGet = promisify(db.get).bind(db);
// Custom promise wrapper for db.run to handle 'this' context
const dbRun = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      // Use function() to access 'this'
      if (err) {
        console.error('DB Run Error:', err);
        reject(err);
      } else {
        // Resolve with an object containing lastID and changes
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

const getHabits = async (req, res, next) => {
  const { userId } = req; // From authenticate middleware
  const { date, timeZone } = req.query;

  // --- Basic Input Validation ---
  if (!date) {
    // Use next(error) for centralized error handling later
    return res.status(400).json({ error: 'Date parameter is required' });
  }
  const utcDate = new Date(date);
  if (Number.isNaN(utcDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }
  if (!timeZone) {
    return res.status(400).json({ error: 'TimeZone parameter is required' });
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid timeZone format' });
  }
  // --- End Validation ---

  try {
    // --- Logic to be moved to Service Layer ---
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    });
    const dayOfWeek = formatter.format(utcDate);

    // --- DB Call 1: Get Habits for the day (Move to Repository) ---
    const habitQuery = `SELECT * FROM habits WHERE user_id = ? AND (',' || frequency || ',') LIKE ?`;
    const habitRows = await dbAll(habitQuery, [userId, `%,${dayOfWeek},%`]);

    if (!habitRows || habitRows.length === 0) {
      return res.json([]); // No habits scheduled for this day
    }

    // --- DB Call 2: Get Trackers for the found habits on the specific date (Move to Repository) ---
    const habitIds = habitRows.map((habitRow) => habitRow.id);
    // Use helper for locale dates (to be created in utils)
    const localeDate = new Date(
      utcDate.toLocaleString('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      })
    );
    const localeStart = new Date(
      localeDate.getFullYear(),
      localeDate.getMonth(),
      localeDate.getDate(),
      0,
      0,
      0,
      0
    );
    const localeEnd = new Date(
      localeDate.getFullYear(),
      localeDate.getMonth(),
      localeDate.getDate(),
      23,
      59,
      59,
      999
    );

    // Create placeholders safely
    const placeholders = habitIds.map(() => '?').join(',');
    const trackerQuery = `SELECT habit_id FROM trackers WHERE habit_id IN (${placeholders}) AND user_id = ? AND (timestamp BETWEEN ? AND ?)`;
    const trackerParams = [
      ...habitIds,
      userId,
      localeStart.toISOString(),
      localeEnd.toISOString(),
    ];
    const trackerRows = await dbAll(trackerQuery, trackerParams);

    const completedHabitIds = new Set(
      trackerRows.map((trackRow) => trackRow.habit_id)
    );
    // --- End DB Calls ---

    // --- Data Transformation (Move to Service Layer or keep in Controller if simple) ---
    const habits = habitRows.map((habitRow) => ({
      id: habitRow.id,
      name: habitRow.name,
      icon: habitRow.icon,
      frequency: habitRow.frequency.split(','), // Consider moving parsing to repo/service
      completed: completedHabitIds.has(habitRow.id),
      // Basic stats - full stats calculation is a separate endpoint
      stats: {
        totalCompletions: habitRow.total_completions,
        streak: habitRow.streak, // Use stored streak for now
        lastCompleted: habitRow.last_completed,
      },
    }));
    // --- End Data Transformation ---

    res.json(habits);
  } catch (error) {
    console.error('Error in getHabits controller:', error); // Log error
    next(error); // Pass error to centralized handler
  }
};

const createHabit = async (req, res, next) => {
  const { userId } = req;
  const { name, icon, frequency } = req.body;

  // --- Basic Input Validation ---
  // TODO: Move to dedicated validation middleware (e.g., express-validator)
  if (!name || !icon || !Array.isArray(frequency) || frequency.length === 0) {
    return res.status(400).json({
      error: 'Missing or invalid required fields (name, icon, frequency array)',
    });
  }
  // --- End Validation ---

  try {
    // --- Logic to be moved to Service Layer ---
    const frequencyString = frequency.join(','); // Store frequency as comma-separated string

    // --- DB Call (Move to Repository) ---
    const query = `
      INSERT INTO habits (user_id, name, icon, frequency, streak, total_completions, last_completed)
      VALUES (?, ?, ?, ?, 0, 0, NULL)
    `;
    // Use the promisified dbRun which resolves with { lastID, changes }
    // Need to wrap db.run differently to get lastID easily with promises or use a better library
    // Temporary workaround: Use original callback style for insert to get lastID easily
    const insertStmt = db.prepare(query);
    insertStmt.run(userId, name, icon, frequencyString, function (err) {
      // Use function() to access 'this'
      if (err) {
        console.error('Error creating habit:', err);
        // Pass error to centralized handler
        return next(new Error('Failed to create habit')); // Use generic error for now
      }
      res.status(201).json({
        message: 'Habit created successfully',
        habitId: this.lastID, // Get the ID of the created habit
      });
    });
    insertStmt.finalize(); // Finalize after run completes
    // --- End DB Call ---
  } catch (error) {
    console.error('Error in createHabit controller:', error);
    next(error); // Pass error to centralized handler
  }
};

const updateHabit = async (req, res, next) => {
  const { userId } = req;
  const { habitId } = req.params;
  const { name, icon, frequency } = req.body;

  // --- Basic Input Validation ---
  // TODO: Move to dedicated validation middleware
  if (!name && !icon && !frequency) {
    return res.status(400).json({
      error:
        'At least one field (name, icon, frequency) is required for update',
    });
  }
  if (frequency && (!Array.isArray(frequency) || frequency.length === 0)) {
    return res
      .status(400)
      .json({ error: 'Frequency must be a non-empty array if provided' });
  }
  // --- End Validation ---

  try {
    // --- DB Call 1: Check if habit exists and belongs to user (Move to Repository) ---
    const checkQuery = `SELECT 1 FROM habits WHERE id = ? AND user_id = ?`;
    const row = await dbGet(checkQuery, [habitId, userId]);

    if (!row) {
      return res
        .status(404)
        .json({ error: 'Habit not found or not authorized' });
    }
    // --- End DB Call 1 ---

    // --- Logic to build update query (Move to Service/Repository) ---
    let updateQuery = 'UPDATE habits SET ';
    const updateParams = [];
    const updateFields = [];

    if (name) {
      updateFields.push('name = ?');
      updateParams.push(name);
    }
    if (icon) {
      updateFields.push('icon = ?');
      updateParams.push(icon);
    }
    if (frequency) {
      updateFields.push('frequency = ?');
      updateParams.push(frequency.join(',')); // Store as string
    }

    if (updateFields.length === 0) {
      // Should be caught by initial validation, but good failsafe
      return res
        .status(400)
        .json({ error: 'No valid fields provided for update' });
    }

    updateQuery += updateFields.join(', ');
    updateQuery += ' WHERE id = ? AND user_id = ?'; // Ensure user_id match on update
    updateParams.push(habitId, userId);
    // --- End Query Building ---

    // --- DB Call 2: Execute Update (Move to Repository) ---
    // Using dbRun promisified wrapper
    const result = await dbRun(updateQuery, updateParams);

    if (result.changes === 0) {
      // This might happen in race conditions or if ID/user combo somehow becomes invalid
      // Or if the data provided was the same as existing data (not strictly an error)
      console.warn(`Habit update for ID ${habitId} resulted in 0 changes.`);
      // Decide if this should be an error or success - returning success for now
      // return res.status(404).json({ error: 'Habit not found or update failed' });
    }

    res.status(200).json({ message: 'Habit updated successfully' });
    // --- End DB Call 2 ---
  } catch (error) {
    console.error('Error in updateHabit controller:', error);
    next(error); // Pass error to centralized handler
  }
};

const deleteHabit = async (req, res, next) => {
  const { userId } = req;
  const { habitId } = req.params;

  try {
    // --- DB Call 1: Check if habit exists and belongs to user (Move to Repository) ---
    const checkQuery = `SELECT 1 FROM habits WHERE id = ? AND user_id = ?`;
    const row = await dbGet(checkQuery, [habitId, userId]);

    if (!row) {
      return res
        .status(404)
        .json({ error: 'Habit not found or not authorized' });
    }
    // --- End DB Call 1 ---

    // --- DB Call 2: Delete associated trackers (Move to Repository/Service with Transaction) ---
    // IMPORTANT: In a real app, this and the habit deletion should be in a transaction
    const deleteTrackersQuery = `DELETE FROM trackers WHERE habit_id = ? AND user_id = ?`;
    await dbRun(deleteTrackersQuery, [habitId, userId]);
    // We don't strictly need to check result.changes here, as it's okay if there were no trackers
    // --- End DB Call 2 ---

    // --- DB Call 3: Delete the habit itself (Move to Repository/Service with Transaction) ---
    const deleteHabitQuery = `DELETE FROM habits WHERE id = ? AND user_id = ?`;
    const result = await dbRun(deleteHabitQuery, [habitId, userId]);

    if (result.changes === 0) {
      // Should not happen if checkQuery passed, but indicates a potential issue
      console.error(
        `Failed to delete habit ID ${habitId} after successful check.`
      );
      return next(new Error('Failed to delete habit after check'));
    }
    // --- End DB Call 3 ---

    res.status(200).json({ message: 'Habit deleted successfully' });
  } catch (error) {
    console.error('Error in deleteHabit controller:', error);
    next(error); // Pass error to centralized handler
  }
};

const getTrackers = async (req, res, next) => {
  const { userId } = req;
  const { habitId } = req.params;
  const { startDate, endDate } = req.query;

  // --- Basic Input Validation ---
  // TODO: Move to dedicated validation middleware
  if (
    (startDate && Number.isNaN(new Date(startDate).getTime())) ||
    (endDate && Number.isNaN(new Date(endDate).getTime()))
  ) {
    return res.status(400).json({ error: 'Invalid date format provided' });
  }
  // --- End Validation ---

  try {
    // --- DB Call 1: Check if habit exists and belongs to user (Move to Repository) ---
    const checkQuery = `SELECT 1 FROM habits WHERE id = ? AND user_id = ?`;
    const habitRow = await dbGet(checkQuery, [habitId, userId]);

    if (!habitRow) {
      return res
        .status(404)
        .json({ error: 'Habit not found or not authorized' });
    }
    // --- End DB Call 1 ---

    // --- DB Call 2: Fetch Trackers (Move to Repository) ---
    let selectQuery = `SELECT * FROM trackers WHERE habit_id = ? AND user_id = ?`;
    const queryParams = [habitId, userId];

    // Build query dynamically based on date range
    // Using DATE() function assumes timestamp is stored in a format SQLite understands (like ISO 8601)
    if (startDate && endDate) {
      selectQuery += ` AND DATE(timestamp) BETWEEN DATE(?) AND DATE(?)`;
      queryParams.push(startDate, endDate);
    } else if (startDate) {
      selectQuery += ` AND DATE(timestamp) >= DATE(?)`;
      queryParams.push(startDate);
    } else if (endDate) {
      selectQuery += ` AND DATE(timestamp) <= DATE(?)`;
      queryParams.push(endDate);
    }
    // Add ordering
    selectQuery += ` ORDER BY timestamp DESC`;

    const trackerRows = await dbAll(selectQuery, queryParams);
    // --- End DB Call 2 ---

    res.json(trackerRows);
  } catch (error) {
    console.error('Error in getTrackers controller:', error);
    next(error); // Pass error to centralized handler
  }
};

const manageTracker = async (req, res, next) => {
  const { userId } = req;
  const { habitId } = req.params;
  const { timestamp, timeZone, notes } = req.body; // notes is optional

  // --- Basic Input Validation ---
  // TODO: Move to dedicated validation middleware
  if (!timestamp || !timeZone) {
    return res
      .status(400)
      .json({ error: 'Missing required fields: timestamp, timeZone' });
  }
  const utcDate = new Date(timestamp);
  if (Number.isNaN(utcDate.getTime())) {
    return res.status(400).json({ error: 'Invalid timestamp format' });
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid timeZone format' });
  }
  // --- End Validation ---

  try {
    // --- Logic to get date boundaries (Move to utils/service) ---
    const localeDate = new Date(
      utcDate.toLocaleString('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      })
    );
    const localeStart = new Date(
      localeDate.getFullYear(),
      localeDate.getMonth(),
      localeDate.getDate(),
      0,
      0,
      0,
      0
    );
    const localeEnd = new Date(
      localeDate.getFullYear(),
      localeDate.getMonth(),
      localeDate.getDate(),
      23,
      59,
      59,
      999
    );
    const localeStartISO = localeStart.toISOString();
    const localeEndISO = localeEnd.toISOString();
    // --- End Date Logic ---

    // --- DB Call 1: Check for existing tracker on that locale date (Move to Repository) ---
    const checkQuery = `SELECT id FROM trackers WHERE habit_id = ? AND user_id = ? AND (timestamp BETWEEN ? AND ?)`;
    const existingTrackers = await dbAll(checkQuery, [
      habitId,
      userId,
      localeStartISO,
      localeEndISO,
    ]);
    // --- End DB Call 1 ---

    if (existingTrackers.length > 0) {
      // --- DB Call 2a: Delete existing tracker(s) for that day (Move to Repository) ---
      // It's possible (though unlikely with current logic) to have multiple; delete all found
      const existingIds = existingTrackers.map((t) => t.id);
      const placeholders = existingIds.map(() => '?').join(',');
      const deleteQuery = `DELETE FROM trackers WHERE id IN (${placeholders}) AND habit_id = ? AND user_id = ?`;
      // Ensure we only delete the ones we found for this user/habit
      const deleteParams = [...existingIds, habitId, userId];
      await dbRun(deleteQuery, deleteParams);

      res.status(200).json({ message: 'Tracker removed successfully' }); // Use 200 OK for removal
      // --- End DB Call 2a ---
    } else {
      // --- DB Call 2b: Insert new tracker (Move to Repository) ---
      // Use the original UTC timestamp provided by the client
      const insertQuery = `INSERT INTO trackers (habit_id, user_id, timestamp, notes) VALUES (?, ?, ?, ?)`;
      // Need callback style again to get lastID easily
      const insertStmt = db.prepare(insertQuery);
      insertStmt.run(habitId, userId, timestamp, notes || null, function (err) {
        if (err) {
          console.error('Error inserting tracker:', err);
          return next(new Error('Failed to insert tracker'));
        }
        res.status(201).json({
          message: 'Tracker added successfully',
          trackerId: this.lastID,
        });
      });
      insertStmt.finalize();
      // --- End DB Call 2b ---
    }
  } catch (error) {
    console.error('Error in manageTracker controller:', error);
    next(error); // Pass error to centralized handler
  }
};

// TODO: Move streak calculation logic to a utility/service function
function calculateStreak(trackerRows, frequency, timeZone) {
  if (!trackerRows || trackerRows.length === 0) {
    return 0;
  }

  // Ensure trackers are sorted descending by timestamp (should be done by query ideally)
  const sortedTrackers = [...trackerRows].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  const uniqueCompletionDates = [
    ...new Set(
      sortedTrackers.map((row) => {
        const utcDate = new Date(row.timestamp);
        // 'en-CA' gives YYYY-MM-DD format, reliable for date comparisons
        return utcDate.toLocaleDateString('en-CA', { timeZone });
      })
    ),
  ]; // Already sorted descending due to map order from sortedTrackers

  let currentStreak = 0;
  const today = new Date();
  let currentDate = new Date(today.toLocaleDateString('en-CA', { timeZone })); // Start checking from today in user's timezone

  for (let i = 0; i < uniqueCompletionDates.length; i++) {
    const completionDate = new Date(uniqueCompletionDates[i]);
    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    });

    // Check if the completion date matches the date we are currently checking
    if (completionDate.getTime() !== currentDate.getTime()) {
      // If the most recent completion wasn't today, check if it was yesterday
      if (i === 0) {
        const yesterday = new Date(currentDate);
        yesterday.setDate(currentDate.getDate() - 1);
        if (completionDate.getTime() === yesterday.getTime()) {
          // Most recent completion was yesterday, start checking streak from yesterday
          currentDate = yesterday;
        } else {
          // Most recent completion was neither today nor yesterday, streak is 0
          break; // Exit loop, streak is 0
        }
      } else {
        // Gap detected (completion wasn't on the expected previous day), streak broken
        break; // Exit loop
      }
    }

    // Now, check if the habit was scheduled for this day (currentDate)
    const dayOfWeek = dayFormatter.format(currentDate);
    if (frequency.includes(dayOfWeek)) {
      // Habit was scheduled and completed on this day
      currentStreak++;
    } else {
      // Habit was completed but *not* scheduled for this day.
      // Typical streak logic: only count if scheduled. Some apps might count anyway.
      // Current logic: Only increment if scheduled. If not scheduled, we still
      // need to check the *previous* day, so don't break, just don't increment.
    }

    // Move to the previous day for the next iteration
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return currentStreak;
}

const getHabitStats = async (req, res, next) => {
  const { userId } = req;
  const { habitId } = req.params;
  const { timeZone } = req.query;

  // --- Basic Input Validation ---
  if (!timeZone) {
    return res.status(400).json({ error: 'TimeZone parameter is required' });
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid timeZone format' });
  }
  // --- End Validation ---

  try {
    // --- DB Call 1: Get Habit Frequency (Move to Repository) ---
    const habitQuery = `SELECT frequency FROM habits WHERE id = ? AND user_id = ?`;
    const habitRow = await dbGet(habitQuery, [habitId, userId]);

    if (!habitRow) {
      return res
        .status(404)
        .json({ error: 'Habit not found or not authorized' });
    }
    const frequency = habitRow.frequency.split(','); // Array of days like 'Mon', 'Tue'
    // --- End DB Call 1 ---

    // --- DB Call 2: Get All Tracker Timestamps (Move to Repository) ---
    const trackerQuery = `SELECT timestamp FROM trackers WHERE habit_id = ? AND user_id = ? ORDER BY timestamp DESC`;
    const trackerRows = await dbAll(trackerQuery, [habitId, userId]);
    // --- End DB Call 2 ---

    // --- Calculate Stats (Move logic to Service Layer) ---
    const totalCompletions = trackerRows.length;
    const lastCompleted =
      trackerRows.length > 0 ? trackerRows[0].timestamp : null;
    const currentStreak = calculateStreak(trackerRows, frequency, timeZone); // Use helper function
    // --- End Calculation ---

    res.json({
      habit_id: habitId, // Ensure consistency (use habitId from params)
      user_id: userId,
      streak: currentStreak,
      total_completions: totalCompletions,
      last_completed: lastCompleted,
    });
  } catch (error) {
    console.error('Error in getHabitStats controller:', error);
    next(error); // Pass error to centralized handler
  }
};

module.exports = {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  getTrackers,
  manageTracker,
  getHabitStats,
};
