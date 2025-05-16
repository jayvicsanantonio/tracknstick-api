-- Migration to fix potential issues with habits_old table
-- This handles the case where the migration 0002 did not complete properly

-- First, check if the habits table exists
SELECT name FROM sqlite_master WHERE type='table' AND name='habits';

-- If habits_old table exists (which is not expected in normal conditions), drop it
DROP TABLE IF EXISTS habits_old;

-- Ensure the habits table has the expected structure
-- If the habits table doesn't exist, create it
CREATE TABLE IF NOT EXISTS habits (
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

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_dates ON habits(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_habits_frequency ON habits(user_id, frequency);

-- Update counters in case they're missing
UPDATE habits
SET total_completions = COALESCE((
  SELECT COUNT(*)
  FROM trackers
  WHERE trackers.habit_id = habits.id
), 0)
WHERE 1=1;

-- Update last_completed in case it's missing
UPDATE habits
SET last_completed = (
  SELECT MAX(timestamp)
  FROM trackers
  WHERE trackers.habit_id = habits.id
)
WHERE last_completed IS NULL AND EXISTS (
  SELECT 1 FROM trackers WHERE trackers.habit_id = habits.id
); 