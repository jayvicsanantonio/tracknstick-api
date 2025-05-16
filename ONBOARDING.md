# TrackNStick API - Onboarding Guide

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Directory Structure](#directory-structure)
- [Key Components](#key-components)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Logging](#logging)
- [Request Flow](#request-flow)
- [Data Validation](#data-validation)
- [Testing](#testing)
- [Database Interactions](#database-interactions)
- [API Versioning](#api-versioning)
- [Security](#security)
- [Common Workflows](#common-workflows)
- [Debugging](#debugging)
- [Documentation](#documentation)
- [Code Review Process](#code-review-process)
- [Database Schema Changes (May 2023)](#database-schema-changes-may-2023)

## Overview

TrackNStick API is a RESTful API service that powers the TrackNStick habit tracking application. The API facilitates habit management, tracking, and analytics, enabling users to build and maintain healthy habits through our web application.

### Core Functionality

- **Habit Management**: Create, read, update, and delete habits
- **Habit Tracking**: Record and manage habit completion through trackers
- **Analytics**: Calculate statistics and provide insights on habit performance
- **User Management**: Handle user authentication and authorization via Clerk

## Architecture

Our API follows a layered architecture pattern with clean separation of concerns:

```
Client Request → Middleware → Router → Controller → Service → Repository → Database
```

### Main Entry Point

The application starts in `src/index.ts`, which sets up our Hono application with essential middleware and routes:

```typescript
// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { D1Database } from '@cloudflare/workers-types';
import { habitRoutes } from './routes/habits.js';
import { healthRoutes } from './routes/health.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { initBindings } from './middlewares/initBindings.js';
import logger from './utils/logger.js';

// Create the main Hono app
const app = new Hono<{ Bindings: Bindings }>();

// Apply global middlewares
app.use('*', requestLogger());
app.use('*', secureHeaders());
app.use('*', initBindings());
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'https://tracknstick.com'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// Set up API routes
app.route('/api/v1/habits', habitRoutes);
app.route('/health', healthRoutes);

// 404 handler and global error handler
// ...

export default app;
```

### Architectural Pattern

We implement a layered architecture with the following components:

1. **Routes**: Define API endpoints and HTTP methods
2. **Controllers**: Handle HTTP requests and responses
3. **Services**: Implement business logic
4. **Repositories**: Manage data access and database operations
5. **Validators**: Validate and sanitize input data
6. **Middlewares**: Process requests before they reach route handlers
7. **Utils**: Provide shared utility functions

This architecture promotes:

- **Separation of concerns**: Each layer has specific responsibilities
- **Testability**: Components can be tested in isolation
- **Maintainability**: Changes in one layer have minimal impact on others
- **Reusability**: Common functionality is abstracted and shared

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- Git

### Local Development Setup

1. **Clone the repository**

```bash
git clone git@github.com:username/tracknstick-api.git
cd tracknstick-api
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.dev.vars` file in the project root:

```
CLERK_SECRET_KEY=your_clerk_secret_key
ENVIRONMENT=development
```

4. **Start the development server**

```bash
npm run dev
```

This starts the API on `http://localhost:3000`.

5. **Run linting and tests**

```bash
npm run lint
npm test
```

## Directory Structure

```
tracknstick-api/
├── .github/          # GitHub Actions workflows
├── docs/             # API documentation
│   └── api/          # Endpoint specifications
├── migrations/       # Database migration files
├── scripts/          # Utility scripts
├── src/              # Source code
│   ├── api/          # API route definitions
│   ├── controllers/  # Request handlers
│   ├── middlewares/  # Express middleware functions
│   ├── repositories/ # Data access layer
│   ├── routes/       # Route configurations
│   ├── services/     # Business logic
│   ├── types/        # TypeScript type definitions
│   ├── utils/        # Utility functions
│   └── validators/   # Request validation
├── tests/            # Test files
│   ├── integration/  # Integration tests
│   └── unit/         # Unit tests
├── .eslintrc.json    # ESLint configuration
├── package.json      # Project dependencies and scripts
├── tsconfig.json     # TypeScript configuration
└── wrangler.toml     # Cloudflare Workers configuration
```

### Reasoning Behind Organization

- **Separation by function**: Organizing code by functional role rather than features allows for better reuse and clearer responsibilities
- **Consistent interface**: Each layer has a consistent interface, making it easy to understand and extend the codebase
- **Testing flexibility**: Structure facilitates both unit and integration testing

## Key Components

### Routes

Routes define API endpoints and map them to controller functions:

```typescript
// src/routes/habits.ts
import { Hono } from 'hono';
import { clerkMiddleware } from '../middlewares/clerkMiddleware.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import * as habitValidator from '../validators/habit.validator.js';
import * as habitController from '../controllers/habit.controller.js';

const app = new Hono();

// Apply Clerk auth middleware to all routes
app.use('*', clerkMiddleware());

// GET /api/v1/habits
app.get(
  '/',
  validateRequest(habitValidator.getHabitsByDateSchema, 'query'),
  habitController.getHabits
);

// POST /api/v1/habits
app.post(
  '/',
  validateRequest(habitValidator.createHabitSchema, 'json'),
  habitController.createHabit
);

// More route definitions...

export { app as habitRoutes };
```

### Controllers

Controllers handle HTTP requests and delegate business logic to services:

```typescript
// src/controllers/habit.controller.ts
export const getHabits = async (c: Context) => {
  const { userId } = c.get('auth');
  const { date, timeZone } = c.get('validated_query');

  try {
    const habits = await habitService.getHabitsForDate(
      userId,
      date,
      timeZone,
      c.env.DB
    );
    return c.json(habits);
  } catch (error) {
    console.error(`Error in getHabits controller for user ${userId}:`, error);
    throw error;
  }
};
```

### Services

Services implement business logic and coordinate data access:

```typescript
// src/services/habit.service.ts
export const getHabitsForDate = async (
  userId: string,
  date: string,
  timeZone: string,
  db: D1Database
) => {
  try {
    // Get habits from repository
    const habits = await habitRepository.getHabitsByDate(db, userId, date);

    // Transform database rows to response format
    return habits.map((habit) => ({
      id: habit.id.toString(),
      name: habit.name,
      // Transform data for client consumption
      // ...
    }));
  } catch (error) {
    console.error(
      `Error in getHabitsForDate service for user ${userId}:`,
      error
    );
    throw error;
  }
};
```

### Repositories

Repositories handle data access and database operations:

```typescript
// src/repositories/habit.repository.ts
export async function getHabitsByDate(
  db: D1Database,
  userId: string,
  date: string
): Promise<HabitRow[]> {
  // Create a cache key using the userId and date
  const cacheKey = `habits:${userId}:date:${date}`;

  // Try to get from cache first, or fetch from DB if not cached
  return cache.getOrSet(
    cacheKey,
    async () => {
      // Database query logic
      const habits = await db
        .prepare(
          `
          SELECT * FROM habits 
          WHERE user_id = ? 
          AND start_date <= ? 
          AND (end_date IS NULL OR end_date >= ?)
        `
        )
        .bind(userId, date, date)
        .all();

      return habits.results as HabitRow[];
    },
    { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
  );
}
```

## Configuration

### Environment Variables

Key environment variables used:

| Variable         | Description                                               | Required |
| ---------------- | --------------------------------------------------------- | -------- |
| CLERK_SECRET_KEY | Secret key for Clerk authentication                       | Yes      |
| ENVIRONMENT      | Deployment environment (development, staging, production) | Yes      |

### Cloudflare Workers Configuration

We use Cloudflare Workers for deployment, configured in `wrangler.toml`:

```toml
name = "tracknstick-api"
main = "src/index.ts"
compatibility_date = "2023-05-18"

# D1 Database binding
[[d1_databases]]
binding = "DB"
database_name = "tracknstick"
database_id = "..."
```

## Authentication

We use [Clerk](https://clerk.dev/) for authentication and user management. The authentication flow is:

1. Client obtains JWT token from Clerk
2. Client includes token in Authorization header
3. API validates token via `clerkMiddleware`
4. User ID extracted from token is available to controllers

```typescript
// src/middlewares/clerkMiddleware.ts
export const clerkMiddleware = () => async (c, next) => {
  try {
    // Get authorization header
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Invalid authorization header');
    }

    const token = authHeader.split('Bearer ')[1];

    // Parse the JWT and extract user ID
    const jwt = JSON.parse(atob(token.split('.')[1]));

    // Set authenticated user ID in context variables
    c.set('auth', {
      userId: jwt.sub,
      sessionId: jwt.sid || '',
    });

    await next();
  } catch (error) {
    throw new UnauthorizedError('Authentication failed');
  }
};
```

### Authorization

Authorization is handled at the repository level by checking if resources belong to the requesting user:

```typescript
// In repositories
export async function getHabitById(
  db: D1Database,
  userId: string,
  habitId: number | string
): Promise<HabitRow> {
  const habit = await db
    .prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?')
    .bind(habitId, userId)
    .first();

  if (!habit) {
    throw new NotFoundError(`Habit with ID ${habitId} not found`);
  }

  return habit as HabitRow;
}
```

## Error Handling

We use a centralized error handling approach:

1. Custom error classes with semantic meaning
2. Error throwing at the appropriate layer
3. Global error middleware for consistent responses

```typescript
// src/utils/errors.js
export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// src/middlewares/errorHandler.js
export const errorHandler = (err, c) => {
  // Map error types to appropriate HTTP status codes
  let statusCode = 500;
  let errorCode = 'internal_server_error';

  if (err instanceof NotFoundError) {
    statusCode = 404;
    errorCode = 'not_found';
  } else if (err instanceof UnauthorizedError) {
    statusCode = 401;
    errorCode = 'unauthorized';
  }

  // Log error for monitoring
  logger.error(err.message, {
    errorName: err.name,
    stackTrace: err.stack,
  });

  // Return standardized error response
  return c.json(
    {
      error: {
        message: err.message,
        code: errorCode,
      },
    },
    statusCode
  );
};
```

## Logging

We use a structured logging approach with context-aware log levels:

```typescript
// src/utils/logger.js
import { createLogger } from '@minimatters/logger';

const logger = createLogger({
  serviceName: 'tracknstick-api',
  level: process.env.LOG_LEVEL || 'info',
});

export default logger;

// Usage
logger.info('Habit created', { habitId, userId });
logger.error('Failed to create habit', { error, userId });
```

## Request Flow

Here's the complete flow of a typical API request:

1. **Request Arrives**: Client sends a request to an endpoint
2. **Global Middleware**: Request passes through global middleware (cors, security headers, logging)
3. **Route Matching**: Hono matches the route pattern
4. **Authentication**: `clerkMiddleware` authenticates the request
5. **Validation**: `validateRequest` validates and sanitizes request data
6. **Controller**: Controller extracts parameters and calls the appropriate service
7. **Service**: Service implements business logic and calls repository methods
8. **Repository**: Repository fetches/modifies data in the database
9. **Response**: Data flows back up the chain, controller formats the final response
10. **Error Handling**: Errors at any stage are caught by the global error handler

## Data Validation

We use a validation middleware with schemas for request validation:

```typescript
// src/validators/habit.validator.js
export const createHabitSchema = {
  name: { type: 'string', required: true },
  icon: { type: 'string', required: false },
  frequency: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['daily', 'weekly', 'monthly', 'custom'],
      },
      days: { type: 'array', items: { type: 'number' } },
      dates: { type: 'array', items: { type: 'number' } },
    },
    required: ['type'],
  },
  startDate: { type: 'string', format: 'date', required: true },
  endDate: { type: 'string', format: 'date', required: false },
};

// src/middlewares/validateRequest.js
export const validateRequest = (schema, source) => async (c, next) => {
  try {
    let data;

    // Extract data from the appropriate request source
    if (source === 'json') {
      data = await c.req.json();
    } else if (source === 'query') {
      data = c.req.query();
    } else if (source === 'param') {
      data = c.req.param();
    }

    // Validate data against schema
    const validatedData = validateAgainstSchema(data, schema);

    // Store validated data in context
    c.set(`validated_${source}`, validatedData);

    await next();
  } catch (error) {
    throw new ValidationError(error.message);
  }
};
```

## Testing

We use a combination of unit and integration tests:

### Unit Tests

Focus on testing individual functions/modules in isolation:

```typescript
// src/repositories/__tests__/habit.repository.test.ts
describe('getHabitsByDate', () => {
  it('should return habits for the given date', async () => {
    // Mock DB and expected result
    const mockDb = {
      prepare: jest.fn().mockReturnThis(),
      bind: jest.fn().mockReturnThis(),
      all: jest.fn().mockResolvedValue({
        success: true,
        results: [{ id: 1, name: 'Test Habit' }],
      }),
    };

    const result = await habitRepository.getHabitsByDate(
      mockDb as any,
      'user123',
      '2024-01-01'
    );

    expect(result).toEqual([{ id: 1, name: 'Test Habit' }]);
    expect(mockDb.prepare).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM habits')
    );
  });
});
```

### Integration Tests

Test the complete request flow:

```typescript
// src/tests/integration/habits.test.ts
describe('GET /api/v1/habits', () => {
  it('should return habits for authenticated user', async () => {
    // Setup test user and auth token
    const { token } = await setupTestUser();

    const response = await fetch('/api/v1/habits?date=2024-01-01', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});
```

## Database Interactions

We use Cloudflare D1 (SQLite) with prepared statements for database operations:

```typescript
// Example from habit.repository.ts
export async function createHabit(
  db: D1Database,
  userId: string,
  habitData: HabitData
): Promise<{ habitId: number }> {
  const result = await db
    .prepare(
      `
      INSERT INTO habits (
        user_id, name, icon, frequency_type, frequency_days, 
        frequency_dates, start_date, end_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .bind(
      userId,
      name,
      icon || null,
      frequencyType,
      frequencyDays,
      frequencyDates,
      startDate,
      endDate || null
    )
    .run();

  return { habitId: result.meta.last_row_id as number };
}
```

### Migrations

Database schema changes are managed through migrations:

```sql
-- migrations/0001_create_habits_table.sql
CREATE TABLE habits (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  frequency_type TEXT NOT NULL DEFAULT 'daily',
  frequency_days TEXT,
  frequency_dates TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_habits_user_id ON habits(user_id);
```

## API Versioning

We version our API through the URL path (`/api/v1/`) to manage breaking changes:

- Major version changes (`v1` → `v2`) indicate breaking changes
- New, backward-compatible endpoints are added within the same version
- Deprecated endpoints are marked in documentation before removal

## Security

We implement several security measures:

### Secure Headers

```typescript
// src/index.ts
app.use('*', secureHeaders());
```

### CORS Configuration

```typescript
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'https://tracknstick.com'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);
```

### Rate Limiting

```typescript
// src/middlewares/rateLimiter.js
export const rateLimiter = () => async (c, next) => {
  const { userId } = c.get('auth');
  const key = `ratelimit:${userId}`;

  // Check if user has exceeded rate limit
  const count = await getRequestCount(key);

  if (count > MAX_REQUESTS_PER_MINUTE) {
    throw new RateLimitError('Too many requests');
  }

  // Increment request count
  await incrementRequestCount(key);

  await next();
};
```

## Common Workflows

### Adding a New Endpoint

1. **Define validator schema** (if needed)

   ```typescript
   // src/validators/example.validator.js
   export const exampleSchema = {
     // Schema definition
   };
   ```

2. **Create or update repository function**

   ```typescript
   // src/repositories/example.repository.js
   export async function exampleData(db, userId) {
     // Database operations
   }
   ```

3. **Implement service logic**

   ```typescript
   // src/services/example.service.js
   export const getExampleData = async (userId, db) => {
     // Business logic
     return exampleRepository.exampleData(db, userId);
   };
   ```

4. **Create controller function**

   ```typescript
   // src/controllers/example.controller.js
   export const getExample = async (c) => {
     const { userId } = c.get('auth');
     const data = await exampleService.getExampleData(userId, c.env.DB);
     return c.json(data);
   };
   ```

5. **Add route definition**

   ```typescript
   // src/routes/example.js
   app.get(
     '/example',
     validateRequest(exampleValidator.exampleSchema, 'query'),
     exampleController.getExample
   );
   ```

6. **Register route in main app**

   ```typescript
   // src/index.js
   import { exampleRoutes } from './routes/example.js';
   app.route('/api/v1/example', exampleRoutes);
   ```

7. **Add tests**

   ```typescript
   // src/tests/unit/services/example.service.test.js
   // src/tests/integration/example.test.js
   ```

8. **Update documentation**

   ```markdown
   // docs/api/endpoints.md

   ## Example Endpoint

   ...
   ```

### Changing Database Schema

1. **Create a new migration file**

   ```sql
   -- migrations/XXXX_description.sql
   ALTER TABLE table_name ADD COLUMN column_name TEXT;
   ```

2. **Run migration in development**

   ```bash
   npm run migrate:dev
   ```

3. **Update repository functions** to use the new schema

   ```typescript
   // src/repositories/example.repository.js
   // Update queries and type definitions
   ```

4. **Update tests** to reflect the schema changes

## Debugging

### Local Development Debugging

1. **Enable verbose logging**

   ```
   LOG_LEVEL=debug npm run dev
   ```

2. **Use Chrome DevTools** for Node.js debugging

   - Run with `--inspect` flag
   - Open `chrome://inspect` in Chrome

3. **Examine application logs**
   ```bash
   npm run logs
   ```

### Common Issues

1. **Authentication Failures**

   - Check Clerk configuration
   - Verify token format and expiration
   - Enable debug logging for auth middleware

2. **Database Errors**

   - Check SQL syntax
   - Verify database schema
   - Ensure migrations have run

3. **Performance Issues**
   - Look for N+1 queries
   - Check cache implementation
   - Analyze response times with logging

## Documentation

Our documentation is divided into several categories:

1. **API Documentation**: Located in `docs/api/`

   - Endpoint specifications
   - Authentication details
   - Examples

2. **Code Documentation**: JSDoc comments in source code

3. **Architecture Documentation**: This onboarding guide

4. **Changelog**: `CHANGELOG.md` in the project root

## Code Review Process

We follow a structured code review process:

1. **Create a feature branch** from `main`
2. **Implement changes** following our coding standards
3. **Write tests** for new functionality
4. **Submit a pull request** with a clear description
5. **Address review feedback** from team members
6. **Ensure CI passes** (tests, linting, type checking)
7. **Merge to main** after approval

### Code Review Checklist

- Does the code follow our standards and conventions?
- Are there appropriate tests with good coverage?
- Is error handling implemented properly?
- Are there potential security issues?
- Is the code well-documented?
- Are there any performance concerns?

# Database Schema Changes (May 2023)

The database schema was updated in May 2023 to simplify the habit frequency structure and improve performance. Key changes include:

## Habit Table Changes

1. The `frequency_type`, `frequency_days`, and `frequency_dates` columns have been replaced with a single `frequency` column that stores a JSON string representation of frequency data.
2. `best_streak` has been renamed to `longest_streak`.
3. A new `total_completions` column has been added to track total completions directly in the habits table.
4. A new `last_completed` column has been added to track when the habit was last marked as completed.

## Code Updates

The following components were updated to support the new schema:

1. **Repository Layer** (`src/repositories/habit.repository.ts`):

   - Updated to store and retrieve the frequency data as a JSON string
   - Modified SQL queries to work with the new column structure
   - Added automatic updating of the `last_completed` field when a habit is marked as completed

2. **Service Layer** (`src/services/habit.service.ts`):

   - Updated to parse and transform frequency data between JSON and object formats
   - Renamed references to best_streak to longest_streak
   - Added `lastCompleted` field to habit responses

3. **Migration Tools**:
   - Created a data migration script for existing habit data (`scripts/migrate-frequency-data.js`)
   - Added an npm script `db:migrate:frequency` to help migrate existing data
   - The script sets `last_completed` based on the most recent tracker entry

## Migrating Existing Data

If you have existing habit data, follow these steps to migrate to the new schema:

1. First, check if you need to run the table migration:

```bash
# Check if you have the old schema (frequency_type column exists)
npm run db:query -- "SELECT COUNT(*) as count FROM pragma_table_info('habits') WHERE name='frequency_type'"
```

2. If the result shows a count of 1, run the table migration:

```bash
npm run db:migrate:update
```

This migration will:

- Rename the existing habits table
- Create a new habits table with the updated schema
- Migrate the data, converting the frequency fields to a JSON string
- Update total_completions and last_completed fields
- Recreate the necessary indexes

3. For additional data migrations (not usually needed), you can generate and apply a migration script:

```bash
npm run db:migrate:frequency
```

## Benefits of the Change

1. **Flexibility**: The JSON structure allows for easy addition of new frequency options without schema changes
2. **Simplicity**: Reduced number of columns makes queries cleaner
3. **Performance**: Direct storage of total_completions improves read performance for statistics
