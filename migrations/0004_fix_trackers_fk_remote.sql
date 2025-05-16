-- Migration to fix the trackers table foreign key constraint for remote DB
-- The schema is different between local and remote

-- First, create a new temporary table with corrected constraints
CREATE TABLE trackers_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  UNIQUE(habit_id, timestamp)
);

-- Copy all data from the existing trackers table
INSERT INTO trackers_new (id, habit_id, user_id, timestamp, notes)
SELECT id, habit_id, user_id, timestamp, notes FROM trackers;

-- Drop the old table
DROP TABLE trackers;

-- Rename the new table to trackers
ALTER TABLE trackers_new RENAME TO trackers;

-- Recreate any indexes
CREATE INDEX IF NOT EXISTS idx_trackers_habit_id ON trackers(habit_id);
CREATE INDEX IF NOT EXISTS idx_trackers_user_id ON trackers(user_id);
CREATE INDEX IF NOT EXISTS idx_trackers_timestamp ON trackers(timestamp); 