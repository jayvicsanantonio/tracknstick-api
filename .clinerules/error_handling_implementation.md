# Refactoring: Centralized Error Handling Implementation

This document details the implementation of the centralized error handling mechanism, addressing item #2 in `.clinerules/enhancements.md` and aligning with Guideline #3 in `.clinerules/project_guidelines.md`.

## Goal

To establish a consistent, maintainable, and robust system for handling errors throughout the API, replacing ad-hoc error responses and basic handlers with a centralized approach.

## Rationale

Centralized error handling provides several benefits:

1.  **Consistency:** Ensures all error responses sent to the client follow a standard format.
2.  **Maintainability:** Consolidates error handling logic into a single middleware, making it easier to update and manage.
3.  **Separation of Concerns:** Removes error response formatting logic from controllers and services, allowing them to focus on their primary responsibilities.
4.  **Improved Debugging:** Provides a single point for logging errors and differentiating between operational errors (expected issues like invalid input) and programming errors (bugs).
5.  **Security:** Prevents leaking sensitive internal error details (like stack traces) to the client in production environments.

## Implementation Steps

The implementation involved several coordinated changes across different layers of the application:

### 1. Created Custom Error Classes (`src/utils/errors.js`)

- **Action:** A new file `src/utils/errors.js` was created to define custom error classes.
- **Details:**
  - A base `AppError` class was created, extending the built-in `Error`. It includes properties for `message`, `statusCode` (HTTP status), `status` ('fail' or 'error'), and `isOperational` (to distinguish expected errors from bugs).
  - Specific error classes extending `AppError` were defined for common HTTP scenarios:
    - `BadRequestError` (400)
    - `AuthenticationError` (401)
    - `AuthorizationError` (403)
    - `NotFoundError` (404)
- **Purpose:** To allow different parts of the application (services, middleware) to throw errors that carry semantic meaning and the appropriate HTTP status code.

### 2. Implemented Centralized Error Handling Middleware (`src/middlewares/errorHandler.js`)

- **Action:** A new middleware file `src/middlewares/errorHandler.js` was created.
- **Details:**
  - This middleware function accepts four arguments (`err, req, res, next`), signifying it as an Express error handler.
  - It inspects the incoming `err` object.
  - It differentiates between development and production environments (`process.env.NODE_ENV`).
  - **In Production:**
    - If `err.isOperational` is true (meaning it's one of our custom `AppError` types), it sends a JSON response using the error's `statusCode` and `message`.
    - If it's not an operational error (likely a programming bug or unexpected issue), it logs the error and sends a generic 500 response (`{ status: 'error', message: 'Something went very wrong!' }`) to avoid leaking details.
  - **In Development:** It sends a more detailed response including the error object and stack trace for easier debugging.
  - It logs the error details (message, URL, method, timestamp, stack trace in dev) regardless of the environment.
- **Purpose:** To act as the single point for catching all errors passed via `next(error)` and formatting the final error response sent to the client.

### 3. Updated Service Layer (`src/services/habit.service.js`)

- **Action:** The `HabitService` was modified to utilize the new custom errors.
- **Details:**
  - Imported the custom error classes from `src/utils/errors.js`.
  - Replaced instances where `null` was returned or generic `new Error(...)` was thrown for specific conditions (e.g., resource not found, invalid input) with throws of the appropriate custom error (e.g., `throw new NotFoundError(...)`, `throw new BadRequestError(...)`).
  - Removed checks in the service that were designed to return specific values (like `null`) which the controller previously interpreted as errors, as these conditions now result in thrown errors.
- **Purpose:** To make the service layer communicate failures explicitly using typed errors, which the centralized handler can understand.

### 4. Updated Controller Layer (`src/controllers/habit.controller.js`)

- **Action:** The `HabitController` was refactored to align with the new error handling flow.
- **Details:**
  - Ensured all asynchronous operations (primarily calls to the service layer) are wrapped in `try...catch` blocks.
  - The `catch` block consistently calls `next(error)` to pass any caught error (whether custom or unexpected) down the middleware chain.
  - Removed redundant checks within the `try` block that previously handled `null` or specific status returns from the service layer (e.g., `if (success === null)`), as these cases are now handled by catching the errors thrown by the service.
- **Purpose:** To ensure all errors originating from the controller or service calls are reliably passed to the centralized error handler and to simplify controller logic by removing explicit error checking.

### 5. Updated Authentication Middleware (`src/middlewares/authenticate.js`)

- **Action:** The `authenticate` middleware was updated.
- **Details:**
  - Imported `AuthenticationError` and `AuthorizationError`.
  - Changed the logic to call `next(new AuthenticationError(...))` if the `X-API-Key` header is missing.
  - Changed the logic to call `next(new AuthorizationError(...))` if the provided API key is not found in the database (invalid key).
  - Ensured that database errors caught during the key lookup are passed directly to `next(err)`.
- **Purpose:** To integrate the authentication flow with the centralized error handling system using appropriate custom errors.

### 6. Registered Error Handler in `index.js`

- **Action:** The main application file (`index.js`) was updated.
- **Details:**
  - Imported the `errorHandler` middleware and the `NotFoundError` class.
  - Modified the existing 404 handler: instead of sending a response directly, it now creates a `NotFoundError` and passes it to `next()`.
  - Replaced the previous basic error handling middleware (`app.use((err, req, res, next) => { ... })`) with the new centralized one (`app.use(errorHandler);`).
  - Ensured the `errorHandler` is registered _last_, after all other middleware and route handlers.
- **Purpose:** To activate the new error handling mechanism and ensure it catches errors from all preceding middleware and routes, including 404s.

## Outcome

The API now has a robust, centralized error handling system. Errors are consistently handled, responses are standardized, and the code in controllers and services is cleaner and more focused on its core logic. This significantly improves the maintainability and reliability of the application.
