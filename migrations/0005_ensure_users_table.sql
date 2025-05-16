-- Migration to ensure users table is properly configured
-- This is for fixing foreign key constraints issues

-- First, check if the users table exists and ensure it's correctly configured
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clerk_user_id TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on clerk_user_id for better performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);

-- Insert a special record for testing/validation (will only insert if it doesn't exist)
INSERT OR IGNORE INTO users (clerk_user_id) 
VALUES ('user_2reF8pZ7zH3Lo810nVz5NtVJQQh'); 