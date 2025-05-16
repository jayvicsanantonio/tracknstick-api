# Troubleshooting Guide

This document contains solutions for common issues you might encounter when working with the TrackNStick API.

## Database Issues

### Error: "D1_ERROR: no such table: users: SQLITE_ERROR"

**Problem:**
This error occurs when the database migrations have not been applied to your local D1 development database.

**Solution:**
Run the following commands to apply the migrations:

```bash
# Apply initial schema
npm run db:migrate

# Apply indexes
wrangler d1 execute tracknstick-db --file=./migrations/0001_add_indexes.sql
```

After running these commands, restart your development server with `npm run dev:local`.

### Error about missing columns or incorrect column types

**Problem:**
After schema changes, you might encounter errors related to missing columns or incorrect column types.

**Solution:**
The database schema has been updated and simplified in version 2.0.0. Major changes include:

1. The `frequency_type`, `frequency_days`, and `frequency_dates` columns have been replaced with a single `frequency` column that stores a JSON string.
2. `best_streak` has been renamed to `longest_streak`.
3. A new `total_completions` column has been added.
4. A new `last_completed` column has been added to track when the habit was last marked as completed.

If you see errors related to these columns, make sure you've applied all migrations:

```bash
# Apply initial schema
npm run db:migrate

# Apply indexes
wrangler d1 execute tracknstick-db --file=./migrations/0001_add_indexes.sql
```

If you're upgrading from an older version, you can migrate your existing data using:

```bash
npm run db:migrate:frequency
```

This will generate a migration script that updates your existing habits with the new schema format.

### Error: "table habits has no column named frequency"

**Problem:**
This error occurs when the database schema hasn't been updated to the new format that uses a single `frequency` column instead of the separate `frequency_type`, `frequency_days`, and `frequency_dates` columns.

**Solution:**
Run the table migration script to update the habits table schema:

```bash
npm run db:migrate:update
```

This migration script:

1. Renames the existing habits table
2. Creates a new habits table with the updated schema
3. Migrates the data, converting the frequency fields to a JSON string
4. Recreates the necessary indexes
5. Updates the total_completions and last_completed fields

If you're using a remote database, use:

```bash
npm run db:migrate:update:remote
```

## Authentication Issues

### Error: "Invalid authorization header"

**Problem:**
This error occurs when making API requests without a valid Clerk authentication token.

**Solution:**
Make sure you include a valid JWT token in the Authorization header of your requests:

```
Authorization: Bearer YOUR_CLERK_JWT_TOKEN
```

You can obtain a valid token by authenticating a user through the Clerk frontend integration.

## Deployment Issues

### Changes not reflected in production

**Problem:**
Changes to your code are not appearing in the deployed version.

**Solution:**
Make sure you build and deploy your changes:

```bash
npm run build
npm run deploy
```

For staging deployments, use:

```bash
npm run deploy:staging
```
