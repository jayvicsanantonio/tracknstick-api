# Code Organization & Maintainability Refactoring

This document details the refactoring effort focused on improving the code structure and maintainability of the Habit Tracker API by implementing a layered architecture.

## Initial State

Originally, the application logic, including route handling, database interactions, validation, and business rules, was largely contained within a single `index.js` file, with middleware in a separate top-level directory. While functional for a small application, this structure quickly becomes difficult to manage, debug, and extend as complexity grows.

## Decision: Adopt Layered Architecture

To address the limitations of the initial structure and improve maintainability, testability, and scalability, we adopted a standard **Layered Architecture**. This architectural pattern separates the application into distinct layers, each with a specific responsibility.

## Rationale

The primary reasons for choosing a layered architecture were:

1.  **Separation of Concerns (SoC):** Each layer handles a distinct aspect of the application (e.g., HTTP handling, business logic, data access). This makes the codebase easier to understand and reason about.
2.  **Maintainability:** Changes within one layer have minimal impact on others, reducing the risk of introducing bugs and simplifying updates. Locating specific code becomes much easier.
3.  **Testability:** Individual layers, particularly services and repositories, can be unit-tested in isolation by mocking their dependencies.
4.  **Scalability:** Provides a clear, organized structure that accommodates growth and the addition of new features without leading to monolithic files.

## Implemented Structure (`src/`)

The refactored code resides within the `src/` directory, organized as follows:

- **`src/api/`:**

  - **Responsibility:** Defines API routes using `express.Router`. Maps HTTP methods and paths to specific controller functions. Handles route-level middleware application (like validation).
  - **Example:** `habits.routes.js` defines all endpoints related to `/api/v1/habits`.

- **`src/controllers/`:**

  - **Responsibility:** Handles the HTTP request (`req`) and response (`res`) cycle. Parses request parameters, query strings, and bodies. Calls the appropriate service layer functions to execute business logic. Formats the data received from the service into the final HTTP response. Keeps logic minimal, focusing on the HTTP interface.
  - **Example:** `habit.controller.js` contains functions like `getHabits`, `createHabit`, etc., which interact with `habitService`.

- **`src/services/`:**

  - **Responsibility:** Encapsulates the core business logic and rules of the application. Orchestrates calls to one or more repositories to fetch or persist data. Performs data transformations, calculations (like streak logic), and enforces business constraints. It is decoupled from the HTTP layer.
  - **Example:** `habit.service.js` contains functions like `getHabitsForDate`, `createHabit`, `manageTracker`, coordinating calls to `habitRepository` and `trackerRepository`.

- **`src/repositories/`:**

  - **Responsibility:** Abstracts all direct interactions with the database. Contains functions that execute specific SQL queries (or ORM calls). Translates between application data structures and database table structures. Hides the specifics of the database implementation (`sqlite3` in this case) from the service layer.
  - **Example:** `habit.repository.js` and `tracker.repository.js` contain functions like `findById`, `create`, `findTrackersByDateRange`.

- **`src/middlewares/`:**

  - **Responsibility:** Holds reusable middleware functions used across different routes or globally. Handles cross-cutting concerns.
  - **Example:** `authenticate.js` (verifies API key), `validate.js` (handles `express-validator` results). Future middleware for logging or centralized error handling would go here.

- **`src/validators/`:**

  - **Responsibility:** Defines input validation rules using `express-validator`. Keeps validation logic separate and reusable.
  - **Example:** `habit.validator.js` defines rule sets like `createHabit`, `getHabitsByDate`.

- **`src/utils/`:**
  - **Responsibility:** Contains shared, generic utility functions used across different layers. Should not contain core business logic.
  - **Example:** `dbUtils.js` centralizes the database connection setup and promise wrappers for database operations. Future helpers like date formatters or custom error classes would go here.

## Benefits Achieved

- **Improved Readability:** Code is easier to follow as responsibilities are clearly defined within specific files and layers.
- **Enhanced Maintainability:** Modifying database queries only requires changes in the repository layer. Changing business logic primarily affects the service layer. Adding new endpoints involves creating route definitions, controller functions, and potentially new service/repository methods, following a clear pattern.
- **Increased Testability:** Service and repository functions can be unit-tested more easily.
- **Reduced Coupling:** Layers depend on abstractions rather than concrete implementations where possible (especially service depending on repository interface).

This structured approach provides a solid foundation for the continued development and maintenance of the Habit Tracker API.
