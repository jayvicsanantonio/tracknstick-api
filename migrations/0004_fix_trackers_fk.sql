-- Migration to fix the trackers table foreign key constraint
-- The trackers table still has a FK constraint to the old habits_old table which doesn't exist

-- First, create a new temporary table with corrected constraints
CREATE TABLE trackers_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  UNIQUE(habit_id, timestamp)
);

-- Copy all data from the existing trackers table
INSERT INTO trackers_new
SELECT * FROM trackers;

-- Drop the old table
DROP TABLE trackers;

-- Rename the new table to trackers
ALTER TABLE trackers_new RENAME TO trackers;

-- Recreate any indexes
CREATE INDEX IF NOT EXISTS idx_trackers_habit_id ON trackers(habit_id);
CREATE INDEX IF NOT EXISTS idx_trackers_user_id ON trackers(user_id);
CREATE INDEX IF NOT EXISTS idx_trackers_timestamp ON trackers(timestamp); 