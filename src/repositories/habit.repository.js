const { dbAll, dbGet, dbRun } = require('../utils/dbUtils'); // Import promise wrappers

async function findHabitsByDay(userId, dayOfWeek) {
  // Note: LIKE query might not be the most performant for large datasets.
  // Consider alternative schema (e.g., separate schedule table) if needed.
  const sql = `
    SELECT id, name, icon, frequency, streak, total_completions, last_completed
    FROM habits
    WHERE user_id = ? AND (',' || frequency || ',') LIKE ?
  `;
  // The dayOfWeek should be wrapped in % for the LIKE query, e.g., '%,Mon,%'
  const params = [userId, `%,${dayOfWeek},%`];
  try {
    const habits = await dbAll(sql, params);
    // Optionally parse frequency string here or in the service layer
    // return habits.map(h => ({ ...h, frequency: h.frequency.split(',') }));
    return habits;
  } catch (error) {
    console.error(`Error in findHabitsByDay repository: ${error.message}`);
    throw new Error('Database error fetching habits by day'); // Throw generic error
  }
}

async function findById(habitId, userId) {
  const sql = `
    SELECT id, name, icon, frequency, streak, total_completions, last_completed
    FROM habits
    WHERE id = ? AND user_id = ?
  `;
  const params = [habitId, userId];
  try {
    const habit = await dbGet(sql, params);
    return habit; // Returns the habit object or undefined if not found
  } catch (error) {
    console.error(`Error in findById habit repository: ${error.message}`);
    throw new Error('Database error fetching habit by ID');
  }
}

async function create(userId, { name, icon, frequency }) {
  // Ensure frequency is stored as a comma-separated string
  const frequencyString = Array.isArray(frequency)
    ? frequency.join(',')
    : frequency;
  const sql = `
    INSERT INTO habits (user_id, name, icon, frequency, streak, total_completions, last_completed)
    VALUES (?, ?, ?, ?, 0, 0, NULL)
  `;
  const params = [userId, name, icon, frequencyString];
  try {
    // Use dbRun to get the lastID
    const result = await dbRun(sql, params);
    // Return the ID of the newly created habit
    return result.lastID;
  } catch (error) {
    console.error(`Error in create habit repository: ${error.message}`);
    // Check for specific errors like UNIQUE constraint if needed
    throw new Error('Database error creating habit');
  }
}

async function update(habitId, userId, { name, icon, frequency }) {
  // Build query dynamically based on provided fields
  const updateFields = [];
  const updateParams = [];

  if (name !== undefined) {
    // Check for undefined to allow setting empty strings if desired
    updateFields.push('name = ?');
    updateParams.push(name);
  }
  if (icon !== undefined) {
    updateFields.push('icon = ?');
    updateParams.push(icon);
  }
  if (frequency !== undefined) {
    // Ensure frequency is stored as string
    const frequencyString = Array.isArray(frequency)
      ? frequency.join(',')
      : frequency;
    updateFields.push('frequency = ?');
    updateParams.push(frequencyString);
  }

  if (updateFields.length === 0) {
    // No fields to update, maybe return early or throw error?
    // Returning 0 changes seems reasonable if no fields provided.
    console.warn('Update called with no fields to update.');
    return { changes: 0 };
  }

  let sql = 'UPDATE habits SET ';
  sql += updateFields.join(', ');
  sql += ' WHERE id = ? AND user_id = ?'; // Ensure user_id match on update
  updateParams.push(habitId, userId);

  try {
    const result = await dbRun(sql, updateParams);
    // Return the number of changes
    return { changes: result.changes };
  } catch (error) {
    console.error(`Error in update habit repository: ${error.message}`);
    throw new Error('Database error updating habit');
  }
}

async function remove(habitId, userId) {
  const sql = `DELETE FROM habits WHERE id = ? AND user_id = ?`;
  const params = [habitId, userId];
  try {
    const result = await dbRun(sql, params);
    // Return the number of changes (should be 1 if successful)
    return { changes: result.changes };
  } catch (error) {
    console.error(`Error in remove habit repository: ${error.message}`);
    throw new Error('Database error removing habit');
  }
}

// Add other habit-related DB functions as needed

module.exports = {
  findHabitsByDay,
  findById,
  create,
  update,
  remove,
};
