# Changelog

All notable changes to the TrackNStick API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - Unreleased

### Added

- Migrated to Hono.js framework for edge-optimized performance
- Deployed on Cloudflare Workers runtime
- Moved database to Cloudflare D1 (distributed SQLite)
- TypeScript implementation with full type safety
- New testing framework with Vitest
- Improved validation with Zod schema validation
- Enhanced error handling system
- Edge-optimized custom logger
- Request tracking middleware with unique request IDs
- Data migration tooling from SQLite to D1
- Comprehensive test suite with unit and integration tests
- New troubleshooting documentation for common issues
- Added last_completed field to habits table for tracking most recent completion date
- Added migration script to update existing database schema to the new format
- Added GitHub Actions workflow for automated deployments to Cloudflare Workers
- Added deployment documentation with setup instructions
- Added deployment status indicators in GitHub repository
- Added new progress endpoints for tracking user completion history and streaks
  - `/api/v1/progress/history` for getting daily completion rates
  - `/api/v1/progress/streaks` for getting current and longest streaks
  - `/api/v1/progress/overview` for combined history and streak data
- Improved progress tracking logic to use a full year of data for accurate streak calculations

### Changed

- Replaced Express.js with Hono.js
- Refactored repository layer to use D1 database
- Updated authentication middleware for Clerk compatibility in Cloudflare Workers
- Converted validation from express-validator to Zod
- Improved error handling and status code responses
- Enhanced TypeScript support throughout codebase
- Updated README with D1 migration instructions
- Simplified database schema for habits - replaced frequency_type, frequency_days, frequency_dates with a single frequency JSON field
- Renamed best_streak to longest_streak in the habits table
- Added total_completions field to habits table
- Automatic updating of last_completed time when habit is marked as completed
- Updated progress tracking endpoints to separate display filtering from calculation accuracy

### Fixed

- Fixed "no such table: users" error in local development by adding clear database migration instructions
- Improved initialization of database tables when running locally
- Fixed "table habits has no column named frequency" error by adding a migration script to update the table schema
- Fixed "FOREIGN KEY constraint failed" error when creating habits by improving user creation handling
- Added enhanced error logging for database operations to better diagnose issues
- Created migration to ensure the users table exists and is properly configured
- Fixed critical schema mismatch where habits.user_id was INTEGER but needed to be TEXT to properly reference users.clerk_user_id
- Added missing created_at and updated_at columns that were lost during schema migration
- Added missing created_at and updated_at columns to trackers table
- Fixed streak calculation accuracy by ensuring it always uses complete data regardless of display filters

### Removed

- Removed Winston logger (not compatible with edge runtime)
- Removed direct SQLite dependencies
- Removed staging environment configuration (wrangler.staging.toml) to simplify deployment process

## [1.2.0] - 2025-05-14

### Added

- Added `startDate` (required) and `endDate` (optional) fields to habits to support time-bound habits
- Updated validators to handle and validate the new date fields
- Extended API to accept and return these new fields in create/update operations

## [1.1.0] - 2025-05-13

### Added

- Longest streak tracking for habits
- Automatic streak updates when habits are completed
- Improved streak calculation with timezone support
- New `updateStreakInfo` utility for consistent streak management
- Transaction support for atomic streak updates

### Changed

- Updated habit schema to include `longest_streak` column
- Enhanced `getHabitStats` endpoint to include longest streak information
- Improved streak calculation to handle timezone-aware dates
- Refactored streak-related code for better maintainability

### Fixed

- Streak calculation now properly handles timezone differences
- Consistent camelCase naming in streak-related code
- Proper error handling for invalid timezone inputs

## [1.0.0] - 2025-05-10

### Added

- Initial project setup with Express framework
- Authentication with Clerk
- API rate limiting
- Basic security headers with Helmet
- SQLite database integration with Knex.js
- RESTful API endpoints for core functionality
- Database migrations and schema design
- Input validation with express-validator
- API documentation
