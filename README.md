# Habit Tracker API

This is a RESTful API for a habit tracker application built with Node.js and Express.js. It uses SQLite as the database.

## Authentication

All API endpoints require an API key for authentication. The API key should be sent in the `X-API-Key` header with each request.

## Endpoints

### Habits

- **`POST /habits`**

  - Description: Creates a new habit.
  - Headers:
    - `X-API-Key`: Your API key
  - Body:
    ```json
    {
      "name": "Habit Name",
      "icon": "habit-icon", // Optional
      "frequency": ["Mon", "Tue", "Wed"] // Array of day abbreviations
    }
    ```
  - Response:
    ```json
    {
      "message": "Habit created successfully",
      "habitId": 123 // ID of the created habit
    }
    ```

- **`GET /habits`**

  - Description: Retrieves a list of habits for the authenticated user.
  - Headers:
    - `X-API-Key`: Your API key
  - Response:
    ```json
    [
      {
        "id": 123,
        "name": "Habit Name",
        "icon": "habit-icon",
        "frequency": ["Mon", "Tue", "Wed"],
        "totalCompletions": 5,
        "streak": 2
      }
      // ... more habits
    ]
    ```

- **`PUT /habits/:habitId`**

  - Description: Updates an existing habit.
  - Headers:
    - `X-API-Key`: Your API key
  - Parameters:
    - `habitId`: ID of the habit to update
  - Body:
    ```json
    {
      "name": "Updated Habit Name", // Optional
      "icon": "new-habit-icon", // Optional
      "frequency": ["Mon", "Wed", "Fri"] // Optional
    }
    ```
  - Response:
    ```json
    {
      "message": "Habit updated successfully"
    }
    ```

- **`DELETE /habits/:habitId`**

  - Description: Deletes a habit.
  - Headers:
    - `X-API-Key`: Your API key
  - Parameters:
    - `habitId`: ID of the habit to delete
  - Response:
    ```json
    {
      "message": "Habit deleted successfully"
    }
    ```

- **`GET /habits/:habitId/stats`**
  - Description: Retrieves statistics (current streak, total completions, last completed date) for a specific habit.
  - Headers:
    - `X-API-Key`: Your API key
  - Parameters:
    - `habitId`: ID of the habit
  - Query Parameters:
    - `timeZone`: The user's timezone (e.g., "America/Los_Angeles") (Required for accurate streak calculation)
  - Response:
    ```json
    {
      "habit_id": 123,
      "user_id": 1,
      "streak": 5,
      "total_completions": 25,
      "last_completed": "2024-04-03T18:30:00.000Z" // ISO 8601 timestamp or null
    }
    ```

### Trackers

- **`POST /habits/:habitId/trackers`**

  - Description: Adds or removes a tracker for a habit on a specific date (toggle behavior).
  - Headers:
    - `X-API-Key`: Your API key
  - Parameters:
    - `habitId`: ID of the habit
  - Body:
    ```json
    {
      "timestamp": "2024-03-10T12:00:00.000Z" // Date and time of the tracker
    }
    ```
  - Response:
    ```json
    {
      "message": "Tracker added/removed successfully",
      "trackerId": 456 // ID of the added tracker (if applicable)
    }
    ```

- **`GET /habits/:habitId/trackers`**
  - Description: Retrieves trackers for a habit, optionally filtered by a date range.
  - Headers:
    - `X-API-Key`: Your API key
  - Parameters:
    - `habitId`: ID of the habit
  - Query Parameters:
    - `startDate`: Start date for filtering (optional)
    - `endDate`: End date for filtering (optional)
  - Response:
    ```json
    [
      {
        "id": 456,
        "habit_id": 123,
        "timestamp": "2024-03-10T12:00:00.000Z",
        "notes": "Some notes"
      }
      // ... more trackers
    ]
    ```

## Database Schema

**`users` table:**

| Column          | Data Type | Constraints                |
| --------------- | --------- | -------------------------- |
| `id`            | INTEGER   | PRIMARY KEY, AUTOINCREMENT |
| `clerk_user_id` | TEXT      | UNIQUE, NOT NULL           |
| `api_key`       | TEXT      | UNIQUE, NOT NULL           |

**`habits` table:**

| Column              | Data Type | Constraints                                     |
| ------------------- | --------- | ----------------------------------------------- | ------------------------------------------------------ |
| `id`                | INTEGER   | PRIMARY KEY, AUTOINCREMENT                      |
| `user_id`           | INTEGER   | NOT NULL, FOREIGN KEY referencing `users`(`id`) |
| `name`              | TEXT      | NOT NULL                                        |
| `icon`              | TEXT      |                                                 |
| `frequency`         | TEXT      | NOT NULL                                        | (Store as comma-separated string, e.g., "Mon,Tue,Wed") |
| `streak`            | INTEGER   | DEFAULT 0                                       |
| `total_completions` | INTEGER   | DEFAULT 0                                       |
| `last_completed`    | DATETIME  |                                                 |

**`trackers` table:**

| Column      | Data Type | Constraints                                      |
| ----------- | --------- | ------------------------------------------------ |
| `id`        | INTEGER   | PRIMARY KEY, AUTOINCREMENT                       |
| `habit_id`  | INTEGER   | NOT NULL, FOREIGN KEY referencing `habits`(`id`) |
| `timestamp` | DATETIME  | NOT NULL                                         |
| `notes`     | TEXT      |                                                  |
