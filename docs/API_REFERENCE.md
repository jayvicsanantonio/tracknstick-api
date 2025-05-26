# API Reference

This document provides comprehensive information about the TrackNStick API, including available endpoints, authentication mechanisms, error handling procedures, rate limiting policies, and data schemas.

## API Overview

The TrackNStick API is a RESTful API built with Node.js and the Hono.js framework, running on Cloudflare Workers. It provides endpoints for:

- Habit management (CRUD operations)
- Habit completion tracking
- User authentication and authorization (via Clerk)
- Progress statistics and streaks

## Base URL

All API endpoints are relative to the base URL. The API is versioned through the URL path.

- **Production:** `https://tracknstick.jayvicsanantonio.workers.dev/api/v1` (Confirm actual URL if different)
- **Local Development (Wrangler):** `http://localhost:8787/api/v1` (Default port for `wrangler dev`)

## Authentication (Clerk JWT)

The TrackNStick API uses **Clerk** for authentication and user management. Clerk provides JWT-based authentication.

### Authentication Flow

1.  **User Authentication (Frontend):**
    *   Users authenticate through your Clerk-integrated frontend application.
    *   Clerk handles sign-up, sign-in, and user session management.
    *   Upon successful authentication, Clerk provides a short-lived JWT session token to the frontend.

2.  **API Authentication (Backend):**
    *   The frontend application must include this JWT session token in the `Authorization` header of all API requests to protected endpoints.
    *   The header should be formatted as: `Authorization: Bearer <token>`.
    *   The backend API (Hono.js application on Cloudflare Workers) validates this token using Clerk's backend SDK or appropriate Hono middleware designed for serverless environments (e.g., verifying the token against Clerk's JWKS - JSON Web Key Set).
    *   If the token is valid, the request proceeds, and the authenticated user's ID (`clerk_user_id`) is made available to route handlers.
    *   If the token is invalid or missing, a `401 Unauthorized` error is returned.

### Frontend Integration Example (Conceptual)
```javascript
// Example using useAuth from @clerk/clerk-react
import { useAuth } from '@clerk/clerk-react';

async function fetchHabitsFromApi() {
  const { getToken } = useAuth(); // From Clerk's frontend SDK
  try {
    const token = await getToken(); // Retrieves the valid Clerk session token
    const response = await fetch('http://localhost:8787/api/v1/habits', { // Use appropriate base URL
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }
    const result = await response.json();
    return result.data; // Assuming successful response wraps data in a 'data' property
  } catch (error) {
    console.error('Error fetching habits:', error);
    throw error; // Rethrow for handling by caller
  }
}
```

### Backend Middleware (Conceptual for Hono with Clerk)
```typescript
// src/middlewares/clerkAuth.ts (Conceptual Example)
import { Context, Next } from 'hono';
import { Clerk } from '@clerk/backend'; // Or @clerk/hono if available

// Initialize Clerk with secrets/keys from environment variables (c.env)
// const clerk = Clerk({ secretKey: c.env.CLERK_SECRET_KEY }); // Or using JWKS
// For JWKS:
// const clerk = Clerk({ jwksCacheTtlInMs: 60000 }); // Example, configure as per Clerk docs

export const clerkAuthMiddleware = () => async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Bearer token missing or invalid' } }, 401);
  }
  const token = authHeader.substring(7);

  try {
    // For newer Clerk SDKs, you might use getAuth(c.req) or similar with framework integrations.
    // Or verify manually using Clerk's backend SDK:
    // const claims = await clerk.verifyToken(token); // This may vary based on Clerk SDK version
    // const userId = claims.sub; // User ID is in the 'sub' claim
    // c.set('userId', userId); // Make userId available to subsequent handlers
    
    // Placeholder for actual Clerk verification logic for Hono.
    // The actual implementation depends on the Clerk SDK version and Hono adapter.
    // For example, using @clerk/hono:
    // import { getAuth } from '@clerk/hono';
    // const auth = getAuth(c);
    // if (!auth || !auth.userId) { throw new Error("Unauthenticated"); }
    // c.set('userId', auth.userId);


    // Simulate successful auth for now if actual Clerk SDK usage is out of scope for this edit
    const decodedPayload = JSON.parse(atob(token.split('.')[1])); // Basic decode, NOT for verification
    if (!decodedPayload.sub) {
        throw new Error("Invalid token payload");
    }
    c.set('userId', decodedPayload.sub);


    await next();
  } catch (err) {
    console.error("Clerk auth error:", err);
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: err.message || 'Token verification failed' } }, 401);
  }
};
```

