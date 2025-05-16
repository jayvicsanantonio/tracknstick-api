-- Migration to add timestamp columns to the trackers table
-- The created_at and updated_at columns are missing from trackers table

-- Add empty timestamp columns first
ALTER TABLE trackers ADD COLUMN created_at TEXT;
ALTER TABLE trackers ADD COLUMN updated_at TEXT;

-- Update the columns with the current timestamp
UPDATE trackers SET created_at = DATETIME('now'), updated_at = DATETIME('now'); 