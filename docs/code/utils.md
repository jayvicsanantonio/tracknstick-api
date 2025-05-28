# Utility Modules

This document provides an overview of the utility modules in the TracknStick API.

## Overview

The `src/utils/` directory contains helper functions and utilities used throughout the application. These utilities abstract common operations and provide functionality that is used across different layers of the application.

## Database Utilities (`dbUtils.js`)

The `dbUtils.js` module provides database connection and operation utilities.

### Key Components

- **Database Connection**: Connects to the SQLite database based on configuration.
- **Promisified Methods**: Wraps SQLite callback-based methods with Promise-based alternatives.
- **Error Handling**: Includes specific error handling for database operations.

### Main Functions

- `dbAll(sql, params)`: Promise-based wrapper for `db.all()` to execute queries returning multiple rows.
- `dbGet(sql, params)`: Promise-based wrapper for `db.get()` to execute queries returning a single row.
- `dbRun(sql, params)`: Promise-based wrapper for `db.run()` to execute queries that modify data (INSERT, UPDATE, DELETE).

### Usage Example

```javascript
const { dbGet, dbAll, dbRun } = require('../utils/dbUtils');

// Query a single record
const habit = await dbGet('SELECT * FROM habits WHERE id = ?', [habitId]);

// Query multiple records
const habits = await dbAll('SELECT * FROM habits WHERE user_id = ?', [userId]);

// Insert a record
const result = await dbRun(
  'INSERT INTO habits (user_id, name, frequency) VALUES (?, ?, ?)',
  [userId, habitName, frequency]
);
const newHabitId = result.lastID;
```

## Date Utilities (`dateUtils.js`)

The `dateUtils.js` module contains functions for manipulating and formatting dates.

### Key Functions

- **Date Formatting**: Functions to format dates in consistent formats.
- **Date Calculations**: Utilities for calculating date differences, ranges, etc.
- **Day of Week Helpers**: Functions to work with days of the week.

### Usage Example

```javascript
const { formatDate, getDayOfWeek } = require('../utils/dateUtils');

// Format a date
const formattedDate = formatDate(new Date(), 'YYYY-MM-DD');

// Get day of week (0-6, where 0 is Sunday)
const dayOfWeek = getDayOfWeek(new Date());
```

## Transaction Utilities (`transactionUtils.js`)

The `transactionUtils.js` module provides utilities for database transactions.

### Key Functions

- `withTransaction(callback)`: Executes a callback function within a database transaction.

### Usage Example

```javascript
const { withTransaction } = require('../utils/transactionUtils');

// Execute operations in a transaction
await withTransaction(async (tx) => {
  // Use transaction object to execute queries
  await tx.run(
    'INSERT INTO habits (user_id, name, frequency) VALUES (?, ?, ?)',
    [userId, habitName, frequency]
  );

  // If any operation fails, the entire transaction will be rolled back
});
```

## Streak Utilities (`streakUtils.js`)

The `streakUtils.js` module contains functions for calculating habit streaks.

### Key Functions

- `calculateCurrentStreak(completions, frequency)`: Calculates the current streak for a habit based on completion history and frequency.
- `isStreakMaintained(lastCompletionDate, frequency)`: Determines if a streak is still active based on last completion date.

### Usage Example

```javascript
const { calculateCurrentStreak } = require('../utils/streakUtils');

// Calculate streak for a habit
const streak = calculateCurrentStreak(habitCompletions, habit.frequency);
```

## Error Utilities (`errors.js`)

The `errors.js` module defines custom error classes used throughout the application.

### Key Error Classes

- `AppError`: Base error class for application errors.
- `NotFoundError`: Error for resources that cannot be found (404).
- `BadRequestError`: Error for invalid request data (400).
- `AuthenticationError`: Error for authentication failures (401).
- `AuthorizationError`: Error for authorization failures (403).
- `DatabaseError`: Error for database operation failures (500).

### Usage Example

```javascript
const { NotFoundError, BadRequestError } = require('../utils/errors');

// Throw a not found error
if (!habit) {
  throw new NotFoundError('Habit not found', 'HABIT_NOT_FOUND');
}

// Throw a bad request error
if (!name || name.trim() === '') {
  throw new BadRequestError('Habit name is required', 'INVALID_INPUT');
}
```

## Best Practices

1. **Utility Function Reuse**: Always use these utility functions instead of reimplementing similar functionality in other layers.
2. **Error Handling**: Use the custom error classes for different error scenarios.
3. **Keep Utilities Pure**: Utility functions should be pure when possible, avoiding side effects.
4. **Documentation**: Add JSDoc comments to utility functions for better code clarity.
5. **Testing**: Write tests for utility functions to ensure they work correctly.

Last Updated: 2024-03-21
