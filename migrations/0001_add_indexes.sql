-- Migration: Add indexes for performance optimization

-- Add index for habits by user_id (for fast filtering of habits by user)
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);

-- Add index for habits by start_date and end_date (for date range queries)
CREATE INDEX IF NOT EXISTS idx_habits_dates ON habits(start_date, end_date);

-- Add composite index for habits frequency filtering
CREATE INDEX IF NOT EXISTS idx_habits_frequency ON habits(user_id, frequency);

-- Add index for trackers by habit_id (for fetching trackers for a specific habit)
CREATE INDEX IF NOT EXISTS idx_trackers_habit_id ON trackers(habit_id);

-- Add index for trackers by user_id (for fetching all user trackers)
CREATE INDEX IF NOT EXISTS idx_trackers_user_id ON trackers(user_id);

-- Add index for trackers by timestamp (for date range queries)
CREATE INDEX IF NOT EXISTS idx_trackers_timestamp ON trackers(timestamp);

-- Add composite index for tracker queries that filter by habit_id and date range
CREATE INDEX IF NOT EXISTS idx_trackers_habit_date ON trackers(habit_id, timestamp);

-- Add composite index for tracker queries that filter by user_id and date range
CREATE INDEX IF NOT EXISTS idx_trackers_user_date ON trackers(user_id, timestamp); 