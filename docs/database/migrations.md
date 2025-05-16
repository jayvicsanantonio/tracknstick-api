# Database Migrations

This document outlines the database migration system used in the TracknStick API.

## Overview

The TracknStick API uses [Knex.js](http://knexjs.org/) for database migrations. Migrations allow for version-controlled database schema changes that can be applied and rolled back as needed.

## Migration System

### Directory Structure

All migrations are stored in the `db/migrations/` directory:

```
db/
└── migrations/
    └── 20250414175715_initial_schema.js
    └── [additional migration files as project evolves]
```

### Migration Files

Each migration file is named with a timestamp prefix and a descriptive name, e.g., `20250414175715_initial_schema.js`. Each file exports two functions:

- `up`: Applied when running migrations forward
- `down`: Applied when rolling back migrations

Example:

```javascript
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  // Create tables, add columns, etc.
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  // Drop tables, remove columns, etc.
};
```

## Current Schema

The current database schema includes the following tables:

### Users Table

Stores user information with Clerk integration:

```javascript
.createTable('users', function (table) {
  table.increments('id').primary();
  table.string('clerk_user_id').notNullable().unique();
})
```

### Habits Table

Stores habit definitions:

```javascript
.createTable('habits', function (table) {
  table.increments('id').primary();
  table.integer('user_id').notNullable();
  table.string('name').notNullable();
  table.string('icon');
  table.string('frequency').notNullable();
  table.integer('streak').defaultTo(0);
  table.integer('total_completions').defaultTo(0);
  table.datetime('last_completed');

  table
    .foreign('user_id')
    .references('id')
    .inTable('users')
    .onDelete('CASCADE');

  table.index(['user_id', 'frequency'], 'idx_habits_user_frequency');
})
```

### Trackers Table

Stores habit completion records:

```javascript
.createTable('trackers', function (table) {
  table.increments('id').primary();
  table.integer('habit_id').notNullable();
  table.integer('user_id').notNullable();
  table.datetime('timestamp').notNullable();
  table.text('notes');

  table
    .foreign('habit_id')
    .references('id')
    .inTable('habits')
    .onDelete('CASCADE');
  table
    .foreign('user_id')
    .references('id')
    .inTable('users')
    .onDelete('CASCADE');

  table.index(
    ['habit_id', 'user_id', 'timestamp'],
    'idx_trackers_habit_user_ts'
  );
})
```

## Working with Migrations

### Creating a New Migration

To create a new migration file:

```bash
npm run db:make-migration -- migration_name
```

This creates a new timestamped migration file in the `db/migrations/` directory.

### Running Migrations

To apply all pending migrations:

```bash
npm run db:migrate
```

This command will execute all migration files that haven't been applied yet.

### Rolling Back Migrations

To roll back the most recent batch of migrations:

```bash
npm run db:rollback
```

To roll back all migrations:

```bash
npm run db:rollback-all
```

### Checking Migration Status

To view the status of migrations:

```bash
npm run db:migration-status
```

This shows which migrations have been applied and which are pending.

## Best Practices for Migrations

1. **Make migrations reversible**: Always implement both `up` and `down` functions.
2. **Keep migrations focused**: Each migration should handle one specific change.
3. **Use migrations for all schema changes**: Never modify the database schema manually.
4. **Test migrations**: Test both applying and rolling back migrations in a development environment before deploying.
5. **Include indexes**: Add appropriate indexes for frequently queried columns.
6. **Use foreign keys**: Maintain referential integrity with foreign key constraints.
7. **Document changes**: Include comments explaining the purpose of migrations.

## Adding Database Constraints

When adding constraints, consider:

1. **NOT NULL constraints**: For required fields
2. **UNIQUE constraints**: For fields that must be unique
3. **Foreign keys**: For referential integrity
4. **Default values**: For fields that should have a default value
5. **Indexes**: For fields used in WHERE clauses or JOIN conditions

Example:

```javascript
exports.up = function (knex) {
  return knex.schema.alterTable('habits', function (table) {
    table.string('category');
    table.index('category', 'idx_habits_category');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('habits', function (table) {
    table.dropIndex('category', 'idx_habits_category');
    table.dropColumn('category');
  });
};
```

## Data Migrations

For migrating data (rather than schema):

```javascript
exports.up = function (knex) {
  return knex('habits').whereNull('icon').update({ icon: 'default-icon' });
};

exports.down = function (knex) {
  return knex('habits').where({ icon: 'default-icon' }).update({ icon: null });
};
```

## Handling Production Migrations

1. **Backup the database**: Always back up the production database before migrations
2. **Test migrations thoroughly**: Test thoroughly in development environment before applying to production
3. **Schedule maintenance window**: Plan migrations during low-traffic periods
4. **Have a rollback plan**: Ensure you can roll back changes if needed
5. **Monitor application**: Watch for any issues after applying migrations

Last Updated: 2024-03-21
