-- Reset script - Drops all tables to start fresh
-- WARNING: This will delete ALL data

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS trackers;
DROP TABLE IF EXISTS habits;
DROP TABLE IF EXISTS users;

-- Drop any remaining indexes
DROP INDEX IF EXISTS idx_habits_user_id;
DROP INDEX IF EXISTS idx_habits_start_date;
DROP INDEX IF EXISTS idx_habits_end_date;
DROP INDEX IF EXISTS idx_habits_deleted_at;
DROP INDEX IF EXISTS idx_trackers_user_id;
DROP INDEX IF EXISTS idx_trackers_habit_id;
DROP INDEX IF EXISTS idx_trackers_timestamp;
DROP INDEX IF EXISTS idx_trackers_deleted_at;
DROP INDEX IF EXISTS idx_achievements_key;
DROP INDEX IF EXISTS idx_achievements_type;
DROP INDEX IF EXISTS idx_achievements_category;
DROP INDEX IF EXISTS idx_user_achievements_user_id;
DROP INDEX IF EXISTS idx_user_achievements_achievement_id;
DROP INDEX IF EXISTS idx_user_achievements_earned_at;