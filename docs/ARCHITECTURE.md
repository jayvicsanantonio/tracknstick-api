# API Architecture

This document provides a comprehensive overview of the TrackNStick API architecture, including its structure, design principles, key components, and the architectural decisions made during its development and refactoring.

## 1. System Architecture Overview

The TrackNStick API employs a **layered architecture pattern**, promoting separation of concerns, maintainability, and scalability. The system has transitioned from an initial Express.js setup to a more modern stack featuring the Hono.js framework, deployed on Cloudflare Workers and utilizing Cloudflare D1 for its database.

```mermaid
graph TD
    Client[Client Applications] -->|HTTPS Requests via Hono.js| HonoApp[Hono Application @ Cloudflare Workers]
    HonoApp -->|Request| GlobalMiddleware[Global Middleware (CORS, Logging, Security Headers, Request ID, Bindings Init)]
    GlobalMiddleware -->|Authenticated Request via Clerk| APIRoutes[API Routers (e.g., /api/v1/habits - in src/routes/)]
    APIRoutes -->|Route Handler| Controllers[Controllers (src/controllers/)]
    Controllers -->|Business Logic Invocation| Services[Services (src/services/)]
    Services -->|Data Access Operations| Repositories[Repositories (src/repositories/)]
    Repositories -->|D1 Client API Queries| D1Database[Cloudflare D1 Database (SQLite-compatible)]

    subgraph "Request Handling & Routing (Hono.js)"
        HonoApp
        GlobalMiddleware
        APIRoutes
    end

    subgraph "Application Logic (TypeScript)"
        Controllers
        Services
    end

    subgraph "Data Persistence & Infrastructure (Cloudflare)"
        Repositories
        D1Database
        CloudflareWorkersRuntime[Cloudflare Workers Runtime]
    end
    HonoApp --> CloudflareWorkersRuntime
```
*This diagram illustrates the current architecture using Hono.js on Cloudflare Workers with D1.*

### Layer Responsibilities

*   **API Layer / Routers (`src/routes/`):**
    *   Defines all API routes (e.g., `/habits`, `/progress`) using Hono.js.
    *   Organizes routes into modules (e.g., `habits.routes.ts`).
    *   Maps HTTP methods and paths to specific controller functions.
    *   Applies route-level middleware, such as input validation using Zod schemas.
*   **Controller Layer (`src/controllers/`):**
    *   Manages the HTTP request/response lifecycle using Hono's Context object (`c`).
    *   Retrieves validated input from the request context (populated by validation middleware).
    *   Calls appropriate service methods to perform business logic, passing necessary data.
    *   Constructs and sends HTTP responses (JSON format) to the client.
    *   Keeps controller logic minimal, focusing on HTTP interaction and delegating tasks.
*   **Service Layer (`src/services/`):**
    *   Contains the core business logic, application rules, and complex workflows.
    *   Orchestrates operations, often involving multiple repository calls or interactions with other services (if any).
    *   Performs data transformations, calculations (e.g., habit streaks), and enforces business constraints.
    *   Designed to be independent of the Hono.js framework and HTTP specifics, enhancing testability.
    *   Throws custom, domain-specific errors when business rules are violated or issues occur.
*   **Repository Layer (`src/repositories/`):**
    *   Abstracts all direct database interactions with Cloudflare D1.
    *   Includes functions that execute D1 prepared statements (e.g., `SELECT`, `INSERT`, `UPDATE`, `DELETE`).
    *   Handles the translation between application-level data structures (TypeScript types) and database row formats.
    *   Isolates D1-specific query logic from the service layer.
*   **Middleware (`src/middlewares/`):**
    *   Provides reusable Hono middleware functions for handling cross-cutting concerns:
        *   `clerkMiddleware.ts`: Verifies Clerk JWTs for authentication and extracts user information.
        *   `errorHandler.ts`: A global error handler that catches unhandled errors and formats standardized JSON error responses.
        *   `validateRequest.ts`: Leverages Zod schemas to validate request bodies, query parameters, and path parameters.
        *   `requestLogger.ts`: Logs details of incoming requests and outgoing responses for monitoring and debugging.
        *   Standard Hono middleware for CORS, Secure Headers, etc.
*   **Validators (`src/validators/`):**
    *   Contains Zod schema definitions for validating the structure, types, and constraints of incoming API request data.
*   **Utilities (`src/utils/`):**
    *   A collection of shared helper functions, classes, and constants:
        *   Custom error classes (e.g., `AppError`, `NotFoundError`, `ValidationError`) for consistent error signaling.
        *   Logger utility (`logger.ts`) adapted for the Cloudflare Workers environment.
*   **Types (`src/types/`):**
    *   Defines TypeScript interfaces and type aliases for data structures (e.g., `Habit`, `User`), API payloads, and Hono context bindings.

