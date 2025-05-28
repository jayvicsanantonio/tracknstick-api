# Database Queries

This document provides a reference for common database queries used in the TracknStick API.

## Overview

The TracknStick API uses SQLite as its database and interacts with it through the `sqlite3` package. Database operations are abstracted using the repository pattern, with utility functions for common operations.

## Database Utility Functions

All database operations are performed using the utility functions in `src/utils/dbUtils.js`:

```javascript
const { dbAll, dbGet, dbRun } = require('../utils/dbUtils');
```

- **dbGet(sql, params)**: Fetch a single row
- **dbAll(sql, params)**: Fetch multiple rows
- **dbRun(sql, params)**: Execute statements that don't return rows (INSERT, UPDATE, DELETE, etc.)

## Repository Layer

Database queries are encapsulated in the repository layer:

```
src/repositories/
├── habit.repository.js
├── tracker.repository.js
└── user.repository.js
```

## Common Query Patterns

### Select Queries

#### Get by ID

Used to retrieve a single record by its ID:

```javascript
// Get a habit by ID for a specific user
async function getHabitById(habitId, userId) {
  try {
    return await dbGet('SELECT * FROM habits WHERE id = ? AND user_id = ?', [
      habitId,
      userId,
    ]);
  } catch (error) {
    console.error('Error in getHabitById:', error);
    throw new DatabaseError('Failed to retrieve habit', error);
  }
}
```

#### Get All Records

Used to retrieve multiple records:

```javascript
// Get all habits for a user
async function getAllHabits(userId) {
  try {
    return await dbAll(
      'SELECT * FROM habits WHERE user_id = ? ORDER BY id DESC',
      [userId]
    );
  } catch (error) {
    console.error('Error in getAllHabits:', error);
    throw new DatabaseError('Failed to retrieve habits', error);
  }
}
```

#### Filtering Records

Filtering records based on specific criteria:

```javascript
// Get habits with a specific frequency
async function getHabitsByFrequency(userId, frequencyDay) {
  try {
    // Use LIKE to find habits where frequency contains the day
    return await dbAll(
      `SELECT * FROM habits 
       WHERE user_id = ? 
       AND frequency LIKE ?
       ORDER BY id DESC`,
      [userId, `%${frequencyDay}%`]
    );
  } catch (error) {
    console.error('Error in getHabitsByFrequency:', error);
    throw new DatabaseError('Failed to retrieve habits by frequency', error);
  }
}
```

### Insert Queries

Used to create new records:

```javascript
// Create a new habit
async function createHabit(habitData) {
  try {
    const { user_id, name, icon, frequency } = habitData;

    const result = await dbRun(
      `INSERT INTO habits (user_id, name, icon, frequency, streak, total_completions)
       VALUES (?, ?, ?, ?, 0, 0)`,
      [user_id, name, icon, frequency]
    );

    return { id: result.lastID, ...habitData, streak: 0, total_completions: 0 };
  } catch (error) {
    console.error('Error in createHabit:', error);
    throw new DatabaseError('Failed to create habit', error);
  }
}
```

### Update Queries

Used to modify existing records:

```javascript
// Update a habit
async function updateHabit(habitId, userId, habitData) {
  try {
    const { name, icon, frequency } = habitData;

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }

    if (icon !== undefined) {
      updateFields.push('icon = ?');
      updateValues.push(icon);
    }

    if (frequency !== undefined) {
      updateFields.push('frequency = ?');
      updateValues.push(frequency);
    }

    if (updateFields.length === 0) {
      return false; // No fields to update
    }

    // Add habitId and userId to the values array
    updateValues.push(habitId, userId);

    const result = await dbRun(
      `UPDATE habits 
       SET ${updateFields.join(', ')} 
       WHERE id = ? AND user_id = ?`,
      updateValues
    );

    return result.changes > 0;
  } catch (error) {
    console.error('Error in updateHabit:', error);
    throw new DatabaseError('Failed to update habit', error);
  }
}
```

### Delete Queries

Used to remove records:

```javascript
// Delete a habit
async function deleteHabit(habitId, userId) {
  try {
    const result = await dbRun(
      'DELETE FROM habits WHERE id = ? AND user_id = ?',
      [habitId, userId]
    );

    return result.changes > 0;
  } catch (error) {
    console.error('Error in deleteHabit:', error);
    throw new DatabaseError('Failed to delete habit', error);
  }
}
```

### Join Queries

Used to retrieve data from multiple tables:

