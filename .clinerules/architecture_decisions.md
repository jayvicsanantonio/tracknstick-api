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

- **Decision:** Introduced a Repository layer to abstract direct database calls (`sqlite3` driver) from controllers and services. Centralized DB connection, promise wrappers, and schema initialization in `src/utils/dbUtils.js`. Configured database path using `dotenv` and `DATABASE_PATH` environment variable.
- **Rationale:**
  - **Decoupling:** Reduces dependency on the specific database driver (`sqlite3`) throughout the application. Makes potential future database migrations easier.
  - **Consistency:** Ensures database interactions are handled consistently.
  - **Testability:** Repositories can be mocked when testing services.
  - **Configuration:** Allows flexible database path configuration per environment.
- **Implementation:**
  - Created `HabitRepository` and `TrackerRepository`.
  - Used `async/await` with promise wrappers (`dbAll`, `dbGet`, `dbRun`) for cleaner asynchronous code.
  - Centralized database connection (using `process.env.DATABASE_PATH`) and schema initialization in `dbUtils.js`.
  - Added `dotenv` dependency and configured it in `index.js`.
  - Added `.env.local` (ignored by git) for local configuration.

## Authentication Handling

- **Decision:** Kept authentication logic within a dedicated middleware (`src/middlewares/authenticate.js`). Updated to use custom error classes (`AuthenticationError`, `AuthorizationError`, `DatabaseError`) and `next(error)`.
- **Rationale:** Centralizes authentication logic, making it easy to apply to routes and manage separately. Integrates with the centralized error handling system, providing specific error types for authentication, authorization, and database failures during lookup.

## Centralized Error Handling

- **Decision:** Implemented a centralized error handling mechanism using custom error classes and a dedicated middleware. Replaced the previous basic error handling.
- **Rationale:**
  - **Consistency:** Ensures all error responses follow a standard format (`status`, `message`, `errorCode`, optional `errors` array for validation).
  - **Maintainability:** Consolidates error handling logic into `src/middlewares/errorHandler.js`.
  - **Clarity:** Custom error classes (`AppError`, `NotFoundError`, `BadRequestError`, etc. in `src/utils/errors.js`) provide semantic meaning and appropriate HTTP status codes.
  - **Detailed Validation:** Validation errors (`VALIDATION_ERROR`) now include a detailed array of specific field errors.
  - **Security:** Prevents leaking internal stack traces in production responses.
- **Implementation:**
  - Created custom error classes (`AppError`, `BadRequestError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `DatabaseError`) in `src/utils/errors.js`.
  - Created `errorHandler` middleware in `src/middlewares/errorHandler.js` to catch errors, log them, and format responses based on error type and environment (ensuring generic 500 responses in production).
  - Updated services (`src/services/`) to throw appropriate custom errors.
  - Updated controllers (`src/controllers/`) to consistently use `try...catch` and `next(error)`.
  - Updated repositories (`src/repositories/`) to catch DB errors and throw `DatabaseError`.
  - Updated `authenticate` middleware to use custom errors, including `DatabaseError`.
  - Updated `validate` middleware to pass structured validation errors via `next()`.
  - Registered `errorHandler` as the last middleware in `index.js`.

## Database Transactions

- **Decision:** Implemented atomic transactions for operations involving multiple dependent writes (currently `deleteHabit`) using a centralized `withTransaction` utility function (`src/utils/transactionUtils.js`).
- **Rationale:** Ensures data consistency by automatically rolling back changes if any operation within the transaction fails. Centralizes transaction logic for better maintainability and reusability.
- **Implementation:**
  - Created `withTransaction` utility using `async/await` and `dbRun` for `BEGIN`, `COMMIT`, `ROLLBACK`.
  - Refactored `deleteHabit` service to use `withTransaction`, passing the core deletion logic as an async callback.

_(Add other significant architectural decisions here as the project evolves)_
