-- TrackNStick Complete Database Schema
-- Single source of truth for all database structure

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clerk_user_id TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Habits table
CREATE TABLE IF NOT EXISTS habits (
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(clerk_user_id) ON DELETE CASCADE
);

-- Trackers table
CREATE TABLE IF NOT EXISTS trackers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  UNIQUE(habit_id, timestamp)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_deleted_at ON habits(deleted_at);
CREATE INDEX IF NOT EXISTS idx_trackers_habit_id ON trackers(habit_id);
CREATE INDEX IF NOT EXISTS idx_trackers_user_id ON trackers(user_id);
CREATE INDEX IF NOT EXISTS idx_trackers_timestamp ON trackers(timestamp);
CREATE INDEX IF NOT EXISTS idx_trackers_deleted_at ON trackers(deleted_at);