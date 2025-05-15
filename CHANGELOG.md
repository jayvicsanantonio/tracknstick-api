# Changelog

All notable changes to the TrackNStick API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-05-14

### Changed

- Converted entire codebase from CommonJS to ES modules
  - Updated all import/export statements to use ESM syntax
  - Added .js extensions to all imports for ESM compatibility
  - Modified package.json to use "type": "module"
  - Updated utility files to use import.meta.url instead of \_\_dirname
- Replaced console statements with logger in Cloudflare D1 adapter
  - Enhanced error logging with additional context information
  - Standardized logging approach across the codebase

### Added

- Added CI/CD workflow for automated Cloudflare deployments
  - Configured GitHub Actions to deploy on PR merges to main branch
  - Added linting check as part of deployment process
- Added Cloudflare Workers deployment support
  - Added .wrangler to .gitignore to exclude local worker state
- Added `startDate` (required) and `endDate` (optional) fields to habits to support time-bound habits
- Updated validators to handle and validate the new date fields
- Extended API to accept and return these new fields in create/update operations

### Fixed

- Fixed D1_TYPE_ERROR in Cloudflare Worker when creating habits
  - Converted frequency arrays to comma-separated strings before D1 database storage
  - Added proper transformation of frequency data between array and string formats
  - Ensured consistent API response format between Express server and Cloudflare Worker

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
