# Habit Tracker API Documentation

This document provides details about the API endpoints and database schema for the Habit Tracker API.

## Authentication

All API endpoints require an API key for authentication. The API key should be sent in the `X-API-Key` header with each request.

## Endpoints

Base Path: `/api/v1`

### Habits

- **`POST /habits`**

  - **Description:** Creates a new habit for the authenticated user.
  - **Authentication:** Requires `X-API-Key` header.
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
    - `400 Bad Request`: `{"error": "Missing or invalid required fields (name, icon, frequency array)"}`
    - `401 Unauthorized`: `{"error": "Missing API Key (X-API-Key header)"}`
    - `403 Forbidden`: `{"error": "Invalid API Key"}`
    - `500 Internal Server Error`: `{"error": "Failed to create habit"}` (or similar)

- **`GET /habits`**

  - **Description:** Retrieves a list of habits scheduled for a specific date for the authenticated user.
  - **Authentication:** Requires `X-API-Key` header.
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
    - `400 Bad Request`: `{"error": "Date parameter is required"}`, `{"error": "Invalid date format"}`, `{"error": "TimeZone parameter is required"}`, `{"error": "Invalid timeZone format"}`
    - `401 Unauthorized`: `{"error": "Missing API Key (X-API-Key header)"}`
    - `403 Forbidden`: `{"error": "Invalid API Key"}`
    - `500 Internal Server Error`: `{"error": "Failed to retrieve habits"}` (or similar)

- **`PUT /habits/:habitId`**

  - **Description:** Updates an existing habit for the authenticated user.
  - **Authentication:** Requires `X-API-Key` header.
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
    - `400 Bad Request`: `{"error": "At least one field (name, icon, frequency) is required for update"}`, `{"error": "Frequency must be a non-empty array if provided"}`
    - `401 Unauthorized`: `{"error": "Missing API Key (X-API-Key header)"}`
    - `403 Forbidden`: `{"error": "Invalid API Key"}`
    - `404 Not Found`: `{"error": "Habit not found or not authorized"}`
    - `500 Internal Server Error`: `{"error": "Failed to update habit"}` (or similar)

- **`DELETE /habits/:habitId`**

  - **Description:** Deletes a specific habit and all its associated trackers for the authenticated user.
  - **Authentication:** Requires `X-API-Key` header.
  - **Path Parameters:**
    - `:habitId` (integer, required): ID of the habit to delete.
  - **Success Response (200 OK):**
    ```json
    {
      "message": "Habit deleted successfully"
    }
    ```
  - **Error Responses:**
    - `401 Unauthorized`: `{"error": "Missing API Key (X-API-Key header)"}`
    - `403 Forbidden`: `{"error": "Invalid API Key"}`
    - `404 Not Found`: `{"error": "Habit not found or not authorized"}`
    - `500 Internal Server Error`: `{"error": "Failed to delete habit"}` (or similar)

- **`GET /habits/:habitId/stats`**

  - **Description:** Retrieves statistics for a specific habit for the authenticated user.
  - **Authentication:** Requires `X-API-Key` header.
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
    - `400 Bad Request`: `{"error": "TimeZone parameter is required"}`, `{"error": "Invalid timeZone format"}`
    - `401 Unauthorized`: `{"error": "Missing API Key (X-API-Key header)"}`
    - `403 Forbidden`: `{"error": "Invalid API Key"}`
    - `404 Not Found`: `{"error": "Habit not found or not authorized"}`
    - `500 Internal Server Error`: `{"error": "Failed to retrieve habit data"}` (or similar)

### Trackers

- **`POST /habits/:habitId/trackers`**

  - **Description:** Adds or removes a tracker entry for a specific habit on a specific date (determined by timestamp and timezone). This acts as a toggle.
  - **Authentication:** Requires `X-API-Key` header.
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
    - `400 Bad Request`: `{"error": "Missing required fields: timestamp, timeZone"}`, `{"error": "Invalid timestamp format"}`, `{"error": "Invalid timeZone format"}`
    - `401 Unauthorized`: `{"error": "Missing API Key (X-API-Key header)"}`
    - `403 Forbidden`: `{"error": "Invalid API Key"}`
    - `404 Not Found`: `{"error": "Habit not found or not authorized"}`
    - `500 Internal Server Error`: `{"error": "Failed to insert tracker"}`, `{"error": "Failed to delete tracker"}` (or similar)

- **`GET /habits/:habitId/trackers`**

  - **Description:** Retrieves tracker entries for a specific habit, optionally filtered by a date range.
  - **Authentication:** Requires `X-API-Key` header.
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
    - `400 Bad Request`: `{"error": "Invalid date format provided"}`
    - `401 Unauthorized`: `{"error": "Missing API Key (X-API-Key header)"}`
    - `403 Forbidden`: `{"error": "Invalid API Key"}`
    - `404 Not Found`: `{"error": "Habit not found or not authorized"}`
    - `500 Internal Server Error`: `{"error": "Failed to fetch trackers"}` (or similar)

## Database Schema

**`users` table:**

| Column          | Data Type | Constraints                | Description                |
| --------------- | --------- | -------------------------- | -------------------------- |
| `id`            | INTEGER   | PRIMARY KEY, AUTOINCREMENT | Unique user identifier     |
| `clerk_user_id` | TEXT      | UNIQUE, NOT NULL           | User ID from Clerk         |
| `api_key`       | TEXT      | UNIQUE, NOT NULL           | API Key for authentication |

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
