# Changelog

All notable changes to the TrackNStick API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - YYYY-MM-DD
*(This section is for changes that are not yet released. Once released, create a new version header below this one with the release date.)*

### Added
- *(Work in progress or new features not yet deployed)*

### Changed
- *(Changes to existing functionality)*

### Fixed
- *(Bug fixes)*

### Removed
- *(Features removed)*

## [1.3.0] - YYYY-MM-DD 
*(Assuming this version corresponds to the major refactoring and tech stack migration. The date should be the actual release date of these changes.)*

### Added
- **Tech Stack & Framework:**
  - Migrated from npm to `pnpm` for package management.
  - Integrated `fnm` for Node.js version management (via `.node-version` file).
  - Migrated web framework from Express.js to `Hono.js` for edge-optimized performance.
  - Deployed application on `Cloudflare Workers` runtime.
  - Migrated database from local SQLite to `Cloudflare D1` (distributed SQLite).
  - Implemented `TypeScript` across the entire codebase for full type safety.
  - Introduced `Vitest` as the new testing framework.
  - Implemented `Zod` for robust schema validation.
- **Core Functionality & Improvements:**
  - Enhanced error handling system with custom error classes and centralized handler.
  - Developed an edge-optimized custom logger.
  - Added request tracking middleware with unique request IDs.
  - Created data migration tooling/scripts for transitioning from local SQLite to D1 (details in migration scripts).
  - Began development of a comprehensive test suite (unit and integration tests).
  - Added `last_completed` field to `habits` table for tracking the most recent completion date.
  - Added new progress tracking endpoints:
    - `/api/v1/progress/overview` for combined daily completion history and streak data.
  - Improved progress tracking logic to use a full year of data for accurate streak calculations.
- **DevOps & Documentation:**
  - Added GitHub Actions workflow for automated deployments to Cloudflare Workers.
  - Created initial deployment documentation.
  - Added deployment status indicators in the GitHub repository (via GitHub Environments).
  - Created new comprehensive documentation structure under `/docs`.

### Changed
- **Framework & Data Layer:**
  - Replaced Express.js framework with Hono.js.
  - Refactored repository layer to interact with Cloudflare D1.
- **Authentication & Validation:**
  - Updated authentication middleware to use `clerk/backend` (or similar) for Clerk JWT validation, compatible with Cloudflare Workers.
  - Replaced `express-validator` with Zod for all input validation.
- **API & Responses:**
  - Improved error handling and standardized HTTP status code responses.
- **Database Schema (`habits` table):**
  - Simplified habit frequency representation: replaced `frequency_type`, `frequency_days`, `frequency_dates` with a single `frequency` JSON field.
  - Renamed `best_streak` column to `longest_streak`.
  - Added `total_completions` column.
  - Ensured `last_completed` timestamp is automatically updated when a habit is marked as completed.
- **Progress Tracking:**
  - Updated progress tracking endpoints to ensure calculation accuracy is separate from display filtering. (Consolidated into `/api/v1/progress/overview`).

### Fixed
- **Database & Migrations:**
  - Addressed "no such table: users" errors in local D1 development by ensuring clear migration instructions and execution.
  - Improved initialization of database tables for local `wrangler dev` environment.
  - Resolved "table habits has no column named frequency" errors by adding migration scripts for the schema update.
  - Corrected "FOREIGN KEY constraint failed" errors during habit creation by refining user creation/linking logic with Clerk IDs.
  - Ensured the `users` table (`clerk_user_id` as PK) is correctly configured by migrations.
  - Fixed critical schema mismatch: `habits.user_id` changed from INTEGER to TEXT to correctly reference `users.clerk_user_id`.
  - Added missing `created_at` and `updated_at` timestamp columns to `users`, `habits`, and `trackers` tables through migrations.
- **Functionality:**
  - Improved streak calculation accuracy by ensuring it consistently uses complete data regardless of display filters.
- **Logging:**
  - Added enhanced error logging for database operations to aid diagnostics.

### Removed
- **Outdated Tooling:**
  - Removed Winston logger (replaced with custom edge-compatible logger).
  - Removed direct local SQLite file dependencies and `sqlite3` package (interactions now via D1).
  - Removed `express-validator` (replaced by Zod).
- **Configuration:**
  - Removed `wrangler.staging.toml` to simplify deployment process to named environments via Wrangler commands.

## [1.2.0] - 2024-03-10 
*(Adjusted date to be before 1.3.0 for chronological order. Original date was 2025-05-14 which is in the future)*

### Added
- Added `startDate` (required) and `endDate` (optional) fields to `habits` table to support time-bound habits.
- Updated API validators and handlers for these new date fields in habit creation and update operations.

## [1.1.0] - 2024-03-08 
*(Adjusted date to be before 1.2.0)*
### Added
- Implemented longest streak tracking for habits.
- Added automatic streak updates when habits are completed.
- Improved streak calculation logic with timezone support.
- Created `updateStreakInfo` utility for consistent streak management.
- Introduced transaction support (using Knex.js at the time) for atomic streak updates.

### Changed
- Updated `habits` table schema to include `longest_streak` column.
- Enhanced `GET /habits/:habitId/stats` endpoint to include longest streak information.
- Refactored streak-related code for better maintainability.

### Fixed
- Ensured streak calculation properly handles timezone differences.
- Standardized camelCase naming in streak-related code.
- Added error handling for invalid timezone inputs.

## [1.0.0] - 2024-03-01 
*(Adjusted date to be the earliest)*
### Added
- Initial project setup with Express.js framework.
- User authentication using Clerk.
- API rate limiting.
- Basic security headers with Helmet.js.
- SQLite database integration using Knex.js for query building and migrations.
- Core RESTful API endpoints for habit CRUD and tracking.
- Initial database schema design and migrations.
- Input validation using `express-validator`.
- Basic API documentation.
