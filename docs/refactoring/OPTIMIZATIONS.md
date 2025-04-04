# Refactoring: Performance Optimizations

This document covers performance considerations and optimizations made during or identified as potential next steps after the refactoring.

## Optimizations Implemented

1.  **Asynchronous Operations:**

    - Replaced synchronous/callback-based database operations with `async/await` and promise wrappers.
    - **Benefit:** Prevents blocking the Node.js event loop during database I/O, improving overall throughput and responsiveness under load.

2.  **Database Indexing (Basic):**

    - Ensured basic indexes exist for foreign keys (`user_id`, `habit_id`) and potentially frequently queried columns (`frequency`, `timestamp`). (See `src/utils/dbUtils.js` for specific indexes created).
    - **Benefit:** Speeds up database lookups based on indexed columns.

3.  **Absolute Database Path:**
    - Using `path.resolve` ensures the correct database file is always loaded, preventing errors and potential performance issues caused by accessing an incorrect (possibly empty) database file.
    - **Benefit:** Improves reliability and prevents performance degradation due to incorrect file access.

## Potential Future Optimizations

1.  **Query Optimization:**

    - **`findHabitsByDay` LIKE Query:** The query `WHERE user_id = ? AND (',' || frequency || ',') LIKE ?` used to find habits by day might become slow on large `habits` tables as it likely requires a full table scan or inefficient index usage.
      - **Alternative:** Consider changing the schema. Store schedule information in a separate `habit_schedule` table (e.g., `habit_id`, `user_id`, `day_of_week` [0-6]). This allows for direct indexed lookups on `user_id` and `day_of_week`.
    - **Analyze Complex Queries:** Use `EXPLAIN QUERY PLAN` in SQLite to analyze the execution plan of complex queries (like potentially the streak calculation if it involved complex joins later) and identify bottlenecks.

2.  **Database Connection Pooling:**

    - The current `sqlite3` setup uses a single connection. For applications with higher concurrency, this can become a bottleneck.
    - **Consideration:** While SQLite handles concurrent reads well, writes are serialized. If write contention becomes an issue, or if moving to a different database like PostgreSQL, implementing connection pooling would be essential. Libraries like `generic-pool` could be used, or ORMs often have built-in pooling.

3.  **Caching:**

    - Identify data that is frequently read but infrequently updated (e.g., habit details, user information).
    - Implement a caching strategy:
      - **In-memory cache:** Use libraries like `node-cache` for simple, single-instance caching. Suitable for data that can tolerate potential staleness if the server restarts.
      - **External cache:** Use Redis or Memcached for a distributed, persistent cache shared across multiple application instances (if scaling horizontally).
    - **Benefit:** Reduces database load and improves response times for cached data.

4.  **Payload Size:**

    - Ensure API responses don't return excessively large amounts of data, especially for list endpoints. Implement pagination if necessary.

5.  **Middleware Performance:**
    - Analyze custom middleware for any synchronous blocking operations or inefficient logic that could slow down the request lifecycle. Ensure database calls within middleware are efficient.
