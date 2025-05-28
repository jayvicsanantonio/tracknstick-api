# API Examples

This directory contains practical examples of how to use the TracknStick API endpoints in different scenarios.

## Table of Contents

1. [Authentication Examples](authentication.md)
2. [Habit Management Examples](habits.md)
3. [Habit Tracking Examples](tracking.md)
4. [Statistics Examples](statistics.md)

## Common Setup

All examples assume you have:

1. A valid Clerk authentication token
2. The API running at `http://localhost:3000`
3. A modern HTTP client (like `fetch` or `axios`)

### Base Configuration

```javascript
const API_BASE_URL = 'http://localhost:3000/api/v1';
const AUTH_TOKEN = 'your-clerk-jwt-token';

const headers = {
  Authorization: `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json',
};
```

### Error Handling

All examples include basic error handling:

```javascript
async function makeApiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error.message);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error.message);
    throw error;
  }
}
```

## Example Categories

### Authentication Examples

- [Getting a session token](authentication.md#getting-a-session-token)
- [Handling token expiration](authentication.md#handling-token-expiration)
- [Refreshing tokens](authentication.md#refreshing-tokens)

### Habit Management Examples

- [Creating a new habit](habits.md#creating-a-new-habit)
- [Updating habit details](habits.md#updating-habit-details)
- [Deleting a habit](habits.md#deleting-a-habit)
- [Listing habits](habits.md#listing-habits)

### Habit Tracking Examples

- [Recording a habit completion](tracking.md#recording-a-habit-completion)
- [Viewing completion history](tracking.md#viewing-completion-history)
- [Adding notes to completions](tracking.md#adding-notes-to-completions)

### Statistics Examples

- [Getting habit statistics](statistics.md#getting-habit-statistics)
- [Viewing progress overview](statistics.md#viewing-progress-overview)
- [Analyzing completion rates](statistics.md#analyzing-completion-rates)

## Best Practices

1. **Error Handling**

   - Always check response status
   - Handle rate limiting
   - Implement retry logic
   - Log errors appropriately

2. **Performance**

   - Cache responses when possible
   - Batch requests when appropriate
   - Use appropriate HTTP methods
   - Monitor rate limits

3. **Security**
   - Never expose tokens
   - Use HTTPS in production
   - Validate input data
   - Handle sensitive data properly

## Testing the Examples

Each example includes:

- Complete code snippets
- Expected responses
- Error scenarios
- Testing instructions

To test the examples:

1. Set up your environment:

   ```bash
   # Install dependencies
   npm install

   # Set up environment variables
   cp .env.example .env
   # Edit .env with your Clerk keys
   ```

2. Start the API:

   ```bash
   npm start
   ```

3. Run the examples:

   ```bash
   # Using curl
   curl -H "Authorization: Bearer $AUTH_TOKEN" http://localhost:3000/api/v1/habits

   # Using Node.js
   node examples/habits.js
   ```

## Contributing Examples

When adding new examples:

1. Follow the established format
2. Include error handling
3. Add comments for clarity
4. Test the examples
5. Update this README

Last Updated: 2024-03-21
