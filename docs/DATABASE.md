# Database Documentation

This document provides comprehensive information about the TrackNStick API database, which uses Cloudflare D1 (an SQLite-compatible serverless database). It covers the database schema, migration process, and common query patterns.

## 1. Database Overview

The TrackNStick API uses Cloudflare D1 to store and manage user and habit tracking data. D1 is an SQLite-compatible, serverless database, meaning the fundamental schema design and query language are based on SQLite.

**Key Features:**
*   **SQLite-compatible:** Leverages SQLite's SQL dialect and features.
*   **Serverless:** Managed by Cloudflare, reducing operational overhead.
*   **Edge Optimized:** Designed to work well with Cloudflare Workers for low-latency access.
*   **Concurrency:** D1 handles concurrent access as a managed service.

### Key Tables
The database primarily consists of the following tables:
1.  **`users`**: Stores user information, linking to Clerk authentication IDs.
2.  **`habits`**: Stores habit definitions, metadata (like frequency, icon), and aggregated statistics (streaks, completion counts).
3.  **`trackers`**: Records individual instances of habit completions.
4.  **`progress`**: Stores aggregated daily progress and overall streak information for users.

## 2. Database Schema

This section details the structure of each table and their relationships, reflecting the latest migrations.

### Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS {
        TEXT clerk_user_id PK "Clerk User ID"
        TEXT created_at "Timestamp of creation (ISO8601)"
        TEXT updated_at "Timestamp of last update (ISO8601)"
    }
    HABITS {
        INTEGER id PK "Auto-incrementing unique identifier"
        TEXT user_id FK "References USERS.clerk_user_id"
        TEXT name NOLIMIT "Name of the habit"
        TEXT icon NOLIMIT "Optional icon identifier"
        TEXT frequency NOTNULL "JSON string for frequency rules"
        INTEGER streak DEFAULT 0 "Current completion streak"
        INTEGER longest_streak DEFAULT 0 "Longest ever completion streak"
        INTEGER total_completions DEFAULT 0 "Total times completed"
        TEXT last_completed "Timestamp of the most recent completion (ISO8601)"
        TEXT start_date NOTNULL "YYYY-MM-DD when habit begins"
        TEXT end_date "YYYY-MM-DD when habit ends (optional)"
        TEXT created_at NOTNULL "Timestamp of habit creation (ISO8601)"
        TEXT updated_at NOTNULL "Timestamp of last habit update (ISO8601)"
    }
    TRACKERS {
        INTEGER id PK "Auto-incrementing unique identifier"
        INTEGER habit_id FK "References HABITS.id"
        TEXT user_id FK "References USERS.clerk_user_id"
        TEXT timestamp NOTNULL "Completion Timestamp (UTC ISO 8601)"
        TEXT notes NOLIMIT "Optional notes for the completion"
        TEXT date_tracked NOTNULL "YYYY-MM-DD of the completion (derived)"
        TEXT created_at NOTNULL "Timestamp of tracker creation (ISO8601)"
        TEXT updated_at NOTNULL "Timestamp of last tracker update (ISO8601)"
    }
    PROGRESS {
        TEXT date PK "YYYY-MM-DD"
        TEXT user_id PK FK "References USERS.clerk_user_id"
        REAL completion_rate DEFAULT 0.0 "Daily completion percentage (0.0 to 1.0)"
        INTEGER current_streak_days DEFAULT 0 "Consecutive 100% completion days"
        INTEGER longest_streak_days DEFAULT 0 "Record of consecutive 100% completion days"
        TEXT created_at NOTNULL "Timestamp of record creation (ISO8601)"
        TEXT updated_at NOTNULL "Timestamp of record update (ISO8601)"
    }

    USERS ||--|{ HABITS : "owns"
    USERS ||--|{ TRACKERS : "creates"
    USERS ||--|{ PROGRESS : "has"
    HABITS ||--|{ TRACKERS : "has_entries_for"
```
*This ERD reflects the schema after all migrations, including `created_at` and `updated_at` timestamps, JSON `frequency`, and `user_id` as TEXT (Clerk ID).*

### Table Definitions

#### `users` Table
Stores user information, linking to Clerk. The `clerk_user_id` is the primary key and directly references the ID provided by Clerk.

| Column          | Type     | Constraints                                               | Description                                     |
|-----------------|----------|-----------------------------------------------------------|-------------------------------------------------|
| `clerk_user_id` | TEXT     | PRIMARY KEY NOT NULL                                      | User ID from Clerk authentication service.      |
| `created_at`    | TEXT     | NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) | Timestamp of user record creation (ISO8601 UTC). |
| `updated_at`    | TEXT     | NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) | Timestamp of last user record update (ISO8601 UTC). |

*Indexes: Primary Key on `clerk_user_id`.*

#### `habits` Table
Stores definitions and metadata for each habit.

| Column              | Type     | Constraints                                               | Description                                                         |
|---------------------|----------|-----------------------------------------------------------|---------------------------------------------------------------------|
| `id`                | INTEGER  | PRIMARY KEY AUTOINCREMENT                                 | Unique local identifier for the habit.                              |
| `user_id`           | TEXT     | NOT NULL                                                  | Owning user's `clerk_user_id`. (Conceptually FK to `users.clerk_user_id`) |
| `name`              | TEXT     | NOT NULL                                                  | Name of the habit.                                                  |
| `icon`              | TEXT     |                                                           | Optional icon identifier (e.g., emoji or string code).              |
| `frequency`         | TEXT     | NOT NULL                                                  | JSON string defining recurrence rules (see "Frequency Format" below). |
| `streak`            | INTEGER  | DEFAULT 0                                                 | Current completion streak for the habit.                            |
| `longest_streak`    | INTEGER  | DEFAULT 0                                                 | Longest recorded streak for this habit.                             |
| `total_completions` | INTEGER  | DEFAULT 0                                                 | Total number of times this habit has been marked as complete.       |
| `last_completed`    | TEXT     |                                                           | Timestamp (ISO8601 UTC) of the most recent completion.            |
| `start_date`        | TEXT     | NOT NULL                                                  | Date (YYYY-MM-DD) when the habit becomes active.                    |
| `end_date`          | TEXT     |                                                           | Optional date (YYYY-MM-DD) when the habit becomes inactive.         |
| `created_at`        | TEXT     | NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) | Timestamp of habit creation (ISO8601 UTC).                          |
| `updated_at`        | TEXT     | NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) | Timestamp of last habit update (ISO8601 UTC).                       |

*Indexes: Primary Key on `id`; `idx_habits_user_id` on `(user_id)` is crucial for fetching user-specific habits.*

#### `trackers` Table
Records each instance of a habit completion.

| Column        | Type     | Constraints                                               | Description                                                                  |
|---------------|----------|-----------------------------------------------------------|------------------------------------------------------------------------------|
| `id`          | INTEGER  | PRIMARY KEY AUTOINCREMENT                                 | Unique identifier for the tracker entry.                                     |
| `habit_id`    | INTEGER  | NOT NULL                                                  | Reference to `habits.id`.                                                    |
| `user_id`     | TEXT     | NOT NULL                                                  | Owning user's `clerk_user_id`. (Denormalized for easier queries, conceptually FK) |
| `timestamp`   | TEXT     | NOT NULL                                                  | Exact timestamp (ISO8601 UTC) when the habit was marked as completed.      |
| `notes`       | TEXT     |                                                           | Optional notes related to this specific completion.                        |
| `date_tracked`| TEXT     | NOT NULL                                                  | Date (YYYY-MM-DD) for which this completion counts, derived from `timestamp` and user's timezone at the time of tracking. |
| `created_at`  | TEXT     | NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) | Timestamp of tracker entry creation (ISO8601 UTC).                           |
| `updated_at`  | TEXT     | NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) | Timestamp of last tracker entry update (ISO8601 UTC).                        |

*Indexes: Primary Key on `id`; `idx_trackers_user_habit_timestamp` on `(user_id, habit_id, timestamp)` (confirms existence and order); `idx_trackers_date_tracked` on `(user_id, date_tracked)` for daily views. (Actual indexes are defined in migration files such as `0001_add_indexes.sql` and subsequent relevant migrations).*

#### `progress` Table
Stores aggregated daily progress metrics for each user.

| Column                | Type     | Constraints                                               | Description                                                                    |
|-----------------------|----------|-----------------------------------------------------------|--------------------------------------------------------------------------------|
| `date`                | TEXT     | NOT NULL                                                  | The specific date (YYYY-MM-DD) for which progress is recorded.                 |
| `user_id`             | TEXT     | NOT NULL                                                  | The user's `clerk_user_id`. (Conceptually FK to `users.clerk_user_id`)        |
| `completion_rate`     | REAL     | NOT NULL DEFAULT 0.0                                      | Overall percentage of habits completed on this day (0.0 to 1.0).               |
| `current_streak_days` | INTEGER  | DEFAULT 0                                                 | Current number of consecutive days with 100% habit completion ending on this date. |
| `longest_streak_days` | INTEGER  | DEFAULT 0                                                 | Longest recorded streak of 100% completion days for the user.                  |
| `created_at`          | TEXT     | NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) | Timestamp of progress record creation (ISO8601 UTC).                           |
| `updated_at`          | TEXT     | NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) | Timestamp of last progress record update (ISO8601 UTC).                        |
| PRIMARY KEY (`date`, `user_id`)                                               |                                                           |                                                                                |

*Indexes: Primary Key on `(date, user_id)`; `idx_progress_user_date` on `(user_id, date)` for querying user-specific historical progress.*

### Data Integrity and Relationships
*   **Primary Keys:** Each table utilizes a primary key for unique row identification.
*   **Foreign Key References (Conceptual for D1):** While D1 allows `FOREIGN KEY` syntax in `CREATE TABLE` statements (and it's good practice for documentation and compatibility), it does not enforce these constraints at the time of writing. Referential integrity (e.g., ensuring `habits.user_id` exists in `users.clerk_user_id`) must be managed at the application layer.
    *   `HABITS.user_id` conceptually references `USERS.clerk_user_id`.
    *   `TRACKERS.habit_id` conceptually references `HABITS.id`.
    *   `TRACKERS.user_id` conceptually references `USERS.clerk_user_id`.
    *   `PROGRESS.user_id` conceptually references `USERS.clerk_user_id`.
*   **CASCADE Deletes:** Not automatically enforced by D1. If cascading deletion behavior is required (e.g., deleting all habits of a user when the user is deleted), this logic must be implemented in the application's service layer.
*   **NOT NULL Constraints:** Enforced for fields essential for data integrity.
*   **Default Values:** Utilized for fields like `streak`, `completion_rate`, and particularly for `created_at` and `updated_at` timestamps using SQLite's `strftime` function to store ISO8601 UTC strings.

### Frequency Format in `habits` Table
The `frequency` column in the `habits` table stores a JSON string that defines the recurrence pattern of a habit. This provides flexibility for various scheduling needs.
*   **Daily:** `{"type": "daily"}`
*   **Specific days of the week:** `{"type": "weekly", "days": [0, 1, 2, 3, 4, 5, 6]}` (Array of numbers, where 0=Sunday, 1=Monday, ..., 6=Saturday)
*   **Specific dates of the month:** `{"type": "monthly", "dates": [1, 15, 31]}` (Array of day numbers)
*   **Custom Interval:** `{"type": "custom", "interval_days": 3}` (Repeats every N days from the habit's `start_date`)
    *   *Further properties might be added to the JSON structure for more complex scenarios as needed (e.g., `{"type": "custom_days_of_month", "days_of_month": [1, 15], "months": [0,1,2...11]}* - this is illustrative, current schema is simpler).*

### Data Types & Format
Cloudflare D1 uses standard SQLite data types. For consistency and to leverage SQLite's capabilities:
*   **`INTEGER`**: Used for auto-incrementing IDs, counts, booleans (represented as 0 for false, 1 for true).
*   **`TEXT`**: Used for all string data, including names, icons, JSON strings (for `frequency`), and importantly, for storing dates and datetimes in **ISO 8601 format** (e.g., `YYYY-MM-DD` for dates, `YYYY-MM-DDTHH:MM:SS.SSSZ` for datetimes). Storing datetimes as text in a standardized format like ISO 8601 (typically UTC) is recommended for SQLite.
*   **`REAL`**: Used for floating-point numbers, such as `completion_rate`.
*   **`DATETIME` columns (`created_at`, `updated_at`, `last_completed`, `timestamp`):** Stored as `TEXT` in ISO 8601 UTC format (e.g., `2023-10-26T07:30:00.123Z`). Default values use `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`.

## 3. Database Migrations

Database schema changes are managed using **Wrangler D1 migrations**. This system uses plain SQL files for version-controlled schema evolution.

### Overview
*   Migrations are SQL files stored in the `migrations/` directory at the project root (e.g., `project_root/migrations/`).
*   Wrangler CLI applies these migrations to local (for development) and remote (preview/production) D1 databases.
*   Each migration file contains DDL statements (e.g., `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`).
*   Wrangler tracks applied migrations in a D1 internal table (e.g., `d1_migrations`).

### Directory Structure
```
project-root/
└── migrations/
    ├── 0000_initial_schema.sql
    ├── 0001_add_indexes.sql
    └── ... (subsequent migration files, e.g., 0008_add_timestamps_to_trackers.sql)
```

### Migration Files
*   Named with a numerical prefix (e.g., `0000_`, `0001_`) to define execution order.
*   Contain standard SQLite-compatible SQL statements.
*   **Rollbacks:** D1 migrations are forward-only. To revert a change, create a new migration that applies the necessary counter-DDL statements, or restore the database from a backup (D1 supports Point-in-Time Recovery).

**Example Migration Snippet (from `migrations/0000_initial_schema.sql` or similar):**
```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  clerk_user_id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);

-- Create habits table
CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL, -- Conceptually REFERENCES users(clerk_user_id)
  name TEXT NOT NULL,
  icon TEXT,
  frequency TEXT NOT NULL, -- Expected to be a JSON string
  streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  last_completed TEXT,    -- ISO8601 datetime string
  start_date TEXT NOT NULL, -- YYYY-MM-DD
  end_date TEXT,          -- YYYY-MM-DD
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
-- ... other table creations and index definitions from initial and subsequent migrations ...
```
*(Note: `DEFAULT CURRENT_TIMESTAMP` in SQLite typically stores in `YYYY-MM-DD HH:MM:SS` format. For ISO8601 UTC, `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` is more explicit and aligns with the timestamp format used elsewhere.)*

### Working with Migrations (Wrangler CLI)

*   **Creating a New Migration File:**
    Manually create a new SQL file in the `migrations/` directory (e.g., `0009_add_new_field_to_habits.sql`).
*   **Applying Migrations:**
    *   Local development: `pnpm run db:migrate:local` (which typically runs `wrangler d1 migrations apply <DB_NAME_FROM_WRANGLER_TOML> --local`)
    *   Remote (Production/Preview): `pnpm run db:migrate` (which typically runs `wrangler d1 migrations apply <DB_NAME_FROM_WRANGLER_TOML>`)
    *   Ensure `<DB_NAME_FROM_WRANGLER_TOML>` matches the `database_name` specified in your `wrangler.toml` for the respective environment.
*   **Listing Applied Migrations:**
    *   `wrangler d1 migrations list <DB_NAME_FROM_WRANGLER_TOML> [--local|--remote]`

### Best Practices for D1 Migrations
1.  **Idempotency:** Use `IF NOT EXISTS` for `CREATE TABLE`/`CREATE INDEX`. For `ALTER TABLE ADD COLUMN`, ensure it's safe to re-run or handle errors if the column already exists (some versions of SQLite support `ADD COLUMN IF NOT EXISTS`).
2.  **Small, Focused Migrations:** Each file should represent a single, atomic schema change or a coherent set of related changes.
3.  **Test Thoroughly:** Apply and test migrations in local and staging/preview D1 environments before applying to production.
4.  **Backup Strategy:** Utilize D1's Point-in-Time Recovery (PITR) feature. For critical changes, consider taking a manual backup using `wrangler d1 export` before applying migrations.
5.  **Forward-Only Design:** Plan migrations with the understanding that rollbacks typically involve creating new migrations to revert changes, or restoring from a backup.

## 4. Common Query Patterns & Optimization

Repositories interact with D1 using the D1 client API available in Cloudflare Workers (`c.env.DB` in Hono, where `DB` is the binding name from `wrangler.toml`).

### Example Repository Function (TypeScript)
```typescript
// src/repositories/habit.repository.ts (Conceptual)
import { D1Database, D1Result, D1PreparedStatement } from '@cloudflare/workers-types';
import { Habit, NewHabitPayload } from '../types'; // Assuming relevant type definitions

export async function findHabitById(db: D1Database, id: number, userId: string): Promise<Habit | null> {
  const stmt: D1PreparedStatement = db.prepare('SELECT * FROM habits WHERE id = ?1 AND user_id = ?2');
  const result = await stmt.bind(id, userId).first<Habit>();
  return result;
}

export async function insertHabit(db: D1Database, newHabit: NewHabitPayload, userId: string): Promise<Habit> {
  const { name, icon, frequency, startDate, endDate } = newHabit;
  // Note: streak, longest_streak, total_completions, last_completed are often initialized with defaults or handled by service logic.
  const stmt: D1PreparedStatement = db.prepare(
    `INSERT INTO habits (user_id, name, icon, frequency, start_date, end_date, streak, longest_streak, total_completions, last_completed, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 0, 0, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
     RETURNING *`
  );
  const result = await stmt.bind(userId, name, icon, JSON.stringify(frequency), startDate, endDate).first<Habit>();
  if (!result) {
    throw new Error("Failed to create habit: No data returned after insert.");
  }
  return result;
}
```

### Select Queries
*   **Get by ID:** `SELECT * FROM habits WHERE id = ?1 AND user_id = ?2;`
*   **Get All for User:** `SELECT * FROM habits WHERE user_id = ?1 ORDER BY created_at DESC;`
*   **Filtering with JSON (Example):**
    ```sql
    SELECT * FROM habits WHERE user_id = ?1 AND json_extract(frequency, '$.type') = 'daily';
    ```
    *Note: SQLite's JSON capabilities are powerful. For complex or frequent JSON-based queries, performance should be monitored. Consider extracting frequently queried JSON properties into separate indexed columns if necessary.*

### Insert, Update, Delete Queries
Standard SQL syntax applies. Use D1's `.run()` method (which returns `D1Result` containing metadata like `meta.last_row_id` and `meta.changes`) or include `RETURNING *` (or specific columns) with `first<T>()` or `all<T>()` to get the affected row(s).

### Transactions / Batching
D1 supports atomic batch operations via `db.batch([statement1, statement2])`. All statements in a batch succeed or fail together. For more complex transactions involving read-after-write or conditional logic, D1 also has an explicit `db.transaction(async (txn) => { ... })` method, where `txn` is a transaction-specific query interface.
```typescript
// Example: Batch delete in a repository
const statements: D1PreparedStatement[] = [
  db.prepare('DELETE FROM trackers WHERE habit_id = ?1 AND user_id = ?2').bind(habitId, userId),
  db.prepare('DELETE FROM habits WHERE id = ?1 AND user_id = ?2').bind(habitId, userId)
];
const results: D1Result[] = await db.batch(statements);
// Check results for success/failure of each statement
```

### Query Performance & Indexing
*   **Indexes are vital for D1 query performance.** D1 automatically indexes Primary Keys.
*   **Create Additional Indexes On:**
    *   Foreign key columns (e.g., `habits.user_id`).
    *   Columns frequently used in `WHERE` clauses or for `ORDER BY` clauses (e.g., `trackers.timestamp`, `progress.date`).
    *   **Actual Indexes (from migration files like `0001_add_indexes.sql`):**
        *   `idx_habits_user_id ON habits(user_id)`
        *   `idx_trackers_user_habit_timestamp ON trackers(user_id, habit_id, timestamp)`
        *   `idx_trackers_date_tracked ON trackers(user_id, date_tracked)` (This index was found in `0001_add_indexes.sql`)
        *   `idx_progress_user_date ON progress(user_id, date)`
*   **Analyze Queries:** While D1 might not offer a direct `EXPLAIN QUERY PLAN` via Wrangler for all scenarios, using local SQLite tools on an exported schema can help understand query plans. Cloudflare provides some query performance metrics in its dashboard.
*   **Limit Data Fetched:** Select only necessary columns. Use `LIMIT` and `OFFSET` for pagination.
*   **Application-Side Logic vs. Complex SQL:** For very complex filtering (especially on JSON data across many rows) or joins that are hard to optimize in SQLite, weigh the trade-offs between complex SQL and performing some data processing/filtering in the Worker application layer. This should be balanced against data transfer size and Worker CPU time.

### Development Guidelines for Database
1.  **Parameterized Queries:** Always use D1's `bind()` method with prepared statements (e.g., `db.prepare('...').bind(...)`) to prevent SQL injection.
2.  **User Data Isolation:** Enforce multi-tenancy by consistently including `user_id` (Clerk ID) in `WHERE` clauses for all queries that access user-specific data.
3.  **Error Handling:** Repositories should catch potential D1 errors, log relevant context, and throw appropriate custom application errors (e.g., `DatabaseError`) for the service layer to handle.
4.  **Batching for Atomicity:** Use `db.batch()` or `db.transaction()` for operations requiring multiple writes to be atomic.
5.  **Date/Time Storage:** Store all dates and datetimes as ISO8601 TEXT strings, preferably in UTC. Handle timezone conversions at the application layer (when receiving user input or displaying data) or on the client-side. Use SQLite date/time functions like `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` for `DEFAULT CURRENT_TIMESTAMP` in UTC.

Last Updated: (Current Date) - Reflects D1 usage and schema based on current migrations.
>>>>>>> REPLACE
