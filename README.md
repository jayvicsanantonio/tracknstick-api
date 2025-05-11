# Habit Tracker API

This is a RESTful API for a habit tracker application built with Node.js, Express.js, and SQLite.

## Features

- Create, Read, Update, and Delete (CRUD) habits.
- Track habit completions for specific dates (toggle on/off).
- Retrieve habit statistics (streak, total completions, last completed date).
- Secure endpoints using Clerk JWT authentication.

## Tech Stack

- **Backend:** Node.js
- **Framework:** Express.js
- **Database:** SQLite
- **Linting/Formatting:** ESLint, Prettier

## Visual Overview

### High-Level Architecture

```mermaid
graph LR
    Client -->|"HTTP Request\nGET POST PUT DELETE"| ExpressApp[Express App];
    ExpressApp -->|"Request"| Middleware["Middleware <br> (CORS, Helmet, JSON Parser, Auth)"];
    Middleware -->|"Authenticated Request"| Routes["API Routes <br> (/api/v1/...)"];
    Routes -->|"Params, Body"| Controller["Controller <br> (e.g., habit.controller.js)"];
    Controller -->|"Data Request"| Service["Service Layer <br> (e.g., habit.service.js)"];
    Service -->|"DB Operations"| Repository["Repository Layer <br> (e.g., habit.repository.js)"];
    Repository -->|"SQL Query"| DBUtils["DB Utils <br> (dbUtils.js)"];
    DBUtils -->|"Read/Write"| Database["(SQLite <br> tracknstick.db)"];
    Database -->|"Result Set"| DBUtils;
    DBUtils -->|"Data"| Repository;
    Repository -->|"Data"| Service;
    Service -->|"Processed Data"| Controller;
    Controller -->|"JSON Response"| ExpressApp;
    ExpressApp -->|"HTTP Response"| Client;

    subgraph "Application Layers"
        Controller
        Service
        Repository
        DBUtils
    end

    subgraph "Infrastructure"
        Database
    end
```

### Simplified Database ERD

```mermaid
erDiagram
    USERS ||--|{ HABITS : "tracks"
    USERS ||--|{ TRACKERS : "logs"
    HABITS ||--|{ TRACKERS : "records"

    USERS {
        INTEGER id PK
        TEXT clerk_user_id UK "Clerk User ID"
    }

    HABITS {
        INTEGER id PK
        INTEGER user_id FK
        TEXT name
        TEXT icon
        TEXT frequency "Comma-separated days"
        INTEGER streak
        INTEGER total_completions
        DATETIME last_completed
    }

    TRACKERS {
        INTEGER id PK
        INTEGER habit_id FK
        INTEGER user_id FK
        DATETIME timestamp "Completion Timestamp (UTC)"
        TEXT notes
    }
```

## Authentication

API endpoints are protected using Clerk. Requests must include a valid JWT session token obtained from your Clerk frontend application in the `Authorization: Bearer <token>` header. The backend verifies this token using the `@clerk/express` middleware.

## Rate Limiting

To prevent abuse, API requests are rate-limited. By default, each IP address is allowed 100 requests per 15-minute window. If the limit is exceeded, a `429 Too Many Requests` error will be returned.

## Prerequisites

- Node.js (v16 or later recommended)
- npm (usually included with Node.js)

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/jayvicsanantonio/tracknstick-api.git
    cd tracknstick-api
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up environment variables:**

    - Create a `.env` file in the project root.
    - Add the following variables (adjust values as needed):
      PORT=3000
      NODE_ENV=development

      # Clerk API Keys (Get from Clerk Dashboard)

      CLERK_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
      CLERK_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

      # Optional: Database Path

      # DATABASE_PATH=./tracknstick.db

      # Optional: Rate Limiting

      # RATE_LIMIT_WINDOW_MS=900000

      # RATE_LIMIT_MAX_REQUESTS=100

      ```

      ```

    - **Important:** Replace the placeholder Clerk keys with your actual keys.

4.  **Database Setup:**
    - The database schema is managed using Knex migrations.
    - Run the following command to create the database file (if it doesn't exist) and apply all pending migrations:
      ```bash
      npm run db:migrate
      ```
    - **Important:** When a user authenticates via Clerk for the first time against the backend, you might need logic (currently _not_ implemented) to create a corresponding record in the local `users` table using their Clerk User ID (`req.auth.userId`). The `api_key` column is no longer used for authentication.

## Running the Application

- **Development Mode (with auto-restart via nodemon):**
  ```bash
  npm start
  ```
- **(Optional) Production Mode:**
  ```bash
  npm install --production
  NODE_ENV=production node index.js
  ```

The API will typically be available at `http://localhost:3000` (or the port specified in your `.env` file).

## Running Tests

```bash
npm test
```

_(Note: Test suite setup is pending)_

## Database Migrations

Database schema changes are managed using Knex.

- **Apply Migrations:** To apply all pending migrations and bring the database schema up to date:
  ```bash
  npm run db:migrate
  ```
- **Rollback Last Migration:** To undo the most recently applied migration batch:
  ```bash
  npm run db:rollback
  ```
- **Create New Migration:** To generate a new migration file (replace `<migration_name>`):
  ```bash
  npm run db:make-migration -- <migration_name>
  ```

## API Documentation

For detailed endpoint specifications, request/response examples, and the full database schema, please see the **[API Documentation](docs/api/implementation.md)**.

## Refactoring Overview

A significant refactoring effort was recently completed on this project with the primary goals of improving maintainability, testability, and performance, and establishing a scalable architecture.

Details about the refactoring process, architecture decisions, specific improvements, and learnings can be found in the `docs` directory:

- [Architecture Decisions](docs/architecture/decisions.md)
- [Maintainability Improvements](docs/development/maintainability.md)
- [Enhancements & Future Work](docs/development/enhancements.md)
- [Performance Optimizations](docs/development/optimizations.md)
- [Learnings & Takeaways](docs/development/learnings.md)

## Contributing

_(Add contribution guidelines if applicable)_

## License

_(Add license information if applicable, e.g., ISC)_
