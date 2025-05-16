-- Migration: Recreate habits table with updated schema
-- Since SQLite doesn't support ALTER TABLE to drop or rename columns,
-- we need to recreate the table with the new schema.

-- Step 1: Rename current habits table
ALTER TABLE habits RENAME TO habits_old;

-- Step 2: Create new habits table with updated schema
CREATE TABLE habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  frequency TEXT NOT NULL,
  start_date TEXT NOT NULL, -- ISO format timestamp
  end_date TEXT, -- ISO format timestamp
  streak INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(clerk_user_id) ON DELETE CASCADE
);

-- Step 3: Copy data from old table to new table, converting as necessary
INSERT INTO habits (
  id, user_id, name, icon, frequency, start_date, end_date,
  streak, total_completions, longest_streak, last_completed, created_at, updated_at
)
SELECT
  id, user_id, name, icon,
  -- Convert old frequency fields to JSON string
  json_object(
    'type', frequency_type,
    'days', frequency_days,
    'dates', frequency_dates
  ),
  start_date, end_date,
  streak, 
  0 as total_completions, -- Initialize with 0
  best_streak as longest_streak,
  NULL as last_completed, -- Initialize as NULL
  created_at, updated_at
FROM habits_old;

-- Step 4: Drop old table
DROP TABLE habits_old;

-- Step 5: Recreate necessary indexes
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_dates ON habits(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_habits_frequency ON habits(user_id, frequency);

-- Step 6: Update total_completions for each habit
UPDATE habits
SET total_completions = (
  SELECT COUNT(*)
  FROM trackers
  WHERE trackers.habit_id = habits.id
);

-- Step 7: Update last_completed for each habit
UPDATE habits
SET last_completed = (
  SELECT MAX(timestamp)
  FROM trackers
  WHERE trackers.habit_id = habits.id
); 