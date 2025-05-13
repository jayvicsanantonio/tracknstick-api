# Changelog

All notable changes to the TrackNStick API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Pre-commit hooks to prevent commits with linting errors or warnings
- Husky integration for Git hooks management
- lint-staged configuration to run ESLint and Prettier before commits

## [1.1.0] - 2025-05-15

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
