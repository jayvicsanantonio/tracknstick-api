-- Migration to add timestamp columns to the habits table
-- The created_at and updated_at columns were missing after the type fix migration

-- Add empty timestamp columns first
ALTER TABLE habits ADD COLUMN created_at TEXT;
ALTER TABLE habits ADD COLUMN updated_at TEXT;

-- Update the columns with the current timestamp
UPDATE habits SET created_at = DATETIME('now'), updated_at = DATETIME('now');

-- For users table if needed (first check if columns exist)
ALTER TABLE users ADD COLUMN created_at TEXT;
ALTER TABLE users ADD COLUMN updated_at TEXT;

-- Update user timestamps
UPDATE users SET created_at = DATETIME('now'), updated_at = DATETIME('now')
WHERE created_at IS NULL; 