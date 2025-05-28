# Habit Tracker API Documentation

This document provides details about the API endpoints and database schema for the Habit Tracker API.

## Authentication

All API endpoints require authentication via Clerk. Requests must include a valid JWT session token obtained from your Clerk frontend application in the `Authorization: Bearer <token>` header. The backend verifies this token using the `@clerk/express` middleware.

## Endpoints

Base Path: `/api/v1`

### Habits

- **`POST /habits`**

  - **Description:** Creates a new habit for the authenticated user.
  - **Authentication:** Requires `Authorization: Bearer <token>` header (Clerk JWT).
  - **Request Body:**
    ```json
    {
      "name": "string (required)",
      "icon": "string (optional)",
      "frequency": [
        "string (required, array of 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')"
      ]
    }
    ```
  - **Success Response (201 Created):**
    ```json
    {
      "message": "Habit created successfully",
      "habitId": "integer" // ID of the created habit
    }
    ```
  - **Error Responses:**
    - `400 Bad Request (Validation Error)`:
      ```json
      {
        "status": "fail",
        "message": "Input validation failed",
        "errorCode": "VALIDATION_ERROR",
        "errors": [
          {
            "type": "field",
            "msg": "Habit name is required.",
            "path": "name",
            "location": "body"
          },
          {
            "type": "field",
            "msg": "Frequency array must only contain valid days: Mon, Tue, Wed, Thu, Fri, Sat, Sun",
            "path": "frequency",
            "location": "body",
            "value": ["Mon", "InvalidDay"]
          }
          // ... other validation errors
        ]
      }
      ```
    - `401 Unauthorized`: (Clerk middleware response if token is missing, invalid, or expired)
      ```json
      {
        "status": "fail",
        "message": "Unauthenticated", // Example message, actual may vary slightly
        "errorCode": "AUTHENTICATION_FAILED" // Or similar Clerk error code
      }
      ```
    - `403 Forbidden`: (Potentially if Clerk roles/permissions were used and failed, though not currently implemented)
      ```json
      {
        "status": "fail",
        "message": "Forbidden",
        "errorCode": "AUTHORIZATION_FAILED"
      }
      ```
    - `500 Internal Server Error`: (Generic response in production)
      ```json
      {
        "status": "error",
        "message": "Something went very wrong!",
        "errorCode": "INTERNAL_SERVER_ERROR"
      }
      ```

- **`GET /habits`**

  - **Description:** Retrieves a list of habits scheduled for a specific date for the authenticated user.
  - **Authentication:** Requires `Authorization: Bearer <token>` header (Clerk JWT).
  - **Query Parameters:**
    - `date` (string, required): The target date in "YYYY-MM-DD" format.
    - `timeZone` (string, required): The user's IANA timezone name (e.g., "America/Los_Angeles").
  - **Success Response (200 OK):**
    ```json
    [
      {
        "id": "integer",
        "name": "string",
        "icon": "string",
        "frequency": ["string"], // Array of day abbreviations
        "completed": "boolean", // Indicates if tracked for the given 'date'
        "stats": {
          "totalCompletions": "integer", // Overall total completions for this habit
          "streak": "integer", // Overall current streak for this habit
          "lastCompleted": "string (ISO 8601 timestamp) | null" // Overall last completion timestamp
        }
      }
      // ... more habits scheduled for the given 'date'
    ]
    ```
  - **Error Responses:**
    - `400 Bad Request (Validation Error)`:
      ```json
      {
        "status": "fail",
        "message": "Input validation failed",
        "errorCode": "VALIDATION_ERROR",
        "errors": [
          {
            "type": "field",
            "value": "invalid-date",
            "msg": "Date must be in YYYY-MM-DD format.",
            "path": "date",
            "location": "query"
          },
          {
            "type": "field",
            "value": "Invalid/Timezone",
            "msg": "Invalid IANA TimeZone format provided.",
            "path": "timeZone",
            "location": "query"
          }
        ]
      }
      ```
    - `401 Unauthorized`: (See POST /habits example)
    - `403 Forbidden`: (See POST /habits example)
    - `500 Internal Server Error`: (Generic response in production, see POST /habits example)

- **`PUT /habits/:habitId`**

  - **Description:** Updates an existing habit for the authenticated user.
  - **Authentication:** Requires `Authorization: Bearer <token>` header (Clerk JWT).
  - **Path Parameters:**
    - `:habitId` (integer, required): ID of the habit to update.
  - **Request Body:** (Provide at least one field)
    ```json
    {
      "name": "string (optional)",
      "icon": "string (optional)",
      "frequency": ["string (optional, array of 'Mon'-'Sun')"]
    }
    ```
  - **Success Response (200 OK):**
    ```json
    {
      "message": "Habit updated successfully"
    }
    ```
  - **Error Responses:**
    - `400 Bad Request (Validation Error)`:
      ```json
      {
        "status": "fail",
        "message": "Input validation failed",
        "errorCode": "VALIDATION_ERROR",
        "errors": [
          {
            "type": "field",
            "msg": "Request body must contain at least one valid field to update (name, icon, frequency).",
            "path": "",
            "location": "body"
          },
          {
            "type": "field",
            "value": [],
            "msg": "Frequency must be a non-empty array if provided.",
            "path": "frequency",
            "location": "body"
          }
        ]
      }
      ```
    - `401 Unauthorized`: (See POST /habits example)
    - `403 Forbidden`: (See POST /habits example)
    - `404 Not Found`:
      ```json
      {
        "status": "fail",
        "message": "Habit not found or not authorized",
        "errorCode": "RESOURCE_NOT_FOUND"
      }
      ```
    - `500 Internal Server Error`: (Generic response in production, see POST /habits example)

- **`DELETE /habits/:habitId`**

  - **Description:** Deletes a specific habit and all its associated trackers for the authenticated user.
  - **Authentication:** Requires `Authorization: Bearer <token>` header (Clerk JWT).
  - **Path Parameters:**
    - `:habitId` (integer, required): ID of the habit to delete.
  - **Success Response (200 OK):**
    ```json
    {
      "message": "Habit deleted successfully"
    }
    ```
  - **Error Responses:**
    - `401 Unauthorized`: (See POST /habits example)
    - `403 Forbidden`: (See POST /habits example)
    - `404 Not Found`: (See PUT /habits/:habitId example)
    - `500 Internal Server Error`: (Generic response in production, see POST /habits example)

- **`GET /habits/:habitId/stats`**

  - **Description:** Retrieves statistics for a specific habit for the authenticated user.
  - **Authentication:** Requires `Authorization: Bearer <token>` header (Clerk JWT).
  - **Path Parameters:**
    - `:habitId` (integer, required): ID of the habit.
  - **Query Parameters:**
    - `timeZone` (string, required): The user's IANA timezone name (e.g., "America/Los_Angeles") for accurate streak calculation.
  - **Success Response (200 OK):**
    ```json
    {
      "habit_id": "integer",
      "user_id": "integer",
      "streak": "integer",
      "total_completions": "integer",
      "last_completed": "string (ISO 8601 timestamp) | null"
    }
    ```
  - **Error Responses:**
    - `400 Bad Request (Validation Error)`:
      ```json
      {
        "status": "fail",
        "message": "Input validation failed",
        "errorCode": "VALIDATION_ERROR",
        "errors": [
          {
            "type": "field",
            "value": "Invalid/Timezone",
            "msg": "Invalid IANA TimeZone format provided.",
            "path": "timeZone",
            "location": "query"
          }
        ]
      }
      ```
    - `401 Unauthorized`: (See POST /habits example)
    - `403 Forbidden`: (See POST /habits example)
    - `404 Not Found`: (See PUT /habits/:habitId example)
    - `500 Internal Server Error`: (Generic response in production, see POST /habits example)

### Trackers

