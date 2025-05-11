# Testing Guide

This document outlines the testing approach, tools, and best practices for the TracknStick API.

## Testing Approach

The TracknStick API follows a comprehensive testing strategy that includes:

1. **Unit Testing**: Testing individual functions and components in isolation
2. **Integration Testing**: Testing how components work together
3. **API Testing**: Testing the API endpoints directly
4. **End-to-End Testing**: Testing the entire application flow

## Testing Tools

### Jest

[Jest](https://jestjs.io/) is the primary testing framework for the TracknStick API.

Key features:

- Test runner
- Assertion library
- Mocking capabilities
- Code coverage reporting

### Supertest

[Supertest](https://github.com/visionmedia/supertest) is used for HTTP assertions and API testing.

Key features:

- HTTP assertions
- Request chaining
- Response validation

## Directory Structure

Tests are organized in a structure that mirrors the main source code:

```
/tests
  /unit
    /controllers
    /services
    /repositories
    /utils
  /integration
    /api
  /fixtures
    test-data.js
```

## Writing Tests

### Unit Tests

Unit tests focus on testing a single function or component in isolation. Dependencies should be mocked.

Example unit test for a service function:

```javascript
// tests/unit/services/habit.service.test.js
const HabitService = require('../../../src/services/habit.service');
const HabitRepository = require('../../../src/repositories/habit.repository');

// Mock the repository
jest.mock('../../../src/repositories/habit.repository');

describe('HabitService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('getHabitById', () => {
    it('should return a habit when valid ID is provided', async () => {
      // Arrange
      const mockHabit = { id: 1, name: 'Test Habit', user_id: 123 };
      HabitRepository.getHabitById.mockResolvedValue(mockHabit);

      // Act
      const result = await HabitService.getHabitById(1, 123);

      // Assert
      expect(result).toEqual(mockHabit);
      expect(HabitRepository.getHabitById).toHaveBeenCalledWith(1, 123);
    });

    it('should throw NotFoundError when habit does not exist', async () => {
      // Arrange
      HabitRepository.getHabitById.mockResolvedValue(null);

      // Act & Assert
      await expect(HabitService.getHabitById(999, 123)).rejects.toThrow(
        'Habit not found'
      );
    });
  });
});
```

### Integration Tests

Integration tests verify that different parts of the application work together correctly.

Example integration test for an API endpoint:

```javascript
// tests/integration/api/habits.test.js
const request = require('supertest');
const app = require('../../../src/app');
const {
  setupTestDatabase,
  cleanupTestDatabase,
} = require('../../fixtures/database');

describe('Habits API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/v1/habits', () => {
    it('should return 401 when no auth token is provided', async () => {
      const response = await request(app).get('/api/v1/habits');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return habits when authenticated', async () => {
      const response = await request(app)
        .get('/api/v1/habits')
        .set('Authorization', `Bearer ${mockValidToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
```

## Mocking

Mocking is essential for isolating the code being tested. Jest provides built-in mocking capabilities.

### Mocking Modules

```javascript
// Mock an entire module
jest.mock('../../../src/utils/dbUtils');

// Mock specific functions
jest.spyOn(dateUtils, 'getCurrentDate').mockReturnValue(new Date('2023-01-01'));
```

### Mocking Database

For testing repositories or services that interact with the database:

```javascript
// Mock the database utilities
jest.mock('../../../src/utils/dbUtils', () => ({
  dbGet: jest.fn(),
  dbAll: jest.fn(),
  dbRun: jest.fn().mockResolvedValue({ lastID: 1, changes: 1 }),
}));
```

### Mocking Authentication

For testing authenticated endpoints:

```javascript
// Mock the Clerk authentication middleware
jest.mock('@clerk/clerk-sdk-node', () => ({
  ClerkExpressRequireAuth: () => (req, res, next) => {
    req.auth = { userId: 'mock-user-id' };
    next();
  },
}));
```

## Test Data and Fixtures

Use fixtures to set up test data:

```javascript
// tests/fixtures/habits.js
const testHabits = [
  {
    id: 1,
    user_id: 1,
    name: 'Morning Meditation',
    frequency: '0,1,2,3,4,5,6',
    streak: 5,
    total_completions: 12,
    last_completed: '2023-01-01T08:00:00.000Z',
  },
  // More test habits...
];

module.exports = { testHabits };
```

## Running Tests

### Running All Tests

```bash
npm test
```

### Running Specific Tests

```bash
# Run tests for a specific file
npm test -- tests/unit/services/habit.service.test.js

# Run tests that match a pattern
npm test -- -t "should return habits when authenticated"
```

### Watching Tests

During development, you can run tests in watch mode:

```bash
npm test -- --watch
```

## Code Coverage

Jest provides built-in code coverage reporting:

```bash
npm test -- --coverage
```

This generates a coverage report in the `coverage` directory. The goal is to maintain high test coverage, especially for critical components like services and controllers.

## Test-Driven Development (TDD)

For new features, consider using a test-driven development approach:

1. Write a failing test that defines the expected behavior
2. Implement the minimum code to make the test pass
3. Refactor the code while ensuring tests continue to pass

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on the state from other tests.
2. **Clear Assertions**: Make assertions clear and specific to what you're testing.
3. **Mock Dependencies**: Isolate the unit being tested by mocking external dependencies.
4. **Test Edge Cases**: Include tests for edge cases, not just the happy path.
5. **Keep Tests Fast**: Tests should execute quickly to encourage frequent running.
6. **One Assertion per Test**: When possible, focus each test on a single behavior.
7. **Descriptive Test Names**: Use clear, descriptive names for test suites and test cases.
8. **Clean Up**: Clean up any test resources or state in `afterEach` or `afterAll` hooks.
9. **Avoid Testing Implementation Details**: Test behavior, not implementation details that may change.
10. **Coverage Goals**: Aim for high test coverage, especially for critical business logic.

## Continuous Integration

Tests are automatically run in the CI pipeline when code is pushed to the repository. All tests must pass for pull requests to be merged.

Last Updated: 2024-03-21
