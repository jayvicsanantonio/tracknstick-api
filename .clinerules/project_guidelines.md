# Project Guidelines for tracknstick-api

These guidelines ensure consistency, maintainability, and quality across the project.

## 1. Architecture & Code Structure

1.1. **Maintain Layered Architecture:** Adhere strictly to the established layered architecture: - `src/api/`: Express routers and route definitions only. Mount routers in `index.js`. - `src/controllers/`: Handle HTTP request/response cycle (parsing `req`, sending `res`). Call services for business logic. Perform _only_ basic request shape validation if not handled by middleware. Keep controllers thin and focused on HTTP flow. - `src/services/`: Contain business logic, orchestrate repository calls, handle data transformation/aggregation needed for business rules. Should _not_ directly access `req`/`res` objects or perform raw database queries. Validate business rules. - `src/repositories/`: Abstract all database interactions using specific, well-named functions. Return plain data (objects/arrays). Should _not_ contain business logic. Handle database-level errors. - `src/middlewares/`: Reusable middleware functions (authentication, validation, error handling, logging). - `src/utils/`: Shared, generic, reusable helper functions (e.g., date formatting, DB wrappers, custom error classes). Avoid business logic here. - `src/validators/`: Validation rule definitions using `express-validator`.
1.2. **Dependency Flow:** Dependencies must flow downwards: `Controllers` -> `Services` -> `Repositories` -> `Utils/DB`. Avoid circular dependencies. Lower layers should not be aware of higher layers (e.g., Repositories should not know about Controllers).
1.3. **`index.js`:** Keep the root `index.js` minimal. Primarily for application setup (loading env vars, applying global middleware, mounting routers, starting the server, basic error handling setup).

## 2. Code Style & Quality

2.1. **ESLint & Prettier:** Always run `npm run format` and `npm run lint` (or `npm run lint:fix`) before committing changes. Adhere to the configured ESLint rules (`airbnb-base` + `prettier`). Address all linting errors/warnings.
2.2. **`async/await`:** Use `async/await` consistently for all asynchronous operations, especially database interactions and service calls. Avoid mixing raw callbacks with Promises/async functions where possible.
2.3. **Naming Conventions:** - Variables, functions: `camelCase` - Classes: `PascalCase` - Constants: `UPPER_SNAKE_CASE` - Files: `kebab-case` or `camelCase` (be consistent, prefer `kebab-case` for new files unless matching existing patterns like `dbUtils.js`). Controller/Service/Repository files should clearly indicate their entity (e.g., `habit.controller.js`).
2.4. **Modularity:** Break down complex functions into smaller, single-purpose functions. Keep files focused on a single entity or responsibility.
2.5. **Comments:** Use comments primarily to explain _why_ something is done, not _what_ it does (code should be self-explanatory). Explain complex algorithms or non-obvious logic. Use `// TODO:` for planned work.

## 3. Error Handling

3.1. **Use `next(error)`:** In controllers and async middleware, wrap asynchronous operations in `try...catch`. Pass caught errors to the `next(error)` function for centralized handling.
3.2. **Service Layer Errors:** Services should throw specific, custom errors (e.g., `NotFoundError`, `AuthorizationError`, extending a base `AppError` class defined in `utils`) when business rules fail or expected data isn't found. Avoid throwing generic `Error` objects directly from services where possible.
3.3. **Repository Layer Errors:** Repositories (and other modules performing direct DB operations like `authenticate.js`) should catch database-specific errors. They should log the original error and re-throw a specific `DatabaseError` (defined in `src/utils/errors.js`), passing the original error for context. This allows the centralized handler to manage the response appropriately.
3.4. **Centralized Handler:** Implement a dedicated error-handling middleware (`src/middlewares/errorHandler.js`, mounted last in `index.js`) to catch all errors passed via `next(error)`. This middleware should: - Log the error details (URL, method, message, stack in dev, original error if available). - Send a standardized JSON error response (`{ status, message, errorCode, [errors] }`). - Include a unique `errorCode` string for each error type. - Specifically handle `VALIDATION_ERROR` by including a detailed `errors` array from `express-validator`. - Mask internal error details (like stack traces) and use a generic `INTERNAL_SERVER_ERROR` code/message for all 500 errors in production environments. - Set appropriate HTTP status codes based on the error type.

## 4. Input Validation

4.1. **Middleware Validation:** All request input (body, query params, path params) must be validated using `express-validator` rules defined in the `src/validators/` directory. Apply validation using the `validate` middleware in the route definitions (`src/api/`).
4.2. **No Controller/Service Validation:** Avoid performing input format/type validation within controllers or services; this is the responsibility of the validation middleware. Services may perform _business rule_ validation.

## 5. Database

