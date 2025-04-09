# Service Layer Implementation Refactoring

This document explains the refactoring process related to introducing the Service layer (`src/services/`) in the Habit Tracker API.

## Initial State

Originally, the core business logic (e.g., determining which habits are scheduled for a day, calculating statistics like streaks, deciding whether to add or remove a tracker) was mixed within the route handler callbacks in `index.js`, alongside HTTP handling and direct database calls. This made the logic difficult to reuse, test independently, and maintain as complexity grew.

## Decision: Introduce Service Layer

As a key part of the layered architecture, we introduced a dedicated Service layer. The primary goal was to extract and centralize all core application business logic, decoupling it from both the HTTP interface (Controllers) and direct data persistence (Repositories).

## Rationale

1.  **Encapsulation of Business Logic:** Provides a single, clear place for business rules, data transformations, and orchestrations involving multiple data entities.
2.  **Reusability:** Service functions can be called by multiple controllers or potentially other services without duplicating logic.
3.  **Improved Testability:** Services are easier to unit test than controllers because they don't depend directly on `req`/`res` objects. Dependencies (like repositories) can be mocked, allowing focused testing of the business logic itself.
4.  **Decoupling:** The Service layer acts as an intermediary, reducing direct dependencies between the web framework (Express controllers) and the data access layer (repositories). This makes the application more flexible to change.
5.  **Clearer Controllers:** Allows controllers to focus solely on handling HTTP requests/responses and delegating tasks to the appropriate service.

## Implementation Steps

1.  **Create `src/services/` Directory:** A dedicated directory was created.
2.  **Create Service File (`habit.service.js`):** A file was created for each primary domain entity or feature area (e.g., `habits`).
3.  **Define Service Functions:** For each distinct business operation identified (e.g., `getHabitsForDate`, `createHabit`, `updateHabit`, `deleteHabit`, `manageTracker`, `getHabitStats`), a corresponding asynchronous service function was created.
4.  **Extract Business Logic:** Core logic previously found in controller route handlers was moved into these service functions. This included:
    - Calculations (e.g., determining the day of the week based on date and timezone, calculating date ranges, calculating streaks).
    - Data aggregation/transformation (e.g., combining habit data with tracker data to determine the `completed` status).
    - Decision-making logic (e.g., deciding whether to add or remove a tracker in `manageTracker`).
5.  **Introduce Repository Calls:** Instead of making direct database calls, service functions were updated to call functions on the newly created Repository layer (`habit.repository.js`, `tracker.repository.js`). Services orchestrate these calls (e.g., fetching a habit, then fetching its trackers).
6.  **Handle Repository Results:** Service functions process the data returned by repositories (e.g., checking if a habit was found, formatting data for the controller).
7.  **Error Handling:** Implemented `try...catch` blocks around repository calls. Services might catch specific repository errors and re-throw more generic or domain-specific errors, or simply let errors propagate up to the controller (to be handled by centralized error middleware). Services also handle cases like "not found" by returning specific values (e.g., `null`) for the controller to interpret.
8.  **Update Controllers:** Controllers were updated to import and call the relevant service functions instead of containing the business logic themselves.

## Benefits Achieved

- Business logic is now centralized, reusable, and easier to understand.
- Controllers are significantly thinner and focused on their core responsibility.
- The Service layer is highly testable in isolation.
- Improved separation of concerns enhances overall maintainability and flexibility.
