# Habit Tracker API (TrackNStick API)

This is the RESTful API for the TrackNStick habit tracker application. It allows users to manage habits, track their completions, and view statistics about their progress. The API is designed to be robust, secure, and easy to use.

## Core Features

- **Habit Management**: Create, Read, Update, and Delete (CRUD) habits.
- **Habit Tracking**: Record habit completions for specific dates.
- **Statistics**: Retrieve habit statistics like current and longest streaks, total completions, and last completed date.
- **Progress Monitoring**: Track daily progress with completion rates.
- **Secure Authentication**: Endpoints are secured using Clerk JWT authentication.

## Tech Stack

- **Backend Runtime**: Node.js
- **Web Framework**: Hono.js (optimized for edge environments)
- **Database**: Cloudflare D1 (SQLite-compatible serverless database)
- **Deployment**: Cloudflare Workers
- **Language**: TypeScript
- **Linting/Formatting**: ESLint, Prettier

## High-Level Architecture

The API follows a layered architecture for separation of concerns and maintainability.

```mermaid
graph LR
    Client -->|"HTTP Request\nGET POST PUT DELETE"| HonoApp[Hono App on Cloudflare Workers];
    HonoApp -->|"Request"| Middleware["Global Middleware <br> (CORS, Auth, Logging, Error Handling)"];
    Middleware -->|"Processed Request"| Routes["API Routes <br> (e.g., /api/v1/habits)"];
    Routes -->|"Params, Body"| Controller["Controller Layer <br> (Handles HTTP, basic validation)"];
    Controller -->|"Calls Business Logic"| Service["Service Layer <br> (Core application logic)"];
    Service -->|"Requests Data"| Repository["Repository Layer <br> (Database interactions)"];
    Repository -->|"SQL Query"| D1["Cloudflare D1 Database"];
    D1 -->|"Query Result"| Repository;
    Repository -->|"Returns Data"| Service;
    Service -->|"Returns Processed Data"| Controller;
    Controller -->|"JSON Response"| HonoApp;
    HonoApp -->|"HTTP Response"| Client;
```

## Documentation

For detailed information about the API, development practices, and more, please refer to the following documents:

- **[Developer Guide (`docs/DEVELOPER_GUIDE.md`)](docs/DEVELOPER_GUIDE.md)**: The main comprehensive guide for developers. Includes setup, architecture, coding standards, and much more.
- **[API Documentation (`docs/API_DOCUMENTATION.md`)](docs/API_DOCUMENTATION.md)**: The single source of truth for all API endpoints, data models, and authentication protocols.
- **[Changelog (`CHANGELOG.md`)](CHANGELOG.md)**: A log of all notable changes, features, and fixes for each version of the API.

## Getting Started

To get started with development, including prerequisites, local setup, and running the application, please consult the **[Setup and Installation section in the Developer Guide](docs/DEVELOPER_GUIDE.md#3-getting-started-setup-and-installation)**.

## Authentication

API endpoints are protected using Clerk. Requests must include a valid JWT session token obtained from your Clerk frontend application in the `Authorization: Bearer <token>` header. More details can be found in the [Authentication section of the Developer Guide](docs/DEVELOPER_GUIDE.md#7-authentication-and-authorization).

## Running Tests

To run the automated tests:
```bash
npm test
```
_(Note: Ensure the test suite and its setup are fully configured as detailed in the Developer Guide.)_

## Contributing

Contributions are welcome! Please refer to the **[Developer Guide](docs/DEVELOPER_GUIDE.md)** for coding standards, the code review process, and other guidelines before contributing.

## Refactoring Overview

This project has undergone significant refactoring to improve maintainability, testability, performance, and to establish a scalable architecture using Hono.js on Cloudflare Workers. Details about these changes can be found in the **[Developer Guide](docs/DEVELOPER_GUIDE.md)** and related documents in the `docs` directory.
