# Database Migrations

This directory contains database migrations for the TrackNStick API.

## Migration Files

- `0000_initial_schema.sql` - Initial schema setup for users, habits, and trackers tables
- `0001_add_indexes.sql` - Added indexes for improved query performance
- `0002_recreate_habits_table.sql` - Modified habits table schema with improved frequency support
- `0003_fix_habits_old_reference.sql` - Fixed potential issues with partially applied migrations
- `0004_fix_trackers_fk.sql` - Fixed foreign key in trackers table that referenced non-existent habits_old table
- `0004_fix_trackers_fk_remote.sql` - Same fix adapted for the remote database schema
- `data_import.sql` - Generated file containing data imported from SQLite (created by the migration script)

## Migrating from SQLite to D1

### Step 1: Export Data from SQLite

Run the data export script:

```bash
# Install dependencies if needed
npm install sqlite3

# Run the export script
node scripts/migrate-data.js
```

This will create a `data_import.sql` file in this directory containing all your data.

### Step 2: Apply the Migration to D1

First, make sure you have applied the schema:

```bash
# Apply schema to local D1 database (for testing)
npx wrangler d1 execute tracknstick-db --file=./migrations/0000_initial_schema.sql

# Apply schema to remote D1 database (for production)
npx wrangler d1 execute tracknstick-db --file=./migrations/0000_initial_schema.sql --remote
```

Then import the data:

```bash
# Import data to local D1 database (for testing)
npx wrangler d1 execute tracknstick-db --file=./migrations/data_import.sql

# Import data to remote D1 database (for production)
npx wrangler d1 execute tracknstick-db --file=./migrations/data_import.sql --remote
```

### Step 3: Verify the Migration

You can run SQL queries to verify your data has been imported correctly:

```bash
# Check data in local D1 database
npx wrangler d1 execute tracknstick-db --command="SELECT COUNT(*) FROM habits"

# Check data in remote D1 database
npx wrangler d1 execute tracknstick-db --command="SELECT COUNT(*) FROM habits" --remote
```

## Creating New Migrations

1. Create a new migration file with a sequential prefix:

   ```bash
   touch migrations/0001_add_habit_categories.sql
   ```

2. Write your SQL migration in the file, including both `UP` and `DOWN` migrations if possible

3. Apply the migration:
   ```bash
   npx wrangler d1 execute tracknstick-db --file=./migrations/0001_add_habit_categories.sql
   ```

## Rollback Strategy

Cloudflare D1 doesn't have built-in rollback functionality, so we need to plan for it:

1. Always create an inverse migration for each migration
2. Store the migration history in your codebase
3. To roll back, manually apply the inverse migration

Example rollback:

```bash
# Roll back the latest migration
npx wrangler d1 execute tracknstick-db --file=./migrations/rollbacks/0001_rollback.sql --remote
```

## Google integration migration
Run this migration locally:

```sh
wrangler d1 execute tracknstick-db --file=./migrations/0009_google_integration.sql
```

Or against remote:

```sh
wrangler d1 execute tracknstick-db --file=./migrations/0009_google_integration.sql --remote
```