5.1. **Repository Abstraction:** All direct database interactions (`dbAll`, `dbGet`, `dbRun`) _must_ reside within the `src/repositories/` files. Services and controllers must not access `dbUtils` or the `db` object directly.
5.2. **Specific Repository Functions:** Create specific functions in repositories for each distinct query needed (e.g., `findById`, `findByDay`, `create`, `update`). Avoid generic query functions where possible.
5.3. **Data Ownership:** Ensure repository functions include `user_id` in `WHERE` clauses for queries involving user-specific data (like habits, trackers) to prevent data leakage between users.
5.4. **Transactions:** For operations involving multiple dependent writes (e.g., deleting a habit and its trackers), use the centralized `withTransaction` utility function from `src/utils/transactionUtils.js` within the _service_ layer to ensure atomicity.
5.5. **Schema Changes:** Use Knex migrations (`db/migrations/`) to manage all database schema changes. Create new migrations using `npm run db:make-migration -- <name>` and apply them using `npm run db:migrate`. Update `API.md` and relevant documentation whenever the schema is modified.

## 6. Security

6.1. **Authentication:** Ensure the `authenticate` middleware is applied to all protected routes.
6.2. **Authorization:** Verify data ownership within service or repository layers (e.g., ensuring a user can only modify/delete their own habits). Do not rely solely on IDs passed in the request path/body.
6.3. **Input Sanitization:** While `express-validator` helps, be mindful of potential security risks. Use parameterized queries (as handled by `sqlite3` placeholders `?`) to prevent SQL injection. Avoid constructing SQL queries directly with user input.
6.4. **Dependencies:** Keep dependencies updated (`npm update`). Regularly audit dependencies for known vulnerabilities (`npm audit`).
6.5. **Helmet:** Ensure `helmet` middleware is used in `index.js` for basic security headers.
6.6. **Rate Limiting:** Consider adding rate limiting middleware (e.g., `express-rate-limit`) for production environments to prevent abuse.

## 7. Testing

7.1. **Importance:** Automated tests are crucial for ensuring code correctness, preventing regressions, and enabling confident refactoring.
7.2. **Types:** Aim for a mix of: - **Unit Tests:** Test individual functions/modules in isolation (especially services, repositories, utils), mocking dependencies. - **Integration Tests:** Test the interaction between layers (e.g., controller -> service -> repository). - **End-to-End (E2E) Tests:** Test the API endpoints by making actual HTTP requests.
7.3. **Goal:** Strive for good test coverage, particularly for business logic (services) and critical API endpoints. (Testing framework setup is pending).

## 8. Documentation

8.1. **`API.md`:** Keep `API.md` within `.clinerules/` updated with accurate endpoint specifications, request/response formats, and the database schema. This is the source of truth for API consumers.
8.2. **`README.md`:** Maintain `.clinerules/README.md` as the high-level project overview and setup guide, linking to other relevant documentation within `.clinerules/`.
8.3. **Refactoring Docs:** Update files within `.clinerules/` (e.g., `architecture_decisions.md`) as further significant architectural changes or refactoring efforts occur.
8.4. **Code Comments:** Use JSDoc-style comments for functions, especially in services and utils, to explain parameters, return values, and purpose.

## 9. Commits & Pull Requests

9.1. **Commit Messages:** Follow Conventional Commits format (e.g., `feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`, `test: ...`, `chore: ...`). Provide clear and concise descriptions in the commit body if necessary.
9.2. **Pull Requests:** Create pull requests for distinct features, fixes, or refactoring steps. Keep PRs focused and reasonably sized. Ensure PR descriptions clearly explain the changes and their purpose. Link to relevant issues if applicable.
9.3. **Branching:** Use feature branches (e.g., `feat/add-habit-sharing`, `fix/tracker-bug`) based off the main development branch.

## 10. Environment & Configuration

10.1. **Environment Variables:** Use `.env` files (e.g., `.env`, `.env.local`, `.env.production`) for environment-specific configurations (ports, database paths, API keys, secrets), loaded via `dotenv`. Access variables via `process.env`. Use `.env.local` for local development overrides. Never commit `.env` or `.env.local` files to Git (ensure they are in `.gitignore`).
10.2. **`NODE_ENV`:** Utilize `process.env.NODE_ENV` (e.g., 'development', 'production', 'test') to control environment-specific behavior (like error detail levels, logging verbosity). Set this in your `.env` files or system environment.

## 11. General

11.1. **Clarity over Brevity:** Write clear, understandable, and maintainable code. Prioritize readability.
11.2. **DRY (Don't Repeat Yourself):** Avoid duplicating code. Extract reusable logic into functions or modules (e.g., in `utils` or base classes).
11.3. **Consistency:** Adhere to the established patterns and conventions within the project.