### Data Flow

1.  A client application sends an HTTPS request to a specific API endpoint.
2.  The Hono application, running within the Cloudflare Workers runtime, receives the request.
3.  The request passes through global Hono middleware (e.g., CORS, request logger, security headers).
4.  Hono's router matches the request path and HTTP method to a defined route.
5.  Route-specific middleware are executed in order (e.g., `clerkMiddleware` for authentication, `validateRequest` for Zod schema validation).
6.  If authentication and validation succeed, the relevant controller function is invoked with Hono's context object (`c`).
7.  The controller extracts data from `c` (e.g., validated input from `c.get('validatedData')`, `userId` from `c.get('userId')`) and calls the appropriate service method.
8.  The service method executes the core business logic, potentially calling repository methods to interact with Cloudflare D1.
9.  Repository methods construct and execute SQL queries using the D1 client API provided via bindings (`c.env.DB`).
10. Data flows back: Repositories return data (or status) to services, which process it and return results to controllers.
11. The controller formats the final HTTP response (JSON) using `c.json(...)`.
12. Unhandled errors are caught by the global `errorHandler` middleware, which sends a standardized JSON error response.

## 2. Code Organization (`src/` directory)

The `src/` directory is structured to mirror the layered architecture, promoting clarity and maintainability:

-   **`src/index.ts`:** The main entry point for the Cloudflare Worker. It initializes the Hono application, registers global middleware, mounts API route modules, and sets up the global error handler.
-   **`src/routes/`:** Contains route definition files (e.g., `habits.routes.ts`). Each file groups routes for a specific resource and links them to controller functions and middleware.
-   **`src/controllers/`:** Holds controller functions that manage HTTP request/response interactions.
-   **`src/services/`:** Contains the application's core business logic.
-   **`src/repositories/`:** Includes modules for all data access logic related to Cloudflare D1.
-   **`src/middlewares/`:** Stores custom Hono middleware for shared functionalities.
-   **`src/validators/`:** Houses Zod schema definitions for request data validation.
-   **`src/types/`:** Centralizes TypeScript type definitions and interfaces.
-   **`src/utils/`:** A collection of shared utilities like custom error classes and loggers.

This structure facilitates:
-   **Easy Navigation:** Locating code by its defined responsibility.
-   **Modularity:** Developing and testing components independently.
-   **Maintainability:** Localizing changes and minimizing their impact on other system parts.

## 3. Design Principles

The API architecture is built upon these fundamental design principles:

1.  **Separation of Concerns (SoC):** Each layer and module has a distinct, well-defined responsibility.
2.  **Single Responsibility Principle (SRP):** Functions and classes are designed to perform one primary task.
3.  **Layered Architecture:** Provides a structured approach, improving code organization and reducing coupling.
4.  **Unidirectional Dependency Flow:** Dependencies primarily flow downwards (Controllers -> Services -> Repositories), minimizing circular dependencies.
5.  **Testability:** Core logic (services, repositories) is designed for effective unit and integration testing, often through dependency mocking.
6.  **Configuration Management:** Application settings (API keys, D1 bindings) are managed via environment variables (`.dev.vars` for local, Wrangler secrets for deployed) and `wrangler.toml`, not hardcoded.
7.  **Robust Error Handling:** A centralized mechanism with custom error types ensures consistent and informative error responses.
8.  **Type Safety:** Leveraging TypeScript throughout the project for compile-time error checking and improved code quality.
9.  **Statelessness:** Cloudflare Workers enforce a stateless execution model; application state is managed externally (in D1 or via client tokens).

## 4. Key Components & Technologies

The TrackNStick API leverages a modern, serverless-first technology stack:

*   **Hono.js:** A small, simple, and ultrafast web framework for JavaScript/TypeScript, particularly well-suited for edge computing environments like Cloudflare Workers. It handles routing, middleware, and request/response management.
*   **Cloudflare Workers:** The serverless execution environment where the API logic runs. Provides scalability, global distribution, and integration with other Cloudflare services.
*   **Cloudflare D1:** A serverless SQLite-compatible database used for data persistence. Accessed via D1 client API bindings available in the Worker environment.
*   **Clerk:** A third-party service for authentication and user management (JWT-based). The backend verifies JWTs issued by Clerk.
*   **TypeScript:** The primary programming language, providing static typing to enhance code quality, maintainability, and developer productivity.
*   **Zod:** A TypeScript-first schema declaration and validation library. Used to define and enforce the structure of API request data (bodies, query parameters, path parameters) via Hono middleware.
*   **Vitest:** A modern, fast testing framework used for writing and running unit and integration tests.
*   **ESLint & Prettier:** Tools for enforcing consistent code style and identifying potential code quality issues.
*   **Wrangler CLI:** The command-line interface for managing and deploying Cloudflare Workers projects, including D1 database migrations and environment configuration.
*   **Node.js & pnpm:** Node.js is the underlying JavaScript runtime. `pnpm` is used as the package manager for efficient dependency management. `fnm` (Fast Node Manager) is recommended for managing Node.js versions.

