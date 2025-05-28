# Database Documentation

This directory contains comprehensive documentation about the TracknStick database, including schema, migrations, and query optimization.

## Contents

- [Schema](schema.md) - Database schema and relationships
- [Migrations](migrations.md) - Migration history and guidelines
- [Queries](queries.md) - Common queries and optimization tips

## Database Overview

TracknStick uses SQLite as its database, with the following key features:

- File-based database (`tracknstick.db`)
- Managed using Knex.js for migrations and queries
- Optimized for read-heavy operations
- Supports concurrent access

## Key Tables

1. **Users**

   - Stores user information
   - Links to Clerk authentication
   - Primary key for user-related data

2. **Habits**

   - Stores habit definitions
   - Tracks habit metadata (name, icon, frequency)
   - Maintains streak and completion statistics

3. **Trackers**
   - Records habit completions
   - Stores completion timestamps and notes
   - Links habits to users

## Database Management

### Migrations

Database schema changes are managed using Knex.js migrations. See [migrations.md](migrations.md) for:

- How to create new migrations
- How to run migrations
- Migration history
- Rollback procedures

### Backup and Recovery

- Database file is located at `./tracknstick.db`
- Regular backups recommended
- Can be restored by replacing the database file

## Query Optimization

See [queries.md](queries.md) for:

- Common query patterns
- Index usage
- Performance optimization tips
- Best practices

## Development Guidelines

1. Always use migrations for schema changes
2. Test migrations both up and down
3. Include indexes for frequently queried columns
4. Use transactions for related operations
5. Follow the established naming conventions

Last Updated: 2024-03-21