### Security Considerations for Authentication
*   **HTTPS:** Always use HTTPS for all communication to protect JWTs in transit.
*   **Token Handling:** Rely on Clerk's frontend SDKs to manage token storage, expiration, and refresh.
*   **User Data Linkage:** User-specific data in the API's database is linked via the `clerk_user_id`.

## API Endpoints

_Base Path: `/api/v1`_

All endpoints under `/api/v1/*` (unless specified otherwise, like a `/health` endpoint) require authentication.

### Health Check Endpoint

#### `GET /health`
*   **Description:** Checks the health status of the API.
*   **Authentication:** None required.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "status": "ok",
        "message": "API is healthy",
        "timestamp": "2024-05-16T10:00:00.000Z" 
      }
    }
    ```

### Habits Endpoints (`/habits`)

#### `POST /habits`
*   **Description:** Creates a new habit for the authenticated user.
*   **Request Body:** (Validated by `createHabitSchema` from `src/validators/habit.validator.ts`)
    ```json
    {
      "name": "string (required, min 1 char, max 100 chars)",
      "icon": "string (optional, max 5 chars, e.g., emoji)",
      "frequency": { // JSON object defining habit frequency (required)
        "type": "string (enum: 'daily', 'weekly', 'monthly', 'custom')",
        "days": "number[] (optional, 0-6 for Sun-Sat, required if type is 'weekly')",
        // ... other frequency properties based on 'type'
      },
      "startDate": "string (required, YYYY-MM-DD format)",
      "endDate": "string (optional, YYYY-MM-DD format, must be after startDate)"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "success": true,
      "data": {
        "id": "integer", // ID of the created habit
        "name": "string",
        "icon": "string",
        "frequency": {}, // JSON object
        "startDate": "string",
        "endDate": "string | null",
        // ... other habit properties (streak, total_completions, last_completed are typically initialized)
        "created_at": "string (ISO8601 datetime)",
        "updated_at": "string (ISO8601 datetime)"
      }
    }
    ```

#### `GET /habits`
*   **Description:** Retrieves a list of habits for the authenticated user. Can be filtered by date.
*   **Query Parameters:** (Validated by `getHabitsByDateSchema` from `src/validators/habit.validator.ts`)
    *   `date` (string, optional): Target date in "YYYY-MM-DD" format. If provided, returns habits active on this day.
    *   `timeZone` (string, optional): User's IANA timezone (e.g., "America/New_York"). Required if `date` is provided for accurate daily completion status.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": [ // Array of habit objects
        {
          "id": "integer",
          "name": "string",
          "icon": "string",
          "frequency": {}, // JSON object
          "startDate": "string",
          "endDate": "string | null",
          "completed_on_date": "boolean (only present if 'date' query param is used)",
          "streak": "integer",
          "longest_streak": "integer",
          "total_completions": "integer",
          "last_completed": "string (ISO 8601 datetime) | null",
          "created_at": "string (ISO8601 datetime)",
          "updated_at": "string (ISO8601 datetime)"
        }
      ]
    }
    ```

