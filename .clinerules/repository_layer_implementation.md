# Repository Layer Implementation Refactoring

This document explains the refactoring process related to introducing the Repository layer (`src/repositories/`) in the Habit Tracker API.

## Initial State

Originally, database queries using the `sqlite3` driver (`db.prepare`, `db.get`, `db.all`, `db.run`) were executed directly within the route handler callbacks in `index.js` (and later temporarily moved to the controllers during the initial layering). This tightly coupled the application logic (HTTP handling, business rules) to the specific database implementation and schema details, making the code harder to test, maintain, and adapt to potential database changes.

## Decision: Introduce Repository Layer

As part of the layered architecture, we introduced a dedicated Repository layer. The primary goal was to abstract all direct database interactions, creating a clear separation between the application's business logic (Services) and the data persistence mechanism (SQLite database).

## Rationale

1.  **Data Access Abstraction:** Hides the specifics of how data is fetched and persisted (e.g., raw SQL queries, specific driver methods) from the rest of the application, particularly the Service layer. Services interact with well-defined repository methods instead of database details.
2.  **Decoupling:** Reduces the dependency of the core application logic on the specific database technology (`sqlite3`) and schema structure. This makes it easier to potentially switch database systems or modify table structures in the future with minimal impact on the Service layer.
3.  **Improved Testability:** Repositories encapsulate database calls, allowing the Service layer to be unit-tested more easily by mocking the repository dependencies. This avoids the need for an actual database connection during service tests.
4.  **Centralized Data Logic:** Groups all database queries related to a specific data entity (e.g., `Habit`, `Tracker`) into a single repository file, making data access logic easier to find, manage, and optimize.
5.  **Consistency:** Ensures that database interactions are performed consistently using standardized methods (like the promise wrappers in `dbUtils.js`).

## Implementation Steps

1.  **Create `src/repositories/` Directory:** A dedicated directory was created.
2.  **Create Repository Files (`habit.repository.js`, `tracker.repository.js`):** Files were created for each primary data entity.
3.  **Centralize DB Utilities (`src/utils/dbUtils.js`):**
    - The SQLite database connection setup was moved from the root `db.js` to `dbUtils.js`.
    - Promise wrappers (`dbAll`, `dbGet`, `dbRun`) for the `sqlite3` methods were created/moved here to handle asynchronous operations cleanly with `async/await`.
    - The old root `db.js` file was deleted.
4.  **Define Repository Functions:** For each distinct database operation required by the Service layer, a corresponding asynchronous function was defined in the appropriate repository file (e.g., `habitRepository.findById`, `habitRepository.create`, `trackerRepository.findTrackersByDateRange`).
5.  **Implement Database Queries:** Inside each repository function, the specific SQL query was written using parameterized statements (`?`) to prevent SQL injection. The promise wrappers (`dbAll`, `dbGet`, `dbRun`) from `dbUtils.js` were used to execute the queries.
6.  **Return Plain Data:** Repository functions were designed to return plain JavaScript objects or arrays representing the data fetched from the database, without including database-specific objects (like the raw `sqlite3` row objects, although in this case they are simple objects). Data transformations specific to business logic (like splitting the `frequency` string) were generally left to the Service layer.
7.  **Error Handling:** Basic `try...catch` blocks were added within repository functions to catch potential database errors. Generic errors are thrown upwards to be handled by the service or centralized error handler, often logging the original database error for debugging.
8.  **Update Service Layer:** Service functions were updated to import and call the relevant repository functions instead of performing direct database operations or using the `dbUtils` directly.

## Benefits Achieved

- Data access logic is now clearly separated and abstracted from business logic.
- Reduced coupling between the application core and the database implementation.
- Improved testability of the Service layer.
- Centralized location for all database queries, improving maintainability and potential optimization efforts.
