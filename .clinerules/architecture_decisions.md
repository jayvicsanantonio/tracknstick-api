# Refactoring: Architecture Decisions

This document outlines the key architectural decisions made during the refactoring of the Habit Tracker API.

## Layered Architecture

- **Decision:** Adopted a standard layered architecture (Controllers, Services, Repositories).
- **Rationale:**
  - **Separation of Concerns:** Clearly separates HTTP handling (Controllers), business logic (Services), and data access (Repositories).
  - **Maintainability:** Makes code easier to understand, modify, and debug by isolating responsibilities.
  - **Testability:** Allows for easier unit testing of individual layers (especially services and repositories) by mocking dependencies.
  - **Scalability:** Provides a structured way to organize code as the application grows.
- **Structure:**
  - `src/api/`: Route definitions (`express.Router`).
  - `src/controllers/`: Request/response handling, input validation (basic), calls services.
  - `src/services/`: Business logic orchestration, calls repositories.
  - `src/repositories/`: Data access logic, interacts directly with the database.
  - `src/middlewares/`: Cross-cutting concerns (e.g., authentication).
  - `src/utils/`: Shared helper functions (e.g., `dbUtils.js`).

## Database Abstraction

- **Decision:** Introduced a Repository layer to abstract direct database calls (`sqlite3` driver) from controllers and services. Centralized DB connection and promise wrappers in `src/utils/dbUtils.js`.
- **Rationale:**
  - **Decoupling:** Reduces dependency on the specific database driver (`sqlite3`) throughout the application. Makes potential future database migrations easier.
  - **Consistency:** Ensures database interactions are handled consistently.
  - **Testability:** Repositories can be mocked when testing services.
- **Implementation:**
  - Created `HabitRepository` and `TrackerRepository`.
  - Used `async/await` with promise wrappers (`dbAll`, `dbGet`, `dbRun`) for cleaner asynchronous code.
  - Centralized database connection and schema initialization in `dbUtils.js`.

## Authentication Handling

- **Decision:** Kept authentication logic within a dedicated middleware (`src/middlewares/authenticate.js`). Fixed database path resolution issue.
- **Rationale:** Centralizes authentication logic, making it easy to apply to routes and manage separately. Using an absolute path for the DB connection ensures reliability.

## Error Handling (Initial)

- **Decision:** Implemented basic `try...catch` blocks in controllers and services, passing errors to Express's default error handler via `next(error)`. Added basic 404 handler.
- **Rationale:** Provides a starting point for error management. Prevents unhandled promise rejections from crashing the server.
- **Next Steps:** Implement a dedicated centralized error handling middleware and potentially custom error classes for more specific error responses.

_(Add other significant architectural decisions here as the project evolves)_
