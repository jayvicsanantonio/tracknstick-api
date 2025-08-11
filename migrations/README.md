# Database Migrations

This directory contains database migrations for the TrackNStick API.

## Migration Files

- `0000_initial_schema.sql` - Initial schema setup for users, habits, and trackers tables
- `0001_add_indexes.sql` - Added indexes for improved query performance
- `0002_recreate_habits_table.sql` - Modified habits table schema with improved frequency support
- `0003_fix_habits_old_reference.sql` - Fixed potential issues with partially applied migrations
- `0004_fix_trackers_fk.sql` - Fixed foreign key in trackers table that referenced non-existent habits_old table
- `0005_ensure_users_table.sql` - Ensured users table exists with proper structure
- `0006_fix_user_id_type.sql` - Fixed user ID type consistency
- `0007_add_timestamp_columns.sql` - Added timestamp columns to tables
- `0008_add_timestamps_to_trackers.sql` - Added timestamps to trackers table

## Database Management

Use the simplified database management commands:

### Local Development

```bash
# Setup database (apply all migrations)
pnpm db:setup

# Reset database (clear data, reapply schema)
pnpm db:reset

# Apply migrations
pnpm db:migrate

# Add sample data
pnpm db:seed

# Run SQL queries
pnpm db:query "SELECT COUNT(*) FROM habits"
```

### Remote Production

Add `:remote` to any command:

```bash
# Setup remote database
pnpm db:setup:remote

# Reset remote database
pnpm db:reset:remote

# Query remote database
pnpm db:query:remote "SELECT COUNT(*) FROM users"
```

## Creating New Migrations

1. Create a new migration file with sequential numbering:

   ```bash
   touch migrations/0009_add_habit_categories.sql
   ```

2. Write your SQL migration in the file

3. Apply the migration:
   ```bash
   pnpm db:migrate
   ```

## Seeding Data

The `pnpm db:seed` command will create a `seed.sql` file with sample data if one doesn't exist, then apply it to your database.

## Help

For all available commands:
```bash
pnpm db:setup help
```
