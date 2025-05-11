# Debugging Guide

This document provides guidance on debugging the TracknStick API.

## Debugging Tools

### Console Logging

The most basic form of debugging is using `console.log()` statements:

```javascript
console.log('Variable value:', myVariable);
console.error('Error encountered:', error);
```

Best practices for console logging:

- Use descriptive labels to identify what you're logging
- Log objects with `JSON.stringify(obj, null, 2)` for better readability
- Remove or comment out debug logs before committing code

### Node.js Debugger

For more advanced debugging, use the built-in Node.js debugger:

1. Add a `debugger` statement in your code where you want to pause execution:

   ```javascript
   function myFunction() {
     const someValue = calculateValue();
     debugger; // Execution will pause here when running in debug mode
     return processValue(someValue);
   }
   ```

2. Start the application in debug mode:

   ```bash
   node --inspect index.js
   ```

3. Open Chrome browser and navigate to `chrome://inspect`
4. Click on "Open dedicated DevTools for Node"
5. Your application will pause at the `debugger` statement

### VS Code Debugging

VS Code provides excellent debugging support for Node.js applications:

1. Click on the "Run and Debug" icon in the sidebar or press `Ctrl+Shift+D`
2. Click "create a launch.json file" and select "Node.js" environment
3. Configure the launch.json file:

   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "node",
         "request": "launch",
         "name": "Launch Program",
         "skipFiles": ["<node_internals>/**"],
         "program": "${workspaceFolder}/index.js",
         "env": {
           "NODE_ENV": "development"
         },
         "outFiles": ["${workspaceFolder}/**/*.js"]
       }
     ]
   }
   ```

4. Set breakpoints by clicking in the gutter next to line numbers
5. Start debugging by clicking the green play button or pressing F5

## Debugging Strategies

### Error Handling

When debugging errors, follow these steps:

1. Check the error message and stack trace for clues
2. Look for the error type and origin file/line number
3. Check any relevant input data
4. Review logs for context around the error
5. Use try/catch blocks to isolate error sources:

   ```javascript
   try {
     const result = await someFunction();
     // Process result
   } catch (error) {
     console.error('Error in someFunction:', error);
     // Handle error or rethrow
   }
   ```

### Database Debugging

For database-related issues:

1. Enable verbose SQLite logging temporarily:

   ```javascript
   const sqlite3 = require('sqlite3').verbose();
   ```

2. Print SQL queries and parameters before execution:

   ```javascript
   console.log('Executing query:', sql, 'with params:', params);
   const result = await dbGet(sql, params);
   ```

3. Use the SQLite command-line shell for direct database inspection:

   ```bash
   sqlite3 tracknstick.db
   ```

   Then run queries directly:

   ```sql
   .tables
   SELECT * FROM habits LIMIT 5;
   PRAGMA table_info(habits);
   ```

### Middleware Debugging

To debug middleware issues:

1. Add a temporary middleware that logs request details:

   ```javascript
   app.use((req, res, next) => {
     console.log(`Request: ${req.method} ${req.url}`);
     console.log('Headers:', req.headers);
     console.log('Body:', req.body);
     next();
   });
   ```

2. Place this middleware before the middleware you're debugging
3. Track the flow of the request through various middleware functions

### Authentication Debugging

For authentication issues:

1. Log the authentication token:

   ```javascript
   console.log('Auth header:', req.headers.authorization);
   ```

2. Check the decoded token content from Clerk:

   ```javascript
   console.log('Auth data:', req.auth);
   ```

3. Verify user ID is correctly extracted and used:
   ```javascript
   console.log('User ID from token:', req.auth.userId);
   ```

## Common Issues and Solutions

### 1. Database Connection Issues

**Symptoms**: Application fails to start with database errors, or queries fail at runtime.

**Debugging**:

1. Check if the database file exists
2. Verify file permissions
3. Check connection string in `dbUtils.js`
4. Ensure SQLite is installed and working

**Solution**:

```javascript
// Add detailed logging to database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`Error connecting to database at ${dbPath}:`, err);
    console.error(`Absolute path: ${path.resolve(dbPath)}`);
    console.error(`File exists: ${fs.existsSync(path.resolve(dbPath))}`);
    process.exit(1);
  } else {
    console.log(`Successfully connected to database at ${dbPath}`);
  }
});
```

### 2. Authentication Errors

**Symptoms**: 401 Unauthorized responses, authentication middleware failures.

**Debugging**:

1. Check the exact error message from Clerk middleware
2. Verify the token format and expiration
3. Check environment variables for Clerk API keys

**Solution**:

```javascript
// Add temporary debugging to auth middleware
app.use((req, res, next) => {
  if (!req.headers.authorization) {
    console.log('Missing authorization header');
  } else {
    console.log(
      'Auth header present:',
      req.headers.authorization.substring(0, 25) + '...'
    );
  }
  next();
});
```

### 3. Data Not Found Issues

**Symptoms**: 404 errors or empty result sets.

**Debugging**:

1. Verify the exact ID or parameters being used in the query
2. Check if the data actually exists in the database
3. Ensure the user ID is included in queries for user-specific data

**Solution**:

```javascript
// Add comprehensive logging in repository methods
async function getHabitById(habitId, userId) {
  console.log(`Looking for habit with ID ${habitId} for user ${userId}`);
  const habit = await dbGet(
    'SELECT * FROM habits WHERE id = ? AND user_id = ?',
    [habitId, userId]
  );
  console.log('Query result:', habit || 'No habit found');
  return habit;
}
```

## Performance Debugging

For performance issues:

1. Use console.time() and console.timeEnd() to measure execution time:

   ```javascript
   console.time('operation-name');
   // Operation to measure
   console.timeEnd('operation-name');
   ```

2. Identify slow database queries:

   ```javascript
   console.time('database-query');
   const results = await dbAll('SELECT * FROM habits WHERE user_id = ?', [
     userId,
   ]);
   console.timeEnd('database-query');
   ```

3. Use a profiler for CPU-intensive operations:

   ```javascript
   const { Session } = require('inspector');
   const fs = require('fs');

   function startProfiling() {
     const session = new Session();
     session.connect();
     session.post('Profiler.enable');
     session.post('Profiler.start');
     return session;
   }

   function stopProfiling(session) {
     return new Promise((resolve) => {
       session.post('Profiler.stop', (err, { profile }) => {
         fs.writeFileSync('./profile.cpuprofile', JSON.stringify(profile));
         console.log('Profile saved to profile.cpuprofile');
         session.disconnect();
         resolve();
       });
     });
   }
   ```

## Debugging Best Practices

1. **Use structured logging**: Include relevant context (function name, input parameters, etc.)
2. **Isolate issues**: Debug one component at a time
3. **Reproduce consistently**: Create a reliable way to reproduce the issue
4. **Check environmental factors**: Ensure environment variables and configuration are correct
5. **Use version control**: Compare with working versions to identify changes
6. **Remove debug code**: Clean up debugging code before committing
7. **Document fixes**: Note the cause and solution for future reference

Last Updated: 2024-03-21
