-- Reset script - Drops all tables to start fresh
-- WARNING: This will delete ALL data
--
-- Executed by `pnpm db:reset` (scripts/db.js), which then reapplies
-- schema.sql. Keep this list in step with the tables in schema.sql.

-- Reverse dependency order, so children go before their parents
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS trackers;
DROP TABLE IF EXISTS habits;
DROP TABLE IF EXISTS users;

-- No DROP INDEX statements: SQLite drops a table's indexes with the table,
-- so every one of them was a no-op here. Two of them
-- (idx_habits_start_date, idx_habits_end_date) named indexes that
-- schema.sql has never created.