## 5. Architectural Decisions (Summary)

The current architecture is the result of several key decisions aimed at modernizing the stack and improving overall application quality:

1.  **Adoption of Serverless Edge Architecture:**
    *   **Decision:** Migrated from a traditional Node.js/Express/SQLite stack to Hono.js on Cloudflare Workers with Cloudflare D1.
    *   **Rationale:** To achieve better performance by executing logic closer to users, enhance scalability, reduce operational overhead associated with server management, and leverage the integrated Cloudflare ecosystem.
2.  **Implementation of Layered Architecture:**
    *   **Decision:** Structured the application into distinct layers (Routes, Controllers, Services, Repositories).
    *   **Rationale:** To improve separation of concerns, make the codebase more maintainable and testable, and provide a scalable structure for future development.
3.  **Integration of Clerk for Authentication:**
    *   **Decision:** Used Clerk for handling user authentication and session management via JWTs.
    *   **Rationale:** Offloads complex and critical security concerns to a specialized third-party service, simplifying development and ensuring robust authentication.
4.  **Full TypeScript Adoption:**
    *   **Decision:** Developed the entire backend using TypeScript.
    *   **Rationale:** To benefit from static typing for improved code reliability, easier refactoring, better tooling, and enhanced developer experience.
5.  **Schema Validation with Zod:**
    *   **Decision:** Employed Zod for defining and validating API request data schemas through middleware.
    *   **Rationale:** Ensures data integrity at the entry point of the API, provides clear error messages for invalid input, and integrates well with TypeScript.
6.  **Testing with Vitest:**
    *   **Decision:** Chose Vitest as the primary framework for unit and integration testing.
    *   **Rationale:** Offers a modern, fast, and developer-friendly testing experience with good TypeScript support.
7.  **Centralized Error Handling with Custom Errors:**
    *   **Decision:** Implemented a global error handling middleware in Hono, coupled with a set of custom error classes.
    *   **Rationale:** To provide consistent, informative error responses to clients and to handle different error scenarios gracefully throughout the application.
8.  **Repository Pattern for Database Interaction:**
    *   **Decision:** Used the repository pattern to abstract all Cloudflare D1 database operations.
    *   **Rationale:** Decouples the core business logic (services) from the specifics of D1 data access, improving testability and making it easier to manage database interactions.
9.  **Configuration Management with Wrangler:**
    *   **Decision:** Utilized Wrangler CLI for environment configuration (`wrangler.toml`, `.dev.vars`) and secrets management.
    *   **Rationale:** Provides a secure and flexible way to manage environment-specific settings for local development and Cloudflare deployments.
10. **Database Schema Management with Wrangler D1 Migrations:**
    *   **Decision:** Adopted `wrangler d1 migrations` for managing database schema changes using SQL files.
    *   **Rationale:** Offers a version-controlled and systematic approach to evolving the D1 database schema, integrated with the Cloudflare developer toolchain. (This replaced earlier use of Knex.js for local SQLite).

## 6. System Diagrams

*(This section is for detailed diagrams. `docs/INDEX.md` contains the primary high-level architecture and ERD diagrams.)*

**Potential Future Diagrams:**
*   Detailed User Authentication Flow (Sequence Diagram with Client, Clerk Frontend, API, Clerk Backend).
*   Habit Creation/Update Data Flow (Sequence Diagram through API layers).
*   Cloudflare Deployment Architecture (Visualizing Worker, D1, KV, R2 interactions if used).

## 7. Future Considerations & Scalability

*   **D1 Optimization:** Continuously monitor D1 performance. Optimize queries, explore indexing strategies further, and consider data archiving or sharding patterns if growth demands (though D1 aims for simplicity).
*   **Edge Caching:** Utilize Cloudflare KV or the Cache API for caching frequently accessed, semi-static data to reduce D1 load and improve API latency.
*   **Enhanced Observability:** Integrate with advanced third-party logging (e.g., Logtail, Better Stack) and error tracking (e.g., Sentry) services for richer insights beyond default Cloudflare logs.
*   **Asynchronous Task Processing:** For long-running or non-time-critical operations (e.g., report generation, bulk notifications), leverage Cloudflare Queues to offload work from the request-response cycle.
*   **API Gateway Integration:** For more complex API management needs (e.g., advanced request transformation, sophisticated analytics, monetization), Cloudflare API Gateway could be an option.

This document outlines the TrackNStick API's architecture. It's a living document, expected to evolve alongside the application.

Last Updated: (Current Date) - Reflects the Hono.js, Cloudflare Workers, and D1 architecture.
