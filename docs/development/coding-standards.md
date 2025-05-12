# Coding Standards

This document outlines the coding standards and best practices for the TracknStick API project.

## Naming Conventions

### Database (snake_case)

- Table names: `user_profiles`, `tracking_records`, etc.
- Column names: `created_at`, `updated_at`, `user_id`, etc.
- Foreign keys: `user_id`, `habit_id`, etc.
- Index names: `idx_users_clerk_id`, `idx_habits_user_id`, etc.

### Application Code (camelCase)

- Variables: `userProfile`, `trackingRecord`, etc.
- Function parameters: `userId`, `trackingData`, etc.
- API request/response parameters: `startDate`, `endDate`, etc.
- Query parameters: `pageSize`, `sortBy`, etc.
- Function names: `getUserProfile`, `createTrackingRecord`, etc.
- Class names: `UserService`, `HabitController`, etc.
- Interface names: `UserProfile`, `TrackingRecord`, etc.
- Type names: `UserRole`, `TrackingStatus`, etc.

### Constants (UPPER_SNAKE_CASE)

- Environment variables: `DATABASE_PATH`, `CLERK_SECRET_KEY`, etc.
- Configuration constants: `MAX_RETRY_ATTEMPTS`, `DEFAULT_PAGE_SIZE`, etc.

### File Names

- Use kebab-case for file names: `user-service.ts`, `habit-controller.ts`, etc.
- Test files should end with `.test.ts`: `user-service.test.ts`
- Migration files should use timestamp prefix: `20240315123456_create_users_table.ts`

## Code Style

- Use TypeScript for all new code
- Use 2 spaces for indentation
- Use single quotes for strings
- Use semicolons at the end of statements
- Use trailing commas in multi-line object/array literals
- Maximum line length: 100 characters
- Prefer `const` over `let` unless the variable needs to be reassigned
- Never use `var`

## Comments and Documentation

- Use JSDoc comments for public functions and classes
- Keep comments evergreen - avoid temporal context or references to recent changes
- Document complex business logic or non-obvious code decisions
- Never remove existing comments unless they are proven to be false

## Testing

- Write tests for all new features and bug fixes
- Use real data and real APIs - no mocking
- Test files should be co-located with the files they test
- Test names should be descriptive of what they're testing

## Error Handling

- Use custom error classes for different types of errors
- Always include meaningful error messages
- Log errors with appropriate context
- Handle errors at the appropriate level of abstraction

## Security

- Never commit sensitive data (API keys, passwords, etc.)
- Use environment variables for configuration
- Validate and sanitize all user input
- Follow the principle of least privilege
- Keep dependencies up to date

## Performance

- Write efficient database queries
- Use appropriate indexes
- Implement pagination for large data sets
- Cache frequently accessed data when appropriate

## Git Practices

- Write clear, descriptive commit messages
- Keep commits focused and atomic
- Use feature branches for new development
- Review code before merging

## API Design

- Use RESTful principles
- Version all APIs (e.g., `/api/v1/...`)
- Use consistent response formats
- Include appropriate status codes
- Document all endpoints

Remember: These standards are meant to be followed by all contributors to maintain consistency and quality across the codebase. If you find any violations, please fix them when you encounter them.
