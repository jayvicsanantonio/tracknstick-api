const { dbAll, dbGet, dbRun } = require('../utils/dbUtils');
const { DatabaseError } = require('../utils/errors');

/**
 * @description Finds habits for a user scheduled for a specific day of the week.
 * @param {number} userId - The ID of the user.
 * @param {string} dayOfWeek - The short day name (e.g., 'Mon', 'Tue').
 * @returns {Promise<Array<object>>} A promise that resolves to an array of habit objects.
 * @throws {Error} If a database error occurs.
 */
async function findHabitsByDay(userId, dayOfWeek) {
  const sql = `
    SELECT id, name, icon, frequency, streak, longest_streak, total_completions, last_completed
    FROM habits
    WHERE user_id = ? AND (',' || frequency || ',') LIKE ?
  `;
  const params = [userId, `%,${dayOfWeek},%`];
  try {
    const habits = await dbAll(sql, params);
    return habits;
  } catch (error) {
    console.error(`Error in findHabitsByDay repository: ${error.message}`);
    throw new DatabaseError('Failed to fetch habits by day', error);
  }
}

/**
 * @description Finds a specific habit by its ID and user ID.
 * @param {number} habitId - The ID of the habit.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<object|undefined>} A promise that resolves to the habit object or undefined if not found.
 * @throws {Error} If a database error occurs.
 */
async function findById(habitId, userId) {
  const sql = `
    SELECT id, name, icon, frequency, streak, longest_streak, total_completions, last_completed
    FROM habits
    WHERE id = ? AND user_id = ?
  `;
  const params = [habitId, userId];
  try {
    const habit = await dbGet(sql, params);
    return habit;
  } catch (error) {
    console.error(`Error in findById habit repository: ${error.message}`);
    throw new DatabaseError('Failed to fetch habit by ID', error);
  }
}

/**
 * @description Creates a new habit for a user.
 * @param {number} userId - The ID of the user.
 * @param {object} habitData - The habit data.
 * @param {string} habitData.name - The name of the habit.
 * @param {string} [habitData.icon] - The icon for the habit.
 * @param {Array<string>|string} habitData.frequency - The frequency of the habit (array or comma-separated string).
 * @returns {Promise<number>} A promise that resolves to the ID of the newly created habit.
 * @throws {Error} If a database error occurs.
 */
async function create(userId, { name, icon, frequency }) {
  const frequencyString = Array.isArray(frequency)
    ? frequency.join(',')
    : frequency;
  const sql = `
    INSERT INTO habits (user_id, name, icon, frequency, streak, total_completions, last_completed)
    VALUES (?, ?, ?, ?, 0, 0, NULL)
  `;
  const params = [userId, name, icon, frequencyString];
  try {
    const result = await dbRun(sql, params);
    return result.lastID;
  } catch (error) {
    console.error(`Error in create habit repository: ${error.message}`);
    throw new DatabaseError('Failed to create habit', error);
  }
}

/**
 * @description Updates an existing habit for a user.
 * @param {number} habitId - The ID of the habit to update.
 * @param {number} userId - The ID of the user.
 * @param {object} habitData - The habit data to update.
 * @param {string} [habitData.name] - The new name of the habit.
 * @param {string} [habitData.icon] - The new icon for the habit.
 * @param {Array<string>|string} [habitData.frequency] - The new frequency of the habit.
 * @returns {Promise<{changes: number}>} A promise that resolves to an object indicating the number of rows changed.
 * @throws {Error} If a database error occurs.
 */
async function update(habitId, userId, { name, icon, frequency }) {
  const updateFields = [];
  const updateParams = [];

  if (name !== undefined) {
    updateFields.push('name = ?');
    updateParams.push(name);
  }
  if (icon !== undefined) {
    updateFields.push('icon = ?');
    updateParams.push(icon);
  }
  if (frequency !== undefined) {
    const frequencyString = Array.isArray(frequency)
      ? frequency.join(',')
      : frequency;
    updateFields.push('frequency = ?');
    updateParams.push(frequencyString);
  }

  if (updateFields.length === 0) {
    console.warn('Update called with no fields to update.');
    return { changes: 0 };
  }

  let sql = 'UPDATE habits SET ';
  sql += updateFields.join(', ');
  sql += ' WHERE id = ? AND user_id = ?';
  updateParams.push(habitId, userId);

  try {
    const result = await dbRun(sql, updateParams);
    return { changes: result.changes };
  } catch (error) {
    console.error(`Error in update habit repository: ${error.message}`);
    throw new DatabaseError('Failed to update habit', error);
  }
}

/**
 * @description Deletes a habit for a user.
 * @param {number} habitId - The ID of the habit to delete.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<{changes: number}>} A promise that resolves to an object indicating the number of rows changed.
 * @throws {Error} If a database error occurs.
 */
async function remove(habitId, userId) {
  const sql = `DELETE FROM habits WHERE id = ? AND user_id = ?`;
  const params = [habitId, userId];
  try {
    const result = await dbRun(sql, params);
    return { changes: result.changes };
  } catch (error) {
    console.error(`Error in remove habit repository: ${error.message}`);
    throw new DatabaseError('Failed to remove habit', error);
  }
}

/**
 * @description Updates streak information for a habit.
 * @param {number} habitId - The ID of the habit.
 * @param {number} userId - The ID of the user.
 * @param {object} stats - The updated stats.
 * @param {number} stats.streak - The current streak.
 * @param {number} stats.longestStreak - The longest streak.
 * @param {number} stats.totalCompletions - The total number of completions.
 * @param {string} stats.lastCompleted - The timestamp of the last completion.
 * @returns {Promise<{changes: number}>} A promise that resolves to an object indicating the number of rows changed.
 * @throws {Error} If a database error occurs.
 */
async function updateStats(
  habitId,
  userId,
  { streak, longestStreak, totalCompletions, lastCompleted }
) {
  const sql = `
    UPDATE habits 
    SET streak = ?,
        longest_streak = ?,
        total_completions = ?,
        last_completed = ?
    WHERE id = ? AND user_id = ?
  `;
  const params = [
    streak,
    longestStreak,
    totalCompletions,
    lastCompleted,
    habitId,
    userId,
  ];
  try {
    const result = await dbRun(sql, params);
    return { changes: result.changes };
  } catch (error) {
    console.error(`Error in updateStats habit repository: ${error.message}`);
    throw new DatabaseError('Failed to update habit stats', error);
  }
}

module.exports = {
  findHabitsByDay,
  findById,
  create,
  update,
  remove,
  updateStats,
};
