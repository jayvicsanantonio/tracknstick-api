// @ts-check
/**
 * Script to migrate habit data from the old frequency format to the new format
 * This is a one-time migration for existing data
 *
 * Run with: node scripts/migrate-frequency-data.js
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

// Define the temporary output files
const EXPORT_FILE = path.resolve('migrations', 'frequency_migration_temp.sql');
const MIGRATION_FILE = path.resolve('migrations', 'frequency_migration.sql');

// Export current data
console.log('Exporting current habits data...');
execSync(
  `wrangler d1 execute tracknstick-db --command "SELECT * FROM habits" --json > ${EXPORT_FILE}`
);

// Read the exported data
console.log('Processing habits data...');
const exportedData = JSON.parse(readFileSync(EXPORT_FILE, 'utf-8'));
const habits = exportedData.results;

if (!habits || habits.length === 0) {
  console.log('No habits found to migrate.');
  process.exit(0);
}

// Create migration SQL statements
const migrationStatements = habits.map((habit) => {
  const {
    id,
    frequency_type = 'daily',
    frequency_days = null,
    frequency_dates = null,
  } = habit;

  // Create the new frequency JSON structure
  const frequency = {
    type: frequency_type,
    days: frequency_days ? frequency_days.split(',').map(Number) : undefined,
    dates: frequency_dates ? frequency_dates.split(',').map(Number) : undefined,
  };

  // Get the most recent tracker for this habit to set last_completed
  const lastCompletedQuery = `
    SELECT MAX(timestamp) as last_timestamp
    FROM trackers
    WHERE habit_id = ${id};
  `;

  // Create update statement
  return `
  -- Migrate habit ID ${id}
  UPDATE habits SET 
    frequency = '${JSON.stringify(frequency)}',
    total_completions = (SELECT COUNT(*) FROM trackers WHERE habit_id = ${id}),
    longest_streak = ${habit.best_streak || 0},
    last_completed = (${lastCompletedQuery})
    WHERE id = ${id};
  `;
});

// Write migration SQL file
const migrationScript = `-- Migration script for updating frequency format
-- Generated on ${new Date().toISOString()}

BEGIN TRANSACTION;

${migrationStatements.join('\n')}

COMMIT;
`;

writeFileSync(MIGRATION_FILE, migrationScript);

console.log(`Migration file created at ${MIGRATION_FILE}`);
console.log('To apply the migration, run:');
console.log(`wrangler d1 execute tracknstick-db --file=${MIGRATION_FILE}`);
