# Refactoring: Learnings & Takeaways

This document summarizes key learnings and takeaways from the refactoring process of the Habit Tracker API.

## Key Learnings

1.  **Value of Layered Architecture:** Implementing a clear separation between Controllers, Services, and Repositories drastically improved code organization and made reasoning about different parts of the application much easier compared to the initial single-file approach.
2.  **Importance of `async/await`:** Transitioning from callbacks to `async/await` for database operations significantly enhanced code readability and reduced the complexity associated with handling asynchronous operations.
3.  **Database Abstraction Benefits:** Creating a Repository layer, even for a simple SQLite database, demonstrated the value of decoupling application logic from direct database driver interactions. This makes the code more adaptable to future changes.
4.  **Promise Wrapper Nuances:** Standard `util.promisify` doesn't always work correctly with library methods that rely on specific `this` context (like `sqlite3`'s `db.run` for accessing `this.lastID` and `this.changes`). Custom promise wrappers are sometimes necessary.
5.  **Debugging Path Issues:** Relative paths for critical resources like database files can be unreliable depending on the execution context. Using absolute paths (e.g., via `path.resolve(__dirname, ...)` ) provides much greater robustness. Verifying the _actual_ resource being accessed by the application (through logging or other means) is crucial when debugging connection/access issues.
6.  **Incremental Refactoring:** Tackling the refactoring layer by layer (structure -> controllers -> services/repositories) made the process manageable. Trying to change everything at once would have been much harder to debug.
7.  **Code Formatting Tools:** Integrating ESLint and Prettier early helps maintain consistency and catch minor issues automatically, saving time and effort during development and refactoring.
8.  **Importance of Clear Commits:** Creating separate commits (and potentially PRs) for distinct stages of the refactoring (e.g., linting setup, structural changes, service layer implementation) makes the history easier to follow and revert if necessary.

## Challenges Encountered

- **Debugging Database Connection:** Pinpointing why the application couldn't find the API key despite it being present in the database file required careful logging and realizing the application might be accessing a different file due to path resolution issues.
- **Promise Wrapper Issues:** Initial attempts using `util.promisify` for `db.run` failed silently (returning `undefined` for `result.changes`), requiring the creation of a custom wrapper.
- **Auto-formatter Conflicts:** Minor syntax errors were introduced by the auto-formatter interacting with multi-line `replace_in_file` blocks, requiring careful review and correction.

## Future Considerations

- Proactively implement robust validation and centralized error handling early in development.
- Consider using a more feature-rich database client or ORM (like Knex.js or Sequelize) even for SQLite projects to simplify queries, migrations, and promise handling, potentially avoiding the need for custom wrappers.
- Establish clear testing strategies (unit, integration) alongside development rather than adding them only after refactoring.