```javascript
// Get habit completions with habit details
async function getHabitCompletions(userId, startDate, endDate) {
  try {
    return await dbAll(
      `SELECT t.*, h.name as habit_name, h.icon as habit_icon
       FROM trackers t
       JOIN habits h ON t.habit_id = h.id
       WHERE t.user_id = ?
       AND t.timestamp BETWEEN ? AND ?
       ORDER BY t.timestamp DESC`,
      [userId, startDate, endDate]
    );
  } catch (error) {
    console.error('Error in getHabitCompletions:', error);
    throw new DatabaseError('Failed to retrieve habit completions', error);
  }
}
```

### Aggregate Queries

Used to calculate statistics and summaries:

```javascript
// Get habit completion statistics
async function getHabitStats(habitId, userId) {
  try {
    return await dbGet(
      `SELECT 
         COUNT(*) as total_completions,
         MAX(timestamp) as last_completed
       FROM trackers
       WHERE habit_id = ? AND user_id = ?`,
      [habitId, userId]
    );
  } catch (error) {
    console.error('Error in getHabitStats:', error);
    throw new DatabaseError('Failed to retrieve habit statistics', error);
  }
}
```

### Conditional Queries

Using SQL conditions for complex logic:

```javascript
// Find habits due today
async function getDueHabits(userId, dayOfWeek) {
  try {
    return await dbAll(
      `SELECT * FROM habits
       WHERE user_id = ?
       AND frequency LIKE ?
       AND (last_completed IS NULL OR DATE(last_completed) < DATE('now'))
       ORDER BY id DESC`,
      [userId, `%${dayOfWeek}%`]
    );
  } catch (error) {
    console.error('Error in getDueHabits:', error);
    throw new DatabaseError('Failed to retrieve due habits', error);
  }
}
```

## Transactions

For operations that require multiple queries to be atomic:

```javascript
const { withTransaction } = require('../utils/transactionUtils');

// Delete a habit and all its trackers in a transaction
async function deleteHabitWithTrackers(habitId, userId) {
  try {
    return await withTransaction(async (tx) => {
      // Delete trackers first (child records)
      await tx.run('DELETE FROM trackers WHERE habit_id = ? AND user_id = ?', [
        habitId,
        userId,
      ]);

      // Then delete the habit (parent record)
      const result = await tx.run(
        'DELETE FROM habits WHERE id = ? AND user_id = ?',
        [habitId, userId]
      );

      return result.changes > 0;
    });
  } catch (error) {
    console.error('Error in deleteHabitWithTrackers:', error);
    throw new DatabaseError('Failed to delete habit and its trackers', error);
  }
}
```

## Query Performance Optimization

### Indexed Queries

Queries taking advantage of indexed columns for better performance:

```javascript
// Using indexes for efficient queries
async function getTrackersByDate(userId, date) {
  try {
    // This query uses the idx_trackers_habit_user_ts index
    return await dbAll(
      `SELECT t.*, h.name as habit_name
       FROM trackers t
       JOIN habits h ON t.habit_id = h.id
       WHERE t.user_id = ?
       AND DATE(t.timestamp) = DATE(?)
       ORDER BY t.timestamp DESC`,
      [userId, date]
    );
  } catch (error) {
    console.error('Error in getTrackersByDate:', error);
    throw new DatabaseError('Failed to retrieve trackers by date', error);
  }
}
```

### Query Limitations

Using LIMIT and OFFSET for pagination:

```javascript
// Paginated habit list
async function getHabitsPaginated(userId, limit, offset) {
  try {
    return await dbAll(
      `SELECT * FROM habits
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
  } catch (error) {
    console.error('Error in getHabitsPaginated:', error);
    throw new DatabaseError('Failed to retrieve paginated habits', error);
  }
}
```

## Best Practices

1. **Always use parameterized queries**: Never concatenate user input directly into SQL strings.
2. **Include user_id in queries**: For security, always filter by user_id to ensure users can only access their own data.
3. **Handle errors**: Catch and properly handle database errors, logging them and throwing appropriate custom errors.
4. **Use transactions for multiple operations**: When multiple related changes need to be atomic, use transactions.
5. **Keep repositories focused**: Each repository should focus on a specific entity or table.
6. **Use descriptive function names**: Functions should clearly indicate what data they're retrieving or operation they're performing.
7. **Optimize queries**: Use indexes appropriately and avoid unnecessary joins or complex queries.

Last Updated: 2024-03-21