- **`POST /habits/:habitId/trackers`**

  - **Description:** Adds or removes a tracker entry for a specific habit on a specific date (determined by timestamp and timezone). This acts as a toggle.
  - **Authentication:** Requires `Authorization: Bearer <token>` header (Clerk JWT).
  - **Path Parameters:**
    - `:habitId` (integer, required): ID of the habit to track/untrack.
  - **Request Body:**
    ```json
    {
      "timestamp": "string (required, ISO 8601 format, e.g., 2024-03-10T12:00:00.000Z)",
      "timeZone": "string (required, IANA timezone name, e.g., America/Los_Angeles)",
      "notes": "string (optional)"
    }
    ```
  - **Success Response (201 Created - Tracker Added):**
    ```json
    {
      "message": "Tracker added successfully",
      "trackerId": "integer" // ID of the newly created tracker entry
    }
    ```
  - **Success Response (200 OK - Tracker Removed):**
    ```json
    {
      "message": "Tracker removed successfully"
    }
    ```
  - **Error Responses:**
    - `400 Bad Request (Validation Error)`:
      ```json
      {
        "status": "fail",
        "message": "Input validation failed",
        "errorCode": "VALIDATION_ERROR",
        "errors": [
          {
            "type": "field",
            "value": "not-a-date",
            "msg": "Timestamp must be a valid ISO 8601 date string.",
            "path": "timestamp",
            "location": "body"
          },
          {
            "type": "field",
            "msg": "TimeZone is required.",
            "path": "timeZone",
            "location": "body"
          }
        ]
      }
      ```
    - `401 Unauthorized`: (See POST /habits example)
    - `403 Forbidden`: (See POST /habits example)
    - `404 Not Found`: (See PUT /habits/:habitId example)
    - `500 Internal Server Error`: (Generic response in production, see POST /habits example)

- **`GET /habits/:habitId/trackers`**

  - **Description:** Retrieves tracker entries for a specific habit, optionally filtered by a date range.
  - **Authentication:** Requires `Authorization: Bearer <token>` header (Clerk JWT).
  - **Path Parameters:**
    - `:habitId` (integer, required): ID of the habit.
  - **Query Parameters:**
    - `startDate` (string, optional): Start date ("YYYY-MM-DD") for filtering (inclusive).
    - `endDate` (string, optional): End date ("YYYY-MM-DD") for filtering (inclusive).
  - **Success Response (200 OK):**
    ```json
    [
      {
        "id": "integer",
        "habit_id": "integer",
        "user_id": "integer",
        "timestamp": "string (ISO 8601 timestamp)",
        "notes": "string | null"
      }
      // ... more tracker entries
    ]
    ```
  - **Error Responses:**
    - `400 Bad Request (Validation Error)`:
      ```json
      {
        "status": "fail",
        "message": "Input validation failed",
        "errorCode": "VALIDATION_ERROR",
        "errors": [
          {
            "type": "field",
            "value": "not-a-date",
            "msg": "startDate must be in YYYY-MM-DD format.",
            "path": "startDate",
            "location": "query"
          }
        ]
      }
      ```
    - `401 Unauthorized`: (See POST /habits example)
    - `403 Forbidden`: (See POST /habits example)
    - `404 Not Found`: (See PUT /habits/:habitId example)
    - `500 Internal Server Error`: (Generic response in production, see POST /habits example)

### Progress

- **`GET /progress/history`**

  - **Description:** Retrieves user's progress history showing completion rates by day. Date parameters only filter the results displayed to the client, not the data used for streak calculations.
  - **Authentication:** Requires `Authorization: Bearer <token>` header (Clerk JWT).
  - **Query Parameters:**
    - `startDate` (string, optional): Start date ("YYYY-MM-DD") for filtering displayed results (inclusive).
    - `endDate` (string, optional): End date ("YYYY-MM-DD") for filtering displayed results (inclusive).
  - **Success Response (200 OK):**
    ```json
    {
      "history": [
        {
          "date": "2023-05-24",
          "completionRate": 75.5
        },
        {
          "date": "2023-05-23",
          "completionRate": 100
        }
        // ... more daily completion rates
      ]
    }
    ```
  - **Error Responses:**
    - `400 Bad Request (Validation Error)`:
      ```json
      {
        "error": "Invalid startDate format. Use YYYY-MM-DD"
      }
      ```
    - `401 Unauthorized`: (See POST /habits example)
    - `500 Internal Server Error`: (Generic response in production, see POST /habits example)

- **`GET /progress/streaks`**

  - **Description:** Retrieves user's current and longest streaks based on 100% completion days. Streak calculations always use a full year of data for accuracy, regardless of any date filters.
  - **Authentication:** Requires `Authorization: Bearer <token>` header (Clerk JWT).
  - **Success Response (200 OK):**
    ```json
    {
      "currentStreak": 3,
      "longestStreak": 7
    }
    ```
  - **Error Responses:**
    - `401 Unauthorized`: (See POST /habits example)
    - `500 Internal Server Error`: (Generic response in production, see POST /habits example)

- **`GET /progress/overview`**

  - **Description:** Retrieves complete progress data including history and streaks in one call. Date parameters only affect what history data is displayed, while streak calculations always use the complete dataset.
  - **Authentication:** Requires `Authorization: Bearer <token>` header (Clerk JWT).
  - **Query Parameters:**
    - `startDate` (string, optional): Start date ("YYYY-MM-DD") for filtering displayed history (inclusive).
    - `endDate` (string, optional): End date ("YYYY-MM-DD") for filtering displayed history (inclusive).
  - **Success Response (200 OK):**
    ```json
    {
      "history": [
        {
          "date": "2023-05-24",
          "completionRate": 75.5
        },
        {
          "date": "2023-05-23",
          "completionRate": 100
        }
        // ... more daily completion rates
      ],
      "currentStreak": 3,
      "longestStreak": 7
    }
    ```
  - **Error Responses:**
    - `400 Bad Request (Validation Error)`:
      ```json
      {
        "error": "Invalid startDate format. Use YYYY-MM-DD"
      }
      ```
    - `401 Unauthorized`: (See POST /habits example)
    - `500 Internal Server Error`: (Generic response in production, see POST /habits example)

## Database Schema

**`users` table:**

| Column          | Data Type | Constraints                | Description                                |
| --------------- | --------- | -------------------------- | ------------------------------------------ |
| `id`            | INTEGER   | PRIMARY KEY, AUTOINCREMENT | Unique user identifier                     |
| `clerk_user_id` | TEXT      | UNIQUE, NOT NULL           | User ID from Clerk                         |
| `api_key`       | TEXT      | UNIQUE, NULL               | API Key (Deprecated - Removed from schema) |

**`habits` table:**

| Column              | Data Type | Constraints                                                       | Description                                     |
| ------------------- | --------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| `id`                | INTEGER   | PRIMARY KEY, AUTOINCREMENT                                        | Unique habit identifier                         |
| `user_id`           | INTEGER   | NOT NULL, FOREIGN KEY referencing `users`(`id`) ON DELETE CASCADE | Owning user ID                                  |
| `name`              | TEXT      | NOT NULL                                                          | Name of the habit                               |
| `icon`              | TEXT      |                                                                   | Icon identifier for the habit                   |
| `frequency`         | TEXT      | NOT NULL                                                          | Comma-separated days (e.g., "Mon,Tue,Wed")      |
| `streak`            | INTEGER   | DEFAULT 0                                                         | Current completion streak                       |
| `total_completions` | INTEGER   | DEFAULT 0                                                         | Total number of times the habit was tracked     |
| `last_completed`    | DATETIME  |                                                                   | Timestamp of the last completion (UTC ISO 8601) |

**`trackers` table:**

| Column      | Data Type | Constraints                                                        | Description                                    |
| ----------- | --------- | ------------------------------------------------------------------ | ---------------------------------------------- |
| `id`        | INTEGER   | PRIMARY KEY, AUTOINCREMENT                                         | Unique tracker entry identifier                |
| `habit_id`  | INTEGER   | NOT NULL, FOREIGN KEY referencing `habits`(`id`) ON DELETE CASCADE | Associated habit ID                            |
| `user_id`   | INTEGER   | NOT NULL, FOREIGN KEY referencing `users`(`id`) ON DELETE CASCADE  | Owning user ID (denormalized for easier query) |
| `timestamp` | DATETIME  | NOT NULL                                                           | Timestamp of completion (UTC ISO 8601)         |
| `notes`     | TEXT      |                                                                    | Optional notes for the completion              |
