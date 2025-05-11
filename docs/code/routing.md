# Routing Implementation Refactoring

This document details the refactoring of API route definitions using `express.Router` for improved organization and clarity.

## Initial State

Originally, all API route handlers (e.g., `app.get('/habits', ...)` , `app.post('/habits', ...)`) were defined directly on the main Express `app` instance within the root `index.js` file. This approach mixes route definitions with application setup, middleware configuration, and potentially other logic, making `index.js` large and difficult to navigate as the number of endpoints grows.

## Decision: Use `express.Router`

To improve modularity and organization, we decided to use `express.Router`. This allows grouping related routes into separate modules.

## Rationale

1.  **Modularity:** Grouping routes by resource (e.g., all habit-related routes together) makes the codebase more organized and easier to understand.
2.  **Maintainability:** Changes to a specific resource's routes are isolated within its router file, reducing the chance of conflicts and simplifying updates.
3.  **Scalability:** Easily add new resource routes by creating new router files and mounting them in the main application file.
4.  **Middleware Application:** `express.Router` allows applying middleware (like authentication or validation) specifically to a group of routes or individual routes within that group, providing more granular control than applying everything globally in `index.js`.

## Implementation Steps

1.  **Create `src/api/` Directory:** A dedicated directory was created to hold all API route definitions.
2.  **Create Router File (`habits.routes.js`):**
    - A new file, `src/api/habits.routes.js`, was created specifically for habit-related endpoints.
    - An instance of `express.Router()` was created within this file.
3.  **Define Routes on Router:**
    - All route definitions previously in `index.js` (e.g., `GET /`, `POST /`, `PUT /:habitId`, `DELETE /:habitId`, nested tracker routes, stats route) were moved to `habits.routes.js`.
    - Instead of `app.get(...)`, the definitions now use `router.get(...)`, `router.post(...)`, etc.
4.  **Apply Route-Level Middleware:**
    - The `authenticate` middleware was applied directly within the router file to all habit routes.
    - The `validate` middleware (along with specific validation rules from `habit.validator.js`) was applied to each route requiring input validation.
5.  **Import Controller Functions:** The router file imports the necessary controller functions (e.g., `habitController.getHabits`) from `src/controllers/habit.controller.js` to handle the actual request logic after middleware processing.
6.  **Export Router:** The configured `router` instance was exported from `habits.routes.js`.
7.  **Mount Router in `index.js`:**
    - The main `index.js` file now imports the `habitRoutes` router.
    - The router is mounted onto the main `app` instance using a base path: `app.use('/api/v1/habits', habitRoutes);`. This prefixes all routes defined within `habits.routes.js` with `/api/v1/habits`.
    - The original inline route handler implementations were removed from `index.js`.

## Benefits Achieved

- **Cleaner `index.js`:** The main application file is significantly simplified, focusing purely on setup and global configurations.
- **Organized Routes:** Routes are logically grouped by resource (`habits`) within the `src/api/` directory.
- **Improved Readability:** Easier to find and understand the routes associated with a specific feature.
- **Simplified Middleware Management:** Middleware relevant only to specific resources is applied cleanly within the router file.
