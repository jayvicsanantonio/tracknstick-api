#!/usr/bin/env node

/**
 * Script to apply migrations in production via Wrangler CLI
 * Usage: node scripts/apply_migration.js <migration-file-name>
 * Example: node scripts/apply_migration.js 0005_ensure_users_table.sql
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the migration file from command line args
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Please provide a migration file name');
  console.error('Usage: node scripts/apply_migration.js <migration-file-name>');
  process.exit(1);
}

// Check if the migration file exists
const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
if (!fs.existsSync(migrationPath)) {
  console.error(`Migration file not found: ${migrationPath}`);
  process.exit(1);
}

// Read the migration SQL
const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

// Create a temporary SQL file with the migration contents
const tempSqlFile = path.join(__dirname, 'temp_migration.sql');
fs.writeFileSync(tempSqlFile, migrationSql);

try {
  // Run the migration using wrangler
  console.log('Applying migration to production...');
  execSync(`npx wrangler d1 execute tracknstick-db --file=${tempSqlFile}`, {
    stdio: 'inherit',
  });

  console.log('Migration applied successfully!');
} catch (error) {
  console.error('Failed to apply migration:', error);
  process.exit(1);
} finally {
  // Clean up temp file
  if (fs.existsSync(tempSqlFile)) {
    fs.unlinkSync(tempSqlFile);
  }
}
