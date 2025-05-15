# Refactoring: Architecture Decisions

This document outlines the key architectural decisions made during the refactoring of the Habit Tracker API.

## Express to Hono Migration

- **Decision:** Migrated from Express.js to Hono.js framework.
- **Rationale:**
  - **Performance:** Hono provides significantly better performance and lower latency than Express.
  - **Edge Compatibility:** Hono is designed for edge computing environments (like Cloudflare Workers), enabling deployment to the edge.
  - **Modern Features:** Hono follows modern web standards and has better TypeScript integration.
  - **Maintainability:** Hono's simpler middleware approach and context-based handlers reduce complexity.
  - **Unified Context:** Hono's unified context object (`c`) is easier to work with than Express's separate req/res objects.
- **Key Implementation Details:**
  - Introduced a Higher-Order Component (HOC) pattern for controllers to handle cross-cutting concerns.
  - Used `@hono/clerk-auth` for authentication instead of custom middleware.
  - Replaced express-validator with Zod for more robust validation.
  - Converted Express middleware to Hono's middleware approach.
  - Updated error handling to use Hono's throw/catch pattern rather than next(error).

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
  - Created `HabitRepository`, `TrackerRepository`, and `UserRepository`.
  - Used `async/await` with promise wrappers (`dbAll`, `dbGet`, `dbRun`) for cleaner asynchronous code.
  - Centralized database connection (using `process.env.DATABASE_PATH`) and schema initialization in `dbUtils.js`.
  - Added `dotenv` dependency and configured it in `index.js`.
  - Added `.env.local` (ignored by git) for local configuration.

## Authentication Handling (Clerk Integration)

- **Decision:** Replaced the custom API Key authentication with Clerk JWT validation using the `@clerk/express` package. The `requireAuth()` middleware is now applied to protected routes.
- **Rationale:** Aligns with standard security practices for SPAs using an external identity provider. Leverages Clerk's robust session management and short-lived JWTs, enhancing security compared to static API keys. Simplifies frontend logic by removing the need to manage API keys.
- **Implementation:**
  - Installed `@clerk/express`.
  - Added `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` to environment variables (`.env`).
  - Applied `requireAuth()` middleware directly within the API router file (`src/api/habits.routes.js`) for protected routes.
  - Updated controllers (`habit.controller.js`) to use `req.auth.userId` provided by Clerk middleware.
  - Re-introduced `UserRepository` with `findOrCreateByClerkId` function.
  - Updated service layer (`habit.service.js`) to use `UserRepository` to get the internal integer user ID based on the `clerkUserId` before calling other repositories.
  - Removed the old custom `authenticate.js` middleware.
  - Updated documentation (`README.md`, `api.md`, `project_guidelines.md`) accordingly.
  - **Note:** The `api_key` column in the `users` table is now deprecated for authentication purposes. A future migration could remove it.

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

## Schema Migrations (Knex.js)

- **Decision:** Adopted Knex.js for managing database schema migrations. Removed the previous manual schema initialization from `dbUtils.js`.
- **Rationale:**
  - **Consistency & Version Control:** Provides a structured, version-controlled way to manage schema changes across different environments and developers.
  - **Automation:** Allows schema updates to be automated during deployment.
  - **Reliability:** Reduces the risk of manual errors when applying schema changes.
- **Implementation:**
  - Installed `knex` and `sqlite3` dependencies.
  - Initialized Knex (`knexfile.js`, `db/migrations` directory).
  - Configured `knexfile.js` for the development environment using `sqlite3` and environment variables.
  - Created an initial migration (`initial_schema.js`) reflecting the existing schema.
  - Removed old `initializeSchema` function from `dbUtils.js`.
  - Added npm scripts (`db:migrate`, `db:rollback`, `db:make-migration`) for easier management.

_(Add other significant architectural decisions here as the project evolves)_

Last Updated: 2025-05-15
