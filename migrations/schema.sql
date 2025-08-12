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

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  type TEXT NOT NULL, -- habit_creation, streak, completion, milestone
  category TEXT NOT NULL, -- getting_started, consistency, dedication, milestones
  requirement_type TEXT NOT NULL, -- count, streak, days, percentage
  requirement_value INTEGER NOT NULL,
  requirement_data TEXT, -- JSON for complex requirements
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User achievements table (tracks which achievements users have earned)
CREATE TABLE IF NOT EXISTS user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  achievement_id INTEGER NOT NULL,
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  progress_data TEXT, -- JSON for achievement progress tracking
  FOREIGN KEY (user_id) REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
  UNIQUE(user_id, achievement_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_deleted_at ON habits(deleted_at);
CREATE INDEX IF NOT EXISTS idx_trackers_habit_id ON trackers(habit_id);
CREATE INDEX IF NOT EXISTS idx_trackers_user_id ON trackers(user_id);
CREATE INDEX IF NOT EXISTS idx_trackers_timestamp ON trackers(timestamp);
CREATE INDEX IF NOT EXISTS idx_trackers_deleted_at ON trackers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_achievements_key ON achievements(key);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(type);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON user_achievements(earned_at);