# API Endpoints

This document provides detailed information about all available API endpoints in the TracknStick API.

## Base URL

All endpoints are relative to: `http://localhost:3000/api/v1`

## Authentication

All endpoints require authentication using Clerk JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Habits

### Get Habits

Retrieves a list of habits for the authenticated user, optionally filtered by date.

```http
GET /habits
```

#### Query Parameters

| Parameter | Type   | Required | Description                        |
| --------- | ------ | -------- | ---------------------------------- |
| date      | string | No       | Filter habits by date (YYYY-MM-DD) |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Morning Exercise",
      "icon": "🏃",
      "frequency": "MONDAY,WEDNESDAY,FRIDAY",
      "streak": 5,
      "total_completions": 15,
      "last_completed": "2024-03-20T08:00:00Z"
    }
  ],
  "error": null
}
```

### Create Habit

Creates a new habit for the authenticated user.

```http
POST /habits
```

#### Request Body

```json
{
  "name": "Morning Exercise",
  "icon": "🏃",
  "frequency": ["MONDAY", "WEDNESDAY", "FRIDAY"]
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Morning Exercise",
    "icon": "🏃",
    "frequency": "MONDAY,WEDNESDAY,FRIDAY",
    "streak": 0,
    "total_completions": 0,
    "last_completed": null
  },
  "error": null
}
```

### Update Habit

Updates an existing habit.

```http
PUT /habits/:habitId
```

#### URL Parameters

| Parameter | Type    | Required | Description     |
| --------- | ------- | -------- | --------------- |
| habitId   | integer | Yes      | ID of the habit |

#### Request Body

```json
{
  "name": "Evening Exercise",
  "icon": "💪",
  "frequency": ["TUESDAY", "THURSDAY", "SATURDAY"]
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Evening Exercise",
    "icon": "💪",
    "frequency": "TUESDAY,THURSDAY,SATURDAY",
    "streak": 5,
    "total_completions": 15,
    "last_completed": "2024-03-20T08:00:00Z"
  },
  "error": null
}
```

### Delete Habit

Deletes a habit and all its associated trackers.

```http
DELETE /habits/:habitId
```

#### URL Parameters

| Parameter | Type    | Required | Description     |
| --------- | ------- | -------- | --------------- |
| habitId   | integer | Yes      | ID of the habit |

#### Response

```json
{
  "success": true,
  "data": null,
  "error": null
}
```

### Get Habit Trackers

Retrieves all completion records (trackers) for a specific habit.

```http
GET /habits/:habitId/trackers
```

#### URL Parameters

| Parameter | Type    | Required | Description     |
| --------- | ------- | -------- | --------------- |
| habitId   | integer | Yes      | ID of the habit |

#### Query Parameters

| Parameter | Type   | Required | Description                       |
| --------- | ------ | -------- | --------------------------------- |
| startDate | string | No       | Filter by start date (YYYY-MM-DD) |
| endDate   | string | No       | Filter by end date (YYYY-MM-DD)   |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "habit_id": 1,
      "timestamp": "2024-03-20T08:00:00Z",
      "notes": "Completed 30 minutes of exercise"
    }
  ],
  "error": null
}
```

### Manage Habit Tracker

Creates or updates a completion record for a habit.

```http
POST /habits/:habitId/trackers
```

#### URL Parameters

| Parameter | Type    | Required | Description     |
| --------- | ------- | -------- | --------------- |
| habitId   | integer | Yes      | ID of the habit |

#### Request Body

```json
{
  "timestamp": "2024-03-20T08:00:00Z",
  "notes": "Completed 30 minutes of exercise"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "habit_id": 1,
    "timestamp": "2024-03-20T08:00:00Z",
    "notes": "Completed 30 minutes of exercise"
  },
  "error": null
}
```

### Get Habit Statistics

Retrieves statistics for a specific habit.

```http
GET /habits/:habitId/stats
```

#### URL Parameters

| Parameter | Type    | Required | Description     |
| --------- | ------- | -------- | --------------- |
| habitId   | integer | Yes      | ID of the habit |

#### Response

```json
{
  "success": true,
  "data": {
    "streak": 5,
    "total_completions": 15,
    "last_completed": "2024-03-20T08:00:00Z",
    "completion_rate": 0.85,
    "average_completions_per_week": 3.5
  },
  "error": null
}
```

### Get Progress Overview

Retrieves an overview of progress for all habits.

```http
GET /habits/progress/overview
```

#### Query Parameters

| Parameter | Type   | Required | Description                       |
| --------- | ------ | -------- | --------------------------------- |
| startDate | string | No       | Filter by start date (YYYY-MM-DD) |
| endDate   | string | No       | Filter by end date (YYYY-MM-DD)   |

#### Response

```json
{
  "success": true,
  "data": {
    "total_habits": 5,
    "active_habits": 4,
    "total_completions": 75,
    "average_streak": 4.2,
    "completion_rate": 0.82,
    "habits": [
      {
        "id": 1,
        "name": "Morning Exercise",
        "streak": 5,
        "completion_rate": 0.85
      }
    ]
  },
  "error": null
}
```

## Progress

### Get Progress History

Retrieves the user's progress history showing completion rates by day. Date parameters only filter what results are displayed, not the accuracy of the calculations.

```http
GET /progress/history
```

#### Query Parameters

| Parameter | Type   | Required | Description                       |
| --------- | ------ | -------- | --------------------------------- |
| startDate | string | No       | Filter by start date (YYYY-MM-DD) |
| endDate   | string | No       | Filter by end date (YYYY-MM-DD)   |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "date": "2024-05-10",
      "completionRate": 75.0
    },
    {
      "date": "2024-05-09",
      "completionRate": 100.0
    }
  ],
  "error": null
}
```

### Get Streak Information

Retrieves the user's current and longest streaks based on 100% completion days. Streak calculations always use a full year of data for accuracy, regardless of any date filters.

```http
GET /progress/streaks
```

#### Response

```json
{
  "success": true,
  "data": {
    "currentStreak": 3,
    "longestStreak": 7
  },
  "error": null
}
```

### Get Progress Overview

Retrieves a comprehensive overview of the user's progress including history and streaks in a single call. Date parameters only affect what history data is displayed, while streak calculations always use the full dataset.

```http
GET /progress/overview
```

#### Query Parameters

| Parameter | Type   | Required | Description                       |
| --------- | ------ | -------- | --------------------------------- |
| startDate | string | No       | Filter by start date (YYYY-MM-DD) |
| endDate   | string | No       | Filter by end date (YYYY-MM-DD)   |

#### Response

```json
{
  "success": true,
  "data": {
    "history": [
      {
        "date": "2024-05-10",
        "completionRate": 75.0
      },
      {
        "date": "2024-05-09",
        "completionRate": 100.0
      }
    ],
    "currentStreak": 3,
    "longestStreak": 7
  },
  "error": null
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "Error message for specific field"
    }
  }
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### 404 Not Found

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### 429 Too Many Requests

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later"
  }
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

Last Updated: 2024-03-21
