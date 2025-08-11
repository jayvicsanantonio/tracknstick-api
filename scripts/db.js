// ABOUTME: Unified database management script for Cloudflare D1 operations
// ABOUTME: Handles setup, migration, reset, seeding, and query operations

#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_NAME = 'tracknstick-db';
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

// Get command line arguments
const [,, command, ...args] = process.argv;
const isRemote = args.includes('--remote');
const remoteFlag = isRemote ? '--remote' : '';

// Helper function to execute wrangler commands
function executeWrangler(command, options = {}) {
  try {
    console.log(`🚀 Executing: ${command}`);
    const result = execSync(`pnpm exec wrangler ${command}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      ...options
    });
    return result;
  } catch (error) {
    console.error(`❌ Failed to execute: ${command}`);
    throw error;
  }
}

// Get all migration files in order
function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql') && file.match(/^\d{4}_/))
    .sort();
  
  return files.map(file => path.join(MIGRATIONS_DIR, file));
}

// Setup: Apply all migrations from scratch
async function setup() {
  console.log(`🏗️  Setting up database ${isRemote ? '(REMOTE)' : '(LOCAL)'}`);
  
  const migrations = getMigrationFiles();
  
  if (migrations.length === 0) {
    console.log('⚠️  No migration files found');
    return;
  }
  
  console.log(`📁 Found ${migrations.length} migration files`);
  
  for (const migration of migrations) {
    const filename = path.basename(migration);
    console.log(`📄 Applying ${filename}...`);
    executeWrangler(`d1 execute ${DB_NAME} --file=${migration} ${remoteFlag}`);
  }
  
  console.log('✅ Database setup complete!');
}

// Reset: Clear all data and reapply schema
async function reset() {
  console.log(`🔄 Resetting database ${isRemote ? '(REMOTE)' : '(LOCAL)'}`);
  
  // Clear all data
  const clearCommand = `d1 execute ${DB_NAME} --command "DELETE FROM trackers; DELETE FROM habits; DELETE FROM users;" ${remoteFlag}`;
  executeWrangler(clearCommand);
  
  console.log('🗑️  All data cleared');
  
  // Reapply schema (initial migration only)
  const initialMigration = path.join(MIGRATIONS_DIR, '0000_initial_schema.sql');
  if (fs.existsSync(initialMigration)) {
    console.log('📄 Reapplying initial schema...');
    executeWrangler(`d1 execute ${DB_NAME} --file=${initialMigration} ${remoteFlag}`);
  }
  
  console.log('✅ Database reset complete!');
}

// Migrate: Apply any pending migrations
async function migrate() {
  console.log(`📊 Running migrations ${isRemote ? '(REMOTE)' : '(LOCAL)'}`);
  
  // For D1, we'll apply all migrations since there's no built-in migration tracking
  // In a more sophisticated setup, you'd track applied migrations
  const migrations = getMigrationFiles();
  
  for (const migration of migrations) {
    const filename = path.basename(migration);
    try {
      console.log(`📄 Applying ${filename}...`);
      executeWrangler(`d1 execute ${DB_NAME} --file=${migration} ${remoteFlag}`);
      console.log(`✅ Applied ${filename}`);
    } catch (error) {
      console.log(`⚠️  ${filename} may already be applied or failed`);
    }
  }
  
  console.log('✅ Migration complete!');
}

// Seed: Add sample/test data
async function seed() {
  console.log(`🌱 Seeding database ${isRemote ? '(REMOTE)' : '(LOCAL)'}`);
  
  const seedFile = path.join(MIGRATIONS_DIR, 'seed.sql');
  
  if (!fs.existsSync(seedFile)) {
    console.log('⚠️  No seed file found. Creating sample seed...');
    
    const sampleSeed = `-- Sample seed data
INSERT OR IGNORE INTO users (clerk_user_id) VALUES ('user_test123');

INSERT OR IGNORE INTO habits (user_id, name, icon, frequency_type, frequency_days, start_date, streak, best_streak) 
VALUES 
  ('user_test123', 'Morning Exercise', '🏃', 'daily', NULL, '2024-01-01', 0, 0),
  ('user_test123', 'Read Books', '📚', 'daily', NULL, '2024-01-01', 0, 0),
  ('user_test123', 'Drink Water', '💧', 'daily', NULL, '2024-01-01', 0, 0);
`;
    
    fs.writeFileSync(seedFile, sampleSeed);
    console.log('📄 Created sample seed file');
  }
  
  executeWrangler(`d1 execute ${DB_NAME} --file=${seedFile} ${remoteFlag}`);
  console.log('✅ Database seeded!');
}

// Query: Interactive query runner
async function query() {
  const sqlQuery = args.find(arg => !arg.startsWith('--'));
  
  if (!sqlQuery) {
    console.log('❓ Usage: pnpm db:query "SELECT * FROM users" [--remote]');
    return;
  }
  
  console.log(`🔍 Executing query ${isRemote ? '(REMOTE)' : '(LOCAL)'}: ${sqlQuery}`);
  executeWrangler(`d1 execute ${DB_NAME} --command="${sqlQuery}" ${remoteFlag}`);
}

// Show help
function showHelp() {
  console.log(`
📚 Database Management Commands:

  pnpm db:setup          Setup database (apply all migrations)
  pnpm db:reset          Clear all data and reapply schema
  pnpm db:migrate        Apply pending migrations
  pnpm db:seed           Add sample/test data
  pnpm db:query "SQL"    Execute a SQL query

Remote Operations (add --remote to any command):
  pnpm db:setup:remote   Setup remote database
  pnpm db:reset:remote   Reset remote database
  pnpm db:migrate:remote Apply migrations to remote

Examples:
  pnpm db:setup
  pnpm db:query "SELECT COUNT(*) FROM habits"
  pnpm db:reset:remote
`);
}

// Main execution
async function main() {
  try {
    switch (command) {
      case 'setup':
        await setup();
        break;
      case 'reset':
        await reset();
        break;
      case 'migrate':
        await migrate();
        break;
      case 'seed':
        await seed();
        break;
      case 'query':
        await query();
        break;
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
      default:
        console.log('❌ Unknown command:', command);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('💥 Database operation failed:', error.message);
    process.exit(1);
  }
}

main();