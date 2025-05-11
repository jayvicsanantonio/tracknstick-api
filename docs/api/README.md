# API Documentation

This directory contains comprehensive documentation for the TracknStick API endpoints, authentication, and related features.

## Contents

- [Endpoints](endpoints.md) - Detailed documentation of all API endpoints
- [Authentication](authentication.md) - Authentication flow and requirements
- [Rate Limiting](rate-limiting.md) - Rate limiting policies and implementation
- [Examples](examples/) - Example requests and responses for each endpoint

## API Overview

The TracknStick API is a RESTful API built with Node.js and Express.js. It provides endpoints for:

- Habit management (CRUD operations)
- Habit tracking and completion logging
- User authentication and authorization
- Statistics and progress tracking

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

All endpoints (except public ones) require authentication using Clerk JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All responses follow a standard format:

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "error": null
}
```

## Error Handling

Errors follow a consistent format:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {} // Optional additional error details
  }
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse. See [rate-limiting.md](rate-limiting.md) for details.

## Versioning

The API is versioned using the URL path (e.g., `/api/v1/`). Breaking changes will be released in new versions.

Last Updated: 2024-03-21