#### `GET /habits/:habitId`
*   **Description:** Retrieves details for a specific habit.
*   **Path Parameters:**
    *   `:habitId` (string, should be parseable to integer): ID of the habit.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": { // Habit object (same structure as in GET /habits list)
        "id": "integer",
        "name": "string",
        // ... other habit properties
      }
    }
    ```

#### `PUT /habits/:habitId`
*   **Description:** Updates an existing habit.
*   **Path Parameters:**
    *   `:habitId` (string, should be parseable to integer): ID of the habit to update.
*   **Request Body:** (Validated by `updateHabitSchema`. Provide at least one field to update)
    ```json
    {
      "name": "string (optional, min 1 char, max 100 chars)",
      "icon": "string (optional, max 5 chars)",
      "frequency": { /* ... frequency JSON object ... */ }, // (optional)
      "startDate": "string (optional, YYYY-MM-DD)",
      "endDate": "string (optional, YYYY-MM-DD, can be null)"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": { // Updated habit object
        "id": "integer",
        // ... all habit properties
      }
    }
    ```

#### `DELETE /habits/:habitId`
*   **Description:** Deletes a specific habit and its associated trackers.
*   **Path Parameters:**
    *   `:habitId` (string, should be parseable to integer): ID of the habit to delete.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "message": "Habit deleted successfully"
      }
    }
    ```
    *(Or `data: null` is also acceptable for DELETE operations)*

### Trackers Endpoints (`/habits/:habitId/trackers`)

#### `POST /habits/:habitId/trackers`
*   **Description:** Creates or updates (toggles) a tracker entry for a habit on a specific date. If a tracker for the given `timestamp` (interpreted in the given `timeZone`) exists, it might be updated (e.g., notes) or removed depending on service logic (confirm actual toggle behavior). The current implementation from `ONBOARDING.md` suggests it adds or removes.
*   **Path Parameters:**
    *   `:habitId` (string, should be parseable to integer): ID of the habit.
*   **Request Body:** (Validated by `toggleTrackerSchema`)
    ```json
    {
      "date": "string (required, YYYY-MM-DD format)", // Date for which to toggle the tracker
      "timeZone": "string (required, IANA timezone name)",
      "notes": "string (optional, max 255 chars)"
    }
    ```
*   **Success Response (200 OK or 201 Created):**
    ```json
    {
      "success": true,
      "data": {
        "action": "string (e.g., 'created', 'deleted', or 'updated')",
        "tracker": { // The created/deleted/updated tracker object, or null if deleted
          "id": "integer",
          "habit_id": "integer",
          "user_id": "string", // clerk_user_id
          "timestamp": "string (ISO8601 datetime, representing the specific tracked moment)", 
          "date_tracked": "string (YYYY-MM-DD, derived from timestamp and timezone)",
          "notes": "string | null",
          "created_at": "string (ISO8601 datetime)",
          "updated_at": "string (ISO8601 datetime)"
        }
      }
    }
    ```

#### `GET /habits/:habitId/trackers`
*   **Description:** Retrieves tracker entries for a specific habit.
*   **Path Parameters:**
    *   `:habitId` (string, should be parseable to integer): ID of the habit.
*   **Query Parameters:** (Validated by `getTrackersSchema`)
    *   `startDate` (string, optional, YYYY-MM-DD): Filter trackers from this date.
    *   `endDate` (string, optional, YYYY-MM-DD): Filter trackers up to this date.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": [ // Array of tracker objects
        {
          "id": "integer",
          "habit_id": "integer",
          "user_id": "string", // clerk_user_id
          "timestamp": "string (ISO8601 datetime)",
          "date_tracked": "string (YYYY-MM-DD)",
          "notes": "string | null",
          "created_at": "string (ISO8601 datetime)",
          "updated_at": "string (ISO8601 datetime)"
        }
      ]
    }
    ```

### Progress Endpoints (`/progress`)

#### `GET /progress/overview`
*   **Description:** Retrieves a comprehensive overview of the user's progress, including daily completion history and streak information.
*   **Query Parameters:** (Validated by `getProgressOverviewSchema` from `src/validators/progress.validator.ts`)
    *   `startDate` (string, optional, YYYY-MM-DD): Start date for the history period.
    *   `endDate` (string, optional, YYYY-MM-DD): End date for the history period.
    *   `timeZone` (string, required, IANA timezone): User's timezone for accurate calculations.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "history": [
          {
            "date": "string (YYYY-MM-DD)",
            "completion_rate": "number (0.0 to 1.0)" 
          }
        ],
        "current_streak": "integer (days)",
        "longest_streak": "integer (days)"
      }
    }
    ```

