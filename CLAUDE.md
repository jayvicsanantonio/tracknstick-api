# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development
- `pnpm run dev` - Start development server with Wrangler (includes build)
- `pnpm run dev:local` - Run with local D1 database instead of remote
- `pnpm run build` - Compile TypeScript to JavaScript

### Database Operations
- `pnpm run db:setup` - Initialize local database with schema
- `pnpm run db:migrate` - Run database migrations 
- `pnpm run db:seed` - Populate database with sample data
- `pnpm run db:reset` - Drop all tables and recreate (destructive)
- `pnpm run db:query` - Interactive database query tool
- Add `--remote` flag to any db command to target production database

### Testing
- `pnpm run test` - Run all tests with Vitest
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:coverage` - Generate test coverage report
- Tests use Miniflare environment to simulate Cloudflare Workers runtime

### Code Quality
- `pnpm run lint` - Run ESLint
- `pnpm run lint:fix` - Auto-fix ESLint issues
- `pnpm run format` - Format code with Prettier

### Deployment
- `pnpm run deploy` - Deploy to Cloudflare Workers (includes build)

## Architecture Overview

This is a **Cloudflare Workers API** built with **Hono.js** for a habit tracking application. The architecture follows a layered approach:

### Core Technology Stack
- **Runtime**: Cloudflare Workers (serverless edge computing)
- **Framework**: Hono.js (fast web framework for edge)
- **Database**: Cloudflare D1 (serverless SQLite)
- **Authentication**: Clerk (JWT-based auth with middleware validation)
- **Validation**: Zod schemas with Hono middleware
- **Testing**: Vitest with Miniflare for Workers simulation

### Application Layers
```
Routes → Controllers → Services → Repositories → Database
```

- **Routes** (`src/routes/`): Define API endpoints and apply validation middleware
- **Controllers** (`src/controllers/`): Handle HTTP requests/responses, extract data from context
- **Services** (`src/services/`): Business logic, orchestrate repository calls
- **Repositories** (`src/repositories/`): Data access layer, direct database operations
- **Middlewares** (`src/middlewares/`): Request processing (auth, validation, logging, error handling)

### Key Architectural Patterns
- **Repository Pattern**: Database operations are abstracted into repository classes
- **Middleware Chain**: Clerk auth → request validation → controllers → error handling  
- **Timezone-Aware**: All date operations consider user timezone with DST handling
- **Soft Deletes**: Habits and trackers use `deleted_at` timestamps instead of hard deletion

## Database Schema

### Core Tables
- **users**: Store Clerk user IDs and metadata
- **habits**: User habits with frequency patterns, streaks, and completion counters  
- **trackers**: Individual habit completions with timestamps and notes
- **achievements**: Predefined achievement definitions
- **user_achievements**: Junction table tracking earned achievements

### Important Database Notes
- Uses Cloudflare D1 (serverless SQLite)
- Foreign keys reference `users.clerk_user_id` (string) not integer IDs
- Habits frequency stored as comma-separated days (e.g., "Mon,Wed,Fri")  
- Timestamps stored as ISO strings for timezone calculation
- Comprehensive indexing on user_id, timestamps, and lookup fields

## Request/Response Patterns

### Authentication
All API routes require valid Clerk JWT token in Authorization header:
```
Authorization: Bearer <jwt-token>
```

### Validation Middleware 
Uses `@hono/zod-validator` with custom `validateRequest` middleware:
```typescript
validateRequest(schema, 'json' | 'query' | 'param')
```

### Response Format
Consistent response structure with data and meta information:
```json
{
  "data": { /* response payload */ },
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z", 
    "timezone": "America/New_York"
  }
}
```

## Development Guidelines

### Code Organization
- Follow the established layered architecture
- Keep controllers thin - delegate business logic to services
- Use repositories for all database operations
- Place validation schemas in dedicated validator files
- Maintain timezone utilities in `utils/dateUtils.ts` and `utils/streakUtils.ts`

### Testing Approach  
- **Unit Tests**: Test individual functions (utils, repositories, services)
- **Integration Tests**: Test API endpoints with mocked D1 database
- **Test Setup**: Use `src/tests/setup.ts` for common test utilities
- **Mocking**: Vitest mocks with Miniflare for Workers environment simulation

### Important Implementation Details
- **Timezone Handling**: All date calculations must consider user timezone using `getLocaleStartEnd()` utility
- **Streak Calculations**: Different logic for daily vs non-daily habits in `streakUtils.ts`
- **Soft Deletes**: Never hard delete habits/trackers - use `deleted_at` timestamp
- **Error Handling**: Use custom error classes from `utils/errors.ts` with proper HTTP status codes
- **Logging**: Structured logging with `utils/logger.ts` for debugging and monitoring

### Key Files to Reference
- `src/index.ts` - Main application entry point with middleware setup
- `src/types/index.ts` - TypeScript type definitions 
- `migrations/schema.sql` - Complete database schema
- `wrangler.toml` - Cloudflare Workers configuration
- `.cursor/rules/standards.mdc` - Project coding standards and conventions