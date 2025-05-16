-- Migration to fix the user_id column type in the habits table
-- The user_id in habits is INTEGER but should be TEXT to match Clerk IDs

-- First, drop any existing constraints and indexes
DROP INDEX IF EXISTS idx_habits_user_id;
DROP INDEX IF EXISTS idx_habits_dates;

-- Create a new table with the correct column type
CREATE TABLE habits_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  frequency TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  streak INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(clerk_user_id) ON DELETE CASCADE
);

-- Transfer any existing data
-- Use a cross join with users to get the clerk_user_id that matches the user id
INSERT OR IGNORE INTO habits_new (
  id, user_id, name, icon, frequency, 
  start_date, end_date, streak, total_completions, 
  longest_streak, last_completed
)
SELECT 
  h.id,
  u.clerk_user_id as user_id,
  h.name, 
  h.icon, 
  h.frequency,
  h.start_date, 
  h.end_date, 
  h.streak, 
  h.total_completions, 
  h.longest_streak, 
  h.last_completed
FROM habits h
JOIN users u ON h.user_id = u.id;

-- Drop the old table
DROP TABLE habits;

-- Rename the new table
ALTER TABLE habits_new RENAME TO habits;

-- Recreate the indexes
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_dates ON habits(start_date, end_date); 