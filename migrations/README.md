# Database Schema

This directory contains the complete database schema for the TrackNStick API.

## Schema File

- `schema.sql` - Complete database schema with all tables, indexes, and constraints

## Database Management

Use the simplified database management commands:

### Local Development

```bash
# Setup database (apply schema)
pnpm db:setup

# Reset database (drop tables, recreate from schema)
pnpm db:reset

# Apply schema (same as setup)
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

# Reset remote database (DESTRUCTIVE - drops all data)
pnpm db:reset:remote

# Query remote database
pnpm db:query:remote "SELECT COUNT(*) FROM users"
```

## Schema Changes

1. Edit the `schema.sql` file directly
2. Run `pnpm db:reset` to apply changes (WARNING: destroys existing data)
3. For production, backup data first, then run `pnpm db:reset:remote`

## Seeding Data

The `pnpm db:seed` command will create a `seed.sql` file with sample data if one doesn't exist, then apply it to your database.

## Help

For all available commands:
```bash
pnpm db:setup help
```
