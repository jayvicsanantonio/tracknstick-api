// ABOUTME: Unified database management script for Cloudflare D1 operations
// ABOUTME: Handles setup, migration, reset, seeding, and query operations

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

// Setup: Apply single schema file
async function setup() {
  console.log(`🏗️  Setting up database ${isRemote ? '(REMOTE)' : '(LOCAL)'}`);
  
  const schemaFile = path.join(MIGRATIONS_DIR, 'schema.sql');
  
  if (!fs.existsSync(schemaFile)) {
    console.log('❌ Schema file not found at migrations/schema.sql');
    return;
  }
  
  console.log('📄 Applying schema.sql...');
  executeWrangler(`d1 execute ${DB_NAME} --file=${schemaFile} ${remoteFlag}`);
  
  console.log('✅ Database setup complete!');
}

// Reset: Drop all tables and recreate from schema
async function reset() {
  console.log(`🔄 Resetting database ${isRemote ? '(REMOTE)' : '(LOCAL)'}`);
  
  // Drop all tables to start fresh
  const dropCommand = `d1 execute ${DB_NAME} --command "DROP TABLE IF EXISTS trackers; DROP TABLE IF EXISTS habits; DROP TABLE IF EXISTS users;" ${remoteFlag}`;
  executeWrangler(dropCommand);
  
  console.log('🗑️  All tables dropped');
  
  // Reapply schema
  const schemaFile = path.join(MIGRATIONS_DIR, 'schema.sql');
  if (fs.existsSync(schemaFile)) {
    console.log('📄 Applying schema.sql...');
    executeWrangler(`d1 execute ${DB_NAME} --file=${schemaFile} ${remoteFlag}`);
  }
  
  console.log('✅ Database reset complete!');
}

// Migrate: Same as setup for single schema approach
async function migrate() {
  console.log(`📊 Running migrations ${isRemote ? '(REMOTE)' : '(LOCAL)'}`);
  console.log('ℹ️  With single schema approach, migrate = setup');
  
  await setup();
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