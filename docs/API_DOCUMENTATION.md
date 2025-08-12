# TrackNStick API Documentation

**Version:** 2.0 | **Last Updated:** 2025-07-16

This document provides the complete technical specification for the TrackNStick RESTful API. It is the single source of truth for all frontend and backend development.

## 1. Base URL & Versioning

All endpoints are prefixed with `/api/v1`.

- **Production Base URL**: `https://tracknstick-api.hi-00e.workers.dev`
- **Development Base URL**: `http://localhost:3000`

## 2. Authentication

All API endpoints (except for the public `/health` check) are protected and require authentication via a **Clerk-issued JWT**.

Requests must include the token in the `Authorization` header.

- **Header Format**: `Authorization: Bearer <your-jwt-token>`

Failure to provide a valid token will result in a `401 Unauthorized` error.

## 3. Data Models

These are the primary data structures used in API requests and responses.

### Habit

Represents a user-defined habit.

| Field               | Type           | Description                                                              |
| ------------------- | -------------- | ------------------------------------------------------------------------ |
| `id`                | `string`       | The unique identifier for the habit.                                     |
| `name`              | `string`       | The name of the habit.                                                   |
| `icon`              | `string`       | The string identifier for the habit's icon.                              |
| `frequency`         | `string[]`     | An array of short day names (e.g., `["Mon", "Wed", "Fri"]`).              |
| `startDate`         | `string`       | The date the habit becomes active (ISO 8601 format: `YYYY-MM-DD`).       |
| `endDate`           | `string`       | (Optional) The date the habit is no longer active (ISO 8601 format).     |
| `completed`         | `boolean`      | Indicates if the habit has been completed for the queried date.          |
| `streak`            | `number`       | The current completion streak for the habit.                             |
| `longestStreak`     | `number`       | The longest recorded completion streak for the habit.                    |
| `totalCompletions`  | `number`       | The total number of times the habit has been completed.                  |
| `lastCompleted`     | `string`       | (Optional) The timestamp of the most recent completion (ISO 8601 format).|

### Tracker

Represents a single completion record for a habit.

| Field       | Type     | Description                                       |
| ----------- | -------- | ------------------------------------------------- |
| `id`        | `string` | The unique identifier for the tracker entry.      |
| `habitId`   | `string` | The ID of the associated habit.                   |
| `timestamp` | `string` | The exact completion time (ISO 8601 format).      |
| `notes`     | `string` | (Optional) User-provided notes for the completion.|

### Error

The standard error response object.

| Field     | Type     | Description                                     |
| --------- | -------- | ----------------------------------------------- |
| `message` | `string` | A human-readable description of the error.      |
| `code`    | `string` | An application-specific error code (e.g., `not_found`). |
| `details` | `object` | (Optional) Additional details for validation errors. |

## 4. Endpoints

---

### Habits

Resource for managing user habits.

#### **GET** `/api/v1/habits`

Retrieves a list of habits for the authenticated user. If `date` and `timeZone` are provided, it returns habits scheduled for that specific date, along with their completion status. Otherwise, it returns all habits.

- **Query Parameters:**
  - `date` (string, optional): The target date in `YYYY-MM-DD` format.
  - `timeZone` (string, optional): The user's IANA timezone name (e.g., "America/Los_Angeles").

- **Success Response (200 OK):**
  ```json
  [
    {
      "id": "1",
      "name": "Morning Exercise",
      "icon": "Dumbbell",
      "frequency": ["Mon", "Wed", "Fri"],
      "startDate": "2025-01-01",
      "endDate": null,
      "completed": true,
      "streak": 5,
      "longestStreak": 15,
      "totalCompletions": 50,
      "lastCompleted": "2025-07-16T10:00:00.000Z"
    }
  ]
  ```

#### **POST** `/api/v1/habits`

Creates a new habit.

- **Request Body:**
  ```json
  {
    "name": "Read for 30 minutes",
    "icon": "BookOpen",
    "frequency": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-12-31T23:59:59.000Z"
  }
  ```

- **Success Response (201 Created):**
  ```json
  {
    "message": "Habit created successfully",
    "habitId": "2"
  }
  ```

#### **PUT** `/api/v1/habits/:habitId`

Updates an existing habit.

- **Path Parameters:**
  - `habitId` (string, required): The ID of the habit to update.
- **Request Body:** (Provide at least one field)
  ```json
  {
    "name": "Read for 45 minutes",
    "icon": "BookMarked"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "message": "Habit updated successfully"
  }
  ```

#### **DELETE** `/api/v1/habits/:habitId`

Soft-deletes a habit. The habit can be recovered.

- **Path Parameters:**
  - `habitId` (string, required): The ID of the habit to delete.
- **Success Response (200 OK):**
  ```json
  {
    "message": "Habit deleted successfully"
  }
  ```

#### **POST** `/api/v1/habits/:habitId/restore`

Restores a soft-deleted habit.

- **Path Parameters:**
  - `habitId` (string, required): The ID of the habit to restore.
- **Success Response (200 OK):**
  ```json
  {
    "message": "Habit restored successfully"
  }
  ```

---

### Trackers

Resource for managing habit completion records.

#### **POST** `/api/v1/habits/:habitId/trackers`

Toggles a habit's completion status for a specific date. If a tracker exists for the given timestamp's date, it is removed. Otherwise, a new one is created.

- **Path Parameters:**
  - `habitId` (string, required): The ID of the habit to track.
- **Request Body:**
  ```json
  {
    "timestamp": "2025-07-16T10:00:00.000Z",
    "timeZone": "America/Los_Angeles",
    "notes": "Read an extra chapter."
  }
  ```
- **Success Response (201 Created - Tracker Added):**
  ```json
  {
    "message": "Habit marked as completed",
    "trackerId": "101"
  }
  ```
- **Success Response (200 OK - Tracker Removed):**
  ```json
  {
    "message": "Habit marked as not completed"
  }
  ```

#### **GET** `/api/v1/habits/:habitId/trackers`

Retrieves all completion records for a specific habit, optionally filtered by a date range.

- **Path Parameters:**
  - `habitId` (string, required): The ID of the habit.
- **Query Parameters:**
  - `startDate` (string, optional): Start date (`YYYY-MM-DD`).
  - `endDate` (string, optional): End date (`YYYY-MM-DD`).
- **Success Response (200 OK):**
  ```json
  {
    "trackers": [
      {
        "id": "101",
        "habitId": "1",
        "timestamp": "2025-07-16T10:00:00.000Z",
        "notes": "Read an extra chapter."
      }
    ]
  }
  ```

---

### Progress

Resource for retrieving user progress and statistics.

#### **GET** `/api/v1/progress/history`

Retrieves the user's daily completion rates.

- **Query Parameters:**
  - `startDate` (string, optional): Start date (`YYYY-MM-DD`) to filter the returned results.
  - `endDate` (string, optional): End date (`YYYY-MM-DD`) to filter the returned results.
- **Success Response (200 OK):**
  ```json
  {
    "history": [
      {
        "date": "2025-07-16",
        "completionRate": 100
      },
      {
        "date": "2025-07-15",
        "completionRate": 75.5
      }
    ]
  }
  ```

#### **GET** `/api/v1/progress/streaks`

Retrieves the user's current and longest streaks of 100% completion days.

- **Success Response (200 OK):**
  ```json
  {
    "currentStreak": 5,
    "longestStreak": 21
  }
  ```

#### **GET** `/api/v1/progress/overview`

A convenience endpoint that retrieves both history and streaks in a single call.

- **Query Parameters:**
  - `startDate` (string, optional): Start date (`YYYY-MM-DD`) to filter the returned history.
  - `endDate` (string, optional): End date (`YYYY-MM-DD`) to filter the returned history.
- **Success Response (200 OK):**
  ```json
  {
    "history": [
      {
        "date": "2025-07-16",
        "completionRate": 100
      }
    ],
    "currentStreak": 5,
    "longestStreak": 21
  }
  ```

---

## 5. Error Responses

The API uses standard HTTP status codes and a consistent JSON error format.

| Status Code | Code                      | Description                                      |
| ----------- | ------------------------- | ------------------------------------------------ |
| `400`       | `validation_error`        | The request body or parameters are invalid.      |
| `401`       | `unauthorized`            | Authentication token is missing or invalid.      |
| `403`       | `forbidden`               | The user is not permitted to perform the action. |
| `404`       | `not_found`               | The requested resource does not exist.           |
| `409`       | `conflict`                | The request conflicts with the current state.    |
| `429`       | `rate_limit`              | Too many requests have been sent.                |
| `500`       | `internal_server_error`   | An unexpected error occurred on the server.      |

- **Example (400 Bad Request):**
  ```json
  {
    "error": {
      "message": "Validation failed",
      "code": "validation_error",
      "details": {
        "frequency": {
          "_errors": ["Frequency array cannot contain duplicate days."]
        }
      }
    }
  }
  ```