*(Note: The previous individual `/progress/history` and `/progress/streaks` endpoints seem to be consolidated into `/progress/overview` as per `src/routes/progress.ts`. If they still exist as separate callable endpoints, they should be documented.)*

## Standard Response Format

All API responses follow a standard JSON format:

**Successful Response:**
```json
{
  "success": true,
  "data": { /* Response data specific to the endpoint, can be an object or array */ }
}
```
*For actions like DELETE, `data` might be a simple message object: `{"message": "Resource deleted successfully"}` or `null`.*

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING", // e.g., "VALIDATION_ERROR", "UNAUTHORIZED", "NOT_FOUND"
    "message": "A human-readable description of the error.",
    // "details" field may contain an array of specific validation errors or other context
    "details": [ 
      { "path": ["fieldName"], "message": "Specific field error", "code": "invalid_type" } 
    ] 
  }
}
```

### Common HTTP Status Codes and Error Codes

*   **200 OK:** Request succeeded.
*   **201 Created:** Resource created successfully.
*   **400 Bad Request:**
    *   `code: "VALIDATION_ERROR"`: Input validation failed. `details` array contains specific field errors from Zod.
    *   `code: "BAD_REQUEST"`: Other general bad request issues.
*   **401 Unauthorized:**
    *   `code: "UNAUTHORIZED"` or `"AUTHENTICATION_FAILED"`: Authentication token missing, invalid, or expired.
*   **403 Forbidden:**
    *   `code: "FORBIDDEN"`: User is authenticated but not authorized to perform the action.
*   **404 Not Found:**
    *   `code: "NOT_FOUND"`: The requested resource does not exist.
*   **429 Too Many Requests:**
    *   `code: "RATE_LIMIT_EXCEEDED"`: Client has exceeded request limits.
*   **500 Internal Server Error:**
    *   `code: "INTERNAL_SERVER_ERROR"`: An unexpected error occurred on the server. Message is generic in production.

## Rate Limiting

To prevent abuse, API requests are rate-limited.
*   **Mechanism:** Typically based on IP address or user ID for authenticated requests.
*   **Limits:** Configurable (e.g., X requests per Y minutes). Default: 100 requests/15 min/IP.
*   **Headers:** Responses may include `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` headers.
*   **Response on Exceeding:** `429 Too Many Requests` (see Error Handling).
*   *(Implementation details for Hono/Cloudflare Workers might involve a custom middleware or a Cloudflare service.)*

## Database Schema (Summary)

This is a summary. For full details, refer to [Database Document](./DATABASE.md#2-database-schema). Key tables: `users`, `habits`, `trackers`, `progress`.
*   **`users`**: `clerk_user_id` (TEXT, PK), `created_at`, `updated_at`.
*   **`habits`**: `id` (INTEGER, PK), `user_id` (TEXT, FK to `users.clerk_user_id`), `name` (TEXT), `icon` (TEXT), `frequency` (TEXT JSON), `streak` (INTEGER), `longest_streak` (INTEGER), `total_completions` (INTEGER), `last_completed` (TEXT as ISO8601 datetime), `start_date` (TEXT), `end_date` (TEXT), `created_at`, `updated_at`.
*   **`trackers`**: `id` (INTEGER, PK), `habit_id` (INTEGER, FK to `habits.id`), `user_id` (TEXT, FK to `users.clerk_user_id`), `timestamp` (TEXT as ISO8601 datetime), `notes` (TEXT), `date_tracked` (TEXT as YYYY-MM-DD), `created_at`, `updated_at`.
*   **`progress`**: `date` (TEXT, PK), `user_id` (TEXT, PK, FK to `users.clerk_user_id`), `completion_rate` (REAL), `current_streak_days` (INTEGER), `longest_streak_days` (INTEGER), `created_at`, `updated_at`.
*(Note: `DATETIME` fields are stored as `TEXT` in ISO8601 format).*

## API Versioning

The API is versioned using the URL path: `/api/v1`. Breaking changes will lead to a new version (e.g., `/api/v2`).

Last Updated: (Current Date) - Based on review of project state and previous documentation.
