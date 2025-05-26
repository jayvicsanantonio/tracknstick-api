# API Usage Examples

This document provides practical examples of how to use the TracknStick API endpoints in different scenarios.

## Table of Contents

1.  [Common Setup](#common-setup)
    *   [Base Configuration](#base-configuration)
    *   [Error Handling Utility](#error-handling-utility)
2.  [Authentication Examples](#authentication-examples)
    *   [Getting a Session Token (Clerk React SDK)](#getting-a-session-token-clerk-react-sdk)
    *   [Getting a Session Token (Clerk JavaScript SDK)](#getting-a-session-token-clerk-javascript-sdk)
    *   [Handling Token Expiration (Automatic Refresh)](#handling-token-expiration-automatic-refresh)
    *   [Handling Token Expiration (Manual Refresh)](#handling-token-expiration-manual-refresh)
    *   [Refreshing Tokens (Clerk's Built-in)](#refreshing-tokens-clerks-built-in)
    *   [Refreshing Tokens (Custom Logic)](#refreshing-tokens-custom-logic)
    *   [Comprehensive Auth Error Handling](#comprehensive-auth-error-handling)
3.  [Habit Management Examples](#habit-management-examples)
    *   [Creating a Basic Habit](#creating-a-basic-habit)
    *   [Creating a Habit with Custom Schedule](#creating-a-habit-with-custom-schedule)
    *   [Retrieving All Habits](#retrieving-all-habits)
    *   [Retrieving a Specific Habit](#retrieving-a-specific-habit)
    *   [Updating a Habit (Basic)](#updating-a-habit-basic)
    *   [Updating Habit Schedule](#updating-habit-schedule)
    *   [Deleting a Habit](#deleting-a-habit)
    *   [Creating Multiple Habits (Batch)](#creating-multiple-habits-batch)
    *   [Updating Multiple Habits (Batch)](#updating-multiple-habits-batch)
4.  [Habit Tracking Examples](#habit-tracking-examples)
    *   [Recording Habit Completion (Basic)](#recording-habit-completion-basic)
    *   [Recording Habit Completion with Notes](#recording-habit-completion-with-notes)
    *   [Retrieving Tracking History for a Habit](#retrieving-tracking-history-for-a-habit)
    *   [Retrieving Tracking Status for Multiple Habits](#retrieving-tracking-status-for-multiple-habits)
    *   [Updating a Tracking Entry](#updating-a-tracking-entry)
    *   [Batch Updating Tracking Entries](#batch-updating-tracking-entries)
    *   [Deleting a Tracking Entry](#deleting-a-tracking-entry)
5.  [Statistics Examples](#statistics-examples)
    *   [Getting Overall Statistics](#getting-overall-statistics)
    *   [Getting Habit-Specific Statistics](#getting-habit-specific-statistics)
    *   [Getting Weekly Statistics (with Chart.js)](#getting-weekly-statistics-with-chartjs)
    *   [Getting Monthly Statistics (with Chart.js)](#getting-monthly-statistics-with-chartjs)
    *   [Comparing Habits (with Chart.js)](#comparing-habits-with-chartjs)
6.  [Error Handling Examples (General)](#error-handling-examples-general)
    *   [API Error Class](#api-error-class)
    *   [Handling Authentication Failures](#handling-authentication-failures)
    *   [Handling Rate Limits](#handling-rate-limits)
    *   [Handling Input Validation](#handling-input-validation)
    *   [Handling Network Issues](#handling-network-issues)
    *   [Global Error Handler (Conceptual)](#global-error-handler-conceptual)
7.  [Best Practices](#best-practices)

## Common Setup

All examples assume you have:

1.  A valid Clerk authentication token.
2.  The API running, typically at `http://localhost:8787` for local development with Wrangler (the original examples used `http://localhost:3000`, adjust as per your setup).
3.  A modern HTTP client (like `fetch` or `axios`).

### Base Configuration

```javascript
// Adjust API_BASE_URL based on your environment (local/production)
const API_BASE_URL = 'http://localhost:8787/api/v1'; // Assuming local dev with Wrangler
let AUTH_TOKEN = 'your-clerk-jwt-token'; // This should be dynamically obtained

// Function to get the token from Clerk (conceptual)
async function getToken() {
  // In a real app, this would come from your Clerk SDK instance
  // e.g., const { getToken } = useAuth(); const token = await getToken();
  // For example purposes, ensure AUTH_TOKEN is set.
  if (AUTH_TOKEN === 'your-clerk-jwt-token') {
    console.warn("Using placeholder AUTH_TOKEN. Replace with actual token retrieval.");
  }
  return AUTH_TOKEN;
}

const headers = {
  'Authorization': `Bearer ${await getToken()}`, // Needs to be dynamic
  'Content-Type': 'application/json',
};

// Update headers function for dynamic token
async function getHeaders() {
  const token = await getToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
```

### Error Handling Utility

This is a basic utility. More specific error handling is shown in context.
The `makeApiCall` function is a conceptual wrapper for `fetch`. In a real frontend application, you would likely use a more robust solution like a dedicated API client class or a library such as `axios` or `ky`.

```javascript
// Conceptual makeApiCall function
async function makeApiCall(endpoint, options = {}) {
  try {
    const currentHeaders = await getHeaders(); // Assumes getHeaders() is defined and provides auth
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options, // Spread options like method, body first
      headers: { // Then define headers, allowing options.headers to override defaults
        'Content-Type': 'application/json', // Default, can be overridden
        ...currentHeaders, // Auth header
        ...(options.headers || {}), 
      },
    });

    const responseData = await response.json();

    if (!response.ok) {
      const error = new Error(responseData.error?.message || `HTTP error! Status: ${response.status}`);
      error.status = response.status;
      error.code = responseData.error?.code;
      error.details = responseData.error?.details;
      error.responseData = responseData; // Attach full parsed error response
      throw error;
    }

    // As per API_REFERENCE.md, successful responses wrap data: { success: true, data: ... }
    if (responseData.success) {
      return responseData.data;
    } else {
      // This path should ideally not be hit if !response.ok catches API errors correctly
      const error = new Error(responseData.error?.message || 'API indicated failure but with HTTP 2xx status.');
      error.responseData = responseData;
      throw error;
    }

  } catch (error) {
    // Log more detailed error information if available
    console.error(
      'API Call Error:', 
      error.message, 
      error.status ? `Status: ${error.status}` : '',
      error.code ? `Code: ${error.code}` : '', 
      error.details ? `Details: ${JSON.stringify(error.details)}` : '',
      error.responseData ? `Full Response: ${JSON.stringify(error.responseData)}` : ''
    );
    throw error; // Re-throw for further handling by the caller
  }
}
```

## Authentication Examples

*(Extracted from `docs/api/examples/authentication.md`)*

### Getting a Session Token (Clerk React SDK)

```javascript
import { useAuth } from '@clerk/clerk-react';

function HabitTracker() {
  const { getToken } = useAuth();

  const fetchHabits = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/habits`, { // Adjusted API_BASE_URL
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch habits');
      }

      const responseData = await response.json(); // Expect { success: true, data: ... }
      if (!responseData.success) throw new Error(responseData.error?.message || 'Failed to fetch habits');
      return responseData.data;
    } catch (error) {
      console.error('Error fetching habits:', error.message);
      // In a real app, update UI to show error
      throw error; // Re-throw for component-level handling if needed
    }
  };

  // return ( Component JSX );
}
```

### Getting a Session Token (Clerk JavaScript SDK)

```javascript
import { Clerk } from '@clerk/clerk-js';

// Replace 'your_publishable_key' with your actual Clerk Publishable Key
const clerk = new Clerk('your_publishable_key');

async function initializeClerkAndGetToken() {
  await clerk.load();

  if (clerk.session) {
    const token = await clerk.session.getToken();
    return token;
  } else {
    // This means the user is not signed in.
    // Handle this case, e.g., by redirecting to Clerk's sign-in page.
    // clerk.openSignIn({});
    throw new Error('No active session. User is not signed in.');
  }
}

// Usage
async function makeAuthenticatedRequestWithClerkJS() {
  try {
    const token = await initializeClerkAndGetToken();
    const response = await fetch(`${API_BASE_URL}/habits`, { // Adjusted API_BASE_URL
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const responseData = await response.json(); // Expect { success: true, data: ... }
    if (!response.ok || !responseData.success) {
        throw new Error(responseData.error?.message || 'Request failed');
    }
    return responseData.data;
  } catch (error) {
    console.error('Authentication error:', error.message);
    throw error; // Re-throw
  }
}
```

### Handling Token Expiration (Automatic Refresh)
Clerk's SDKs (`@clerk/clerk-react`, `@clerk/clerk-js`) typically handle token refreshes automatically. When you call `getToken()`, it should return a valid (unexpired) token, refreshing it behind the scenes if necessary.

```javascript
import { useAuth } from '@clerk/clerk-react';

function useAuthenticatedFetch() {
  const { getToken, signOut } = useAuth(); // Assuming signOut is available

  const authenticatedFetch = async (url, options = {}) => {
    try {
      const token = await getToken(); // Clerk SDK handles refresh

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        // This might indicate a more serious issue if Clerk's auto-refresh failed
        // or if the session is truly invalid.
        console.error("Received 401 despite Clerk's token management. Session might be invalid.");
        // Optionally, sign the user out or attempt a forced refresh once.
        // await signOut();
        // throw new Error('Session invalid or expired.');
        // For this example, we re-throw to be caught by a general handler.
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Unauthorized');
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      return response; // Return the full response for further processing
    } catch (error) {
      console.error('Authenticated fetch failed:', error);
      throw error;
    }
  };

  return authenticatedFetch;
}

// Usage
function HabitList() {
  const authenticatedFetch = useAuthenticatedFetch();

  const fetchHabitsData = async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/habits`); // Adjusted
      const response = await authenticatedFetch(`${API_BASE_URL}/habits`); 
      const responseData = await response.json(); // Assuming response is already processed by authenticatedFetch
      if (!response.ok || !responseData.success) { // Check success flag from API
          throw new Error(responseData.error?.message || "Failed to fetch habits");
      }
      return responseData.data; 
    } catch (error) {
      console.error('Failed to fetch habits:', error.message);
      // Handle error, e.g., show a message to the user
      throw error; // Re-throw
    }
  };
  // ...
}
```
*The original example for automatic token refresh had a retry logic. However, Clerk's `getToken()` should ideally manage this. If `getToken()` itself fails or returns an expired token that the backend rejects, it's usually a sign of a deeper session issue.*

### Handling Token Expiration (Manual Refresh)
This is generally not recommended if using Clerk's frontend SDKs, as they manage token lifecycles. However, if you were interacting with tokens more directly:

```javascript
// Conceptual: Not the standard Clerk SDK pattern
import { Clerk } from '@clerk/clerk-js';

class AuthManager {
  constructor(publishableKey) {
    this.clerk = new Clerk(publishableKey);
    this.token = null;
    this.tokenExpiry = null; // You'd need to parse the JWT to get its 'exp' claim
  }

  async initialize() {
    await this.clerk.load();
    // Listen for session changes
    this.clerk.addListener((event) => {
      if (event.session) {
        this.refreshToken(event.session);
      } else {
        this.token = null;
        this.tokenExpiry = null;
      }
    });
    if (this.clerk.session) {
        await this.refreshToken(this.clerk.session);
    }
  }

  async refreshToken(session) {
    this.token = await session.getToken();
    // To manually manage expiry, you'd parse the JWT:
    // const payload = JSON.parse(atob(this.token.split('.')[1])); // For browser
    // const payload = JSON.parse(Buffer.from(this.token.split('.')[1], 'base64').toString()); // For Node.js
    // this.tokenExpiry = payload.exp * 1000; // exp is in seconds
    console.log("Token refreshed (simulated manual management pattern)");
  }

  async getValidToken() {
    if (!this.clerk.session) {
        // Example: Redirect to sign-in or throw specific error
        // this.clerk.openSignIn(); 
        throw new AuthSpecificError("User not signed in.", "NO_SESSION");
    }
    // Clerk's session.getToken() should handle internal refresh if needed.
    return this.clerk.session.getToken(); 
  }

  async makeRequest(url, options = {}) {
    try {
      const token = await this.getValidToken();
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers, // Keep existing options.headers
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json', // Assuming JSON by default
        },
      });

      const responseData = await response.json();

      if (response.status === 401) {
        console.warn("Received 401. Clerk token might be fully expired or session invalid.");
        // Depending on Clerk SDK, session.getToken({forceRefresh: true}) might be attempted here,
        // or it might be better to trigger a full re-authentication flow.
        throw new AuthSpecificError(responseData.error?.message || 'Unauthorized', responseData.error?.code || 'UNAUTHORIZED_REFRESH_FAILED');
      }
      if (!response.ok) {
        throw new APIError(responseData.error?.message, responseData.error?.code, response.status, responseData.error?.details);
      }
      return responseData; // Return parsed JSON data directly {success, data/error}
    } catch (error) {
      // Log or handle error appropriately
      console.error('AuthManager makeRequest failed:', error.message);
      throw error; // Re-throw for component level or global handler
    }
  }
}

// Define APIError and AuthSpecificError as shown in previous examples or error handling section.
class APIError extends Error { /* ... */ }
class AuthSpecificError extends APIError { /* ... */ }
```

### Refreshing Tokens (Clerk's Built-in)
The `getToken({ forceRefresh: true })` option can be used if you suspect a token might be stale, though it's not typically needed for every request.

```javascript
import { useAuth } from '@clerk/clerk-react';

function SecureComponent() {
  const { getToken } = useAuth();

  const handleForceTokenRefresh = async () => {
    try {
      const newToken = await getToken({ forceRefresh: true });
      console.log('Token refreshed successfully (forced):', newToken.substring(0, 20) + "...");
      // Update your application state or storage if necessary, though usually not needed
      // as subsequent getToken() calls will return the new token.
    } catch (error) {
      console.error('Failed to force refresh token:', error);
      // Handle the error (e.g., redirect to login if session is truly invalid)
    }
  };

  return <button onClick={handleForceTokenRefresh}>Force Refresh Token</button>;
}
```

### Refreshing Tokens (Custom Logic)
This example demonstrates a more involved custom token management strategy, which is usually unnecessary when using Clerk's provided SDKs.

```javascript
// Conceptual: Generally not needed with Clerk SDKs
import { Clerk } from '@clerk/clerk-js';

class TokenManager {
  constructor(publishableKey) {
    this.clerk = new Clerk(publishableKey);
    this.refreshPromise = null;
  }

  async initialize() {
    await this.clerk.load();
  }

  async refreshTokenInternal() {
    if (!this.clerk.session) {
      throw new Error('No active session');
    }
    // forceRefresh is true by default if token is expired.
    // Setting it true here ensures a new token is fetched from Clerk's backend.
    // If using templates with Clerk:
    // const newToken = await this.clerk.session.getToken({ template: 'YOUR_TEMPLATE_NAME', forceRefresh: true }); 
    const newToken = await this.clerk.session.getToken({ forceRefresh: true });
    // Example: storing it, though Clerk usually handles this transparently.
    // localStorage.setItem('auth_token_custom', newToken); 
    console.log("Token force-refreshed internally by TokenManager.");
    return newToken;
  }
  
  // Ensures only one refresh operation happens at a time if called concurrently
  async refreshToken() {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    this.refreshPromise = this.refreshTokenInternal().finally(() => {
      this.refreshPromise = null; // Clear promise once settled
    });
    return this.refreshPromise;
  }

  async getToken() {
    try {
      let token = localStorage.getItem('auth_token_custom'); // Example: retrieving from storage
      // Clerk's session.getToken() should internally manage validity.
      // Manual storage and check is usually not needed with Clerk's main SDKs.
      if (!this.clerk.session) {
        throw new AuthSpecificError("No active session.", "NO_SESSION");
      }
      return this.clerk.session.getToken();
    } catch (error) {
      console.error('Failed to get token:', error.message);
      throw error; // Re-throw
    }
  }
}

// Define AuthSpecificError as shown previously
// class AuthSpecificError extends Error { /* ... */ }
```

### Comprehensive Auth Error Handling
*(This refers to the error handling specific to authentication)*
```javascript
// Custom Error class for Auth specific issues
class AuthSpecificError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'AuthSpecificError';
    this.code = code; // e.g., 'TOKEN_EXPIRED', 'INVALID_CREDENTIALS'
    this.details = details;
  }
}

// Function to handle different auth errors (conceptual)
function handleGlobalAuthenticationError(error, clerkInstance, navigationInstance) {
  // clerkInstance would be your Clerk frontend SDK instance (e.g., from useClerk())
  // navigationInstance would be your router's navigation object (e.g., from useNavigate())

  if (error instanceof AuthSpecificError) {
    switch (error.code) {
      case 'TOKEN_EXPIRED': // This code might come from your API if it specifically detects it
      case 'SESSION_INVALIDATED': 
      case 'UNAUTHORIZED': // General unauthorized from API
      case 'NO_SESSION': // Custom code from AuthManager example
        console.warn(`Authentication error: ${error.message} (Code: ${error.code}). Redirecting to sign-in.`);
        // clerkInstance?.signOut(); // Sign out from Clerk
        // navigationInstance?.navigate('/sign-in'); // Redirect to your app's sign-in page
        alert(`Session issue: ${error.message}. Please sign in again.`); // Simple alert
        break;
      default:
        console.error('Unhandled AuthSpecificError:', error);
        alert(`An authentication error occurred: ${error.message}`);
        break;
    }
  } else if (error.response?.status === 401) { // Fallback for generic 401
     console.warn(`Generic 401 error. Redirecting to sign-in.`);
     alert(`Your session may have expired. Please sign in again.`);
    // clerkInstance?.signOut();
    // navigationInstance?.navigate('/sign-in');
  } else {
    console.error('Non-auth error passed to auth error handler (or unhandled API error):', error);
    // Potentially show a generic error message
  }
}

// Example usage within a fetch wrapper or API client
// async function apiClient(endpoint, options, authContext) { 
//   try {
//     // ... perform fetch using authContext.getToken() ...
//     // ... handle API success/error parsing ...
//   } catch (error) {
//     handleGlobalAuthenticationError(error, authContext.clerk, authContext.navigate);
//     throw error; // Re-throw to allow component-level error handling too
//   }
// }

// Define AuthSpecificError and APIError as shown earlier
// class APIError extends Error { /* ... */ }
// class AuthSpecificError extends APIError { /* ... */ }
```

## Habit Management Examples

*(Extracted from `docs/api/examples/habit-management.md`)*
*(Assuming API_BASE_URL and getToken() are defined as in Common Setup)*

### Creating a Basic Habit

```javascript
async function createNewHabit(habitPayload) {
  // habitPayload should match the schema in API_REFERENCE.md for POST /habits.
  // Example:
  // const habitPayload = {
  //   name: "Read for 30 minutes",
  //   icon: "📚",
  //   frequency: { type: "daily" }, // Ensure this matches the 'frequency' object schema
  //   startDate: "2024-06-01"
  //   // endDate is optional
  // };
  try {
    const createdHabit = await makeApiCall('/habits', { // Endpoint confirmed from API_REFERENCE.md
      method: 'POST',
      body: JSON.stringify(habitPayload), // Payload matches API_REFERENCE.md
    });
    console.log('Habit created:', createdHabit); // `createdHabit` is the `data` part of the response
    return createdHabit;
  } catch (error) {
    // error is already logged by makeApiCall. Caller can handle specific error codes.
    // if (error.code === 'VALIDATION_ERROR') { /* handle validation details provided in error.details */ }
    throw error;
  }
}

// Example Usage:
// const newHabitData = {
//   name: "Morning Run",
//   icon: "🏃",
//   frequency: { type: "weekly", days: [1, 3, 5] }, // Example: Monday, Wednesday, Friday
//   startDate: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
// };
// createNewHabit(newHabitData)
//   .then(habit => console.log('Successfully created habit:', habit))
//   .catch(err => console.error("Create habit failed in component:", err.message));
```

### Creating a Habit with Custom Schedule
*The API `POST /habits` supports `name`, `icon`, `frequency` (JSON object), `startDate`, and `endDate`. If "custom schedule" implies more detailed timing than what the `frequency` object supports (e.g., specific times of day for reminders, which are not part of the current schema), this example is speculative for those extra details.*

```javascript
// This example uses the defined 'frequency' object for scheduling.
// If 'custom schedule' means something beyond the 'frequency' object,
// the API would need to be extended.
async function createHabitWithFrequency(habitData) {
  // habitData = {
  //   name: "Yoga Practice",
  //   icon: "🧘",
  //   frequency: { type: "custom", interval_days: 2, start_date_offset_days: 0 }, // e.g., every 2 days
  //   startDate: "2024-06-01"
  // }
  try {
    const createdHabit = await makeApiCall('/habits', {
      method: 'POST',
      body: JSON.stringify(habitData),
    });
    console.log('Habit with custom frequency created:', createdHabit);
    return createdHabit;
  } catch (error) {
    throw error;
  }
}
```

### Retrieving All Habits

```javascript
async function fetchAllHabits(date, timeZone) { 
  // date (YYYY-MM-DD) and timeZone (IANA) are optional query parameters
  // as per GET /habits in API_REFERENCE.md
  try {
    let endpoint = '/habits';
    const queryParams = new URLSearchParams();
    if (date) queryParams.append('date', date);
    if (timeZone) queryParams.append('timeZone', timeZone);

    const queryString = queryParams.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    const habits = await makeApiCall(endpoint); // `makeApiCall` returns the `data` field directly
    console.log('Fetched habits:', habits); // `habits` is the array of habit objects
    return habits;
  } catch (error) {
    throw error;
  }
}
```

### Retrieving a Specific Habit
```javascript
async function fetchHabitById(habitId) {
  // API_REFERENCE.md confirms GET /habits/:habitId
  try {
    const habit = await makeApiCall(`/habits/${habitId}`);
    console.log(`Details for habit ${habitId}:`, habit);
    return habit;
  } catch (error) {
    throw error;
  }
}
```

### Updating a Habit (Basic)

```javascript
async function updateExistingHabit(habitId, updates) { 
  // updates is an object like { name: "New Habit Name", icon: "🚀", frequency: {type: "daily"} }
  // Ensure 'updates' payload matches the schema in API_REFERENCE.md for PUT /habits/:habitId
  try {
    const updatedHabit = await makeApiCall(`/habits/${habitId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    console.log(`Habit ${habitId} updated:`, updatedHabit);
    return updatedHabit;
  } catch (error) {
    throw error;
  }
}
```

### Updating Habit Schedule
*This is covered by updating the `frequency` field in the `updateExistingHabit` example above.*

### Deleting a Habit

```javascript
async function removeHabit(habitId) {
  try {
    const result = await makeApiCall(`/habits/${habitId}`, {
      method: 'DELETE',
    });
    // API_REFERENCE.md: { success: true, data: { message: "Habit deleted successfully" } }
    console.log(`Habit ${habitId} deletion result:`, result.message); 
    return result; // Contains the message
  } catch (error) {
    throw error;
  }
}
```

### Creating Multiple Habits (Batch)
*API does not have a dedicated batch endpoint. Simulate with sequential calls using the updated `createNewHabit`.*
```javascript
async function createMultipleNewHabits(habitsPayloadArray) {
  const results = { successful: [], failed: [] };
  for (const payload of habitsPayloadArray) {
    try {
      const createdHabit = await createNewHabit(payload); 
      results.successful.push(createdHabit);
    } catch (error) {
      results.failed.push({ habitPayload: payload, error: error.responseData || error.message });
    }
  }
  console.log('Batch habit creation results:', results);
  return results;
}
```

### Updating Multiple Habits (Batch)
*Simulate with sequential calls using `updateExistingHabit`.*
```javascript
async function updateMultipleExistingHabits(updatesMap) { 
  // updatesMap = { "habitId1": { name: "New Name" }, "habitId2": { icon: "💡" } }
  const results = { successful: [], failed: [] };
  for (const [habitId, updateData] of Object.entries(updatesMap)) {
    try {
      const updatedHabit = await updateExistingHabit(habitId, updateData); 
      results.successful.push(updatedHabit);
    } catch (error) {
      results.failed.push({ habitId, updateData, error: error.responseData || error.message });
    }
  }
  console.log('Batch habit update results:', results);
  return results;
}
```

## Habit Tracking Examples

*(Endpoints used: `POST /habits/:habitId/trackers`, `GET /habits/:habitId/trackers`)*

### Recording Habit Completion (Toggling Tracker)
```javascript
async function toggleHabitTracker(habitId, date, timeZone, notes = "") {
  // date should be "YYYY-MM-DD"
  // timeZone is IANA, e.g., "America/New_York"
  // notes is optional
  try {
    const trackerInteractionResult = await makeApiCall(`/habits/${habitId}/trackers`, { // Endpoint confirmed
      method: 'POST',
      body: JSON.stringify({ // Payload matches API_REFERENCE.md
        date,
        timeZone,
        notes,
      }),
    });
    // Expected Response: { success: true, data: { action: "created" | "deleted", tracker: { ... } | null } }
    console.log(`Habit ${habitId} tracker for ${date} processed:`, trackerInteractionResult);
    return trackerInteractionResult; // This is the `data` part of the response
  } catch (error) {
    throw error;
  }
}
```

### Recording Habit Completion with Notes
*(Covered by the `notes` parameter in `toggleHabitTracker` function above.)*

### Retrieving Tracking History for a Habit

```javascript
async function fetchHabitTrackingHistory(habitId, startDate, endDate) {
  // startDate, endDate are optional, format "YYYY-MM-DD"
  try {
    let endpoint = `/habits/${habitId}/trackers`; // Endpoint confirmed
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const queryString = queryParams.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }
    const trackers = await makeApiCall(endpoint); // Expects an array of tracker objects
    console.log(`Tracking history for habit ${habitId}:`, trackers);
    return trackers;
  } catch (error) {
    throw error;
  }
}
```

### Retrieving Tracking Status for Multiple Habits
*API does not have a direct endpoint. Requires multiple calls to `GET /habits` with date filter.*
```javascript
async function getHabitsCompletionStatusForDate(habitIds, date, timeZone) {
  // date is "YYYY-MM-DD", timeZone is IANA
  const results = {};
  try {
    const activeHabitsOnDate = await fetchAllHabits(date, timeZone); // Uses the updated fetchAllHabits
    
    for (const habitId of habitIds) {
      const targetHabit = activeHabitsOnDate.find(h => h.id.toString() === habitId.toString());
      if (targetHabit) {
        // 'completed_on_date' field from GET /habits response indicates if tracked for the queried date
        results[habitId] = targetHabit.completed_on_date; 
      } else {
        results[habitId] = false; // Habit not active or not found for that date
      }
    }
    console.log(`Completion status for habits on ${date}:`, results);
    return results;
  } catch(error) {
    console.error("Error fetching multiple habit statuses:", error.message);
    throw error;
  }
}
```

### Updating a Tracking Entry
*The `POST /habits/:habitId/trackers` endpoint handles this. If a tracker for the date exists, providing new notes should update them.*
```javascript
async function updateTrackerNotes(habitId, date, timeZone, newNotes) {
  // date: "YYYY-MM-DD"
  try {
    const result = await makeApiCall(`/habits/${habitId}/trackers`, {
      method: 'POST', 
      body: JSON.stringify({
        date, 
        timeZone,  
        notes: newNotes,
      }),
    });
    // Expected: result.action might be 'updated' or 'created' if it also creates
    console.log(`Tracker notes for habit ${habitId} on ${date} updated/created:`, result);
    return result;
  } catch (error) {
    throw error;
  }
}
```

### Batch Updating Tracking Entries
*No dedicated API endpoint. Simulate with multiple calls to `toggleHabitTracker` or `updateTrackerNotes`.*

### Deleting a Tracking Entry
*Call `POST /habits/:habitId/trackers` again for the same date; the API logic should remove the tracker if it exists.*
```javascript
async function deleteHabitTrackerForDate(habitId, date, timeZone) {
  try {
    const result = await makeApiCall(`/habits/${habitId}/trackers`, {
      method: 'POST',
      body: JSON.stringify({
        date, 
        timeZone,
        // notes: "" // API might ignore notes if it's purely a toggle based on date+habitId
      }),
    });
    // Expected: result.action === "deleted"
    console.log(`Tracker for habit ${habitId} on ${date} removed:`, result);
    return result;
  } catch (error) {
    throw error;
  }
}
```

## Statistics Examples

*(Mapped to `GET /progress/overview` and `GET /habits/:habitId` as primary sources based on current `API_REFERENCE.md`)*

### Getting Overall Progress Overview
```javascript
async function fetchProgressOverview(startDate, endDate, timeZone) { 
  // startDate, endDate (YYYY-MM-DD) are optional filters for history part of the response
  // timeZone (IANA) is required by the endpoint as per API_REFERENCE.md
  try {
    const queryParams = new URLSearchParams({ timeZone }); // timeZone is required
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    
    const overviewData = await makeApiCall(`/progress/overview?${queryParams.toString()}`);
    // overviewData = { history: [...], current_streak, longest_streak }
    console.log('Progress Overview:', overviewData);
    return overviewData;
  } catch (error) {
    throw error;
  }
}
```

### Getting Habit-Specific Statistics
*This uses `GET /habits/:habitId` which should return the habit object containing its statistics fields.*
```javascript
async function fetchDetailedHabitStats(habitId) { 
  try {
    const habitDetails = await makeApiCall(`/habits/${habitId}`); 
    // The habitDetails object should contain:
    // id, name, icon, frequency, startDate, endDate,
    // streak, longest_streak, total_completions, last_completed, created_at, updated_at
    console.log(`Statistics for habit ${habitId}:`, {
        streak: habitDetails.streak,
        longest_streak: habitDetails.longest_streak,
        total_completions: habitDetails.total_completions,
        last_completed: habitDetails.last_completed
    });
    return habitDetails; 
  } catch (error) {
    throw error;
  }
}
```

### Getting Weekly Statistics (with Chart.js)
*Client-side aggregation based on the `history` array from `GET /progress/overview`.*
```javascript
// Client-side aggregation example using data from fetchProgressOverview
async function getWeeklyStatsForChart(startDate, endDate, timeZone) {
  const progressData = await fetchProgressOverview(startDate, endDate, timeZone);
  const history = progressData.history; // Array of {date, completion_rate}

  const weeklyAggregates = {}; // Key: "YYYY-Www", Value: { rates: [], count: 0, sum: 0, weekDisplay: "YYYY-Www" }

  history.forEach(item => {
    const d = new Date(item.date + "T00:00:00Z"); // Ensure date is UTC for consistent week calculation
    const year = d.getUTCFullYear();
    // ISO 8601 week number calculation logic (can be complex, consider a library for robustness)
    const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
    const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + 1 + firstDayOfYear.getUTCDay()) / 7);
    const weekKey = `${year}-W${String(weekNumber).padStart(2, '0')}`;

    if (!weeklyAggregates[weekKey]) {
      weeklyAggregates[weekKey] = { rates: [], count: 0, sum: 0, weekDisplay: weekKey };
    }
    weeklyAggregates[weekKey].rates.push(item.completion_rate); // Field name from API_REFERENCE
    weeklyAggregates[weekKey].sum += item.completion_rate;
    weeklyAggregates[weekKey].count++;
  });

  const chartData = Object.values(weeklyAggregates).map(week => ({
    week: week.weekDisplay,
    completionRate: week.count > 0 ? (week.sum / week.count) * 100 : 0, // Convert to percentage (0-100)
  })).sort((a,b) => a.week.localeCompare(b.week));

  console.log("Client-side Weekly Stats for Chart:", chartData);
  return chartData;
  // Then use this data with Chart.js
}
```

### Getting Monthly Statistics (with Chart.js)
*Client-side aggregation based on `GET /progress/overview` history.*
```javascript
// Client-side aggregation example
async function getMonthlyStatsForChart(year, timeZone) {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const progressData = await fetchProgressOverview(startDate, endDate, timeZone);
  const history = progressData.history; // Array of {date, completion_rate}

  const monthlyAggregates = {}; // Key: "YYYY-MM", Value: { rates: [], count: 0, sum: 0, monthDisplay: "Mon" }
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  history.forEach(item => {
    const d = new Date(item.date + "T00:00:00Z"); // Parse as UTC
    const monthKey = item.date.substring(0, 7); // "YYYY-MM"
    
    if (!monthlyAggregates[monthKey]) {
      monthlyAggregates[monthKey] = { rates: [], count: 0, sum: 0, monthDisplay: monthNames[d.getUTCMonth()] };
    }
    monthlyAggregates[monthKey].rates.push(item.completion_rate); // Field name from API
    monthlyAggregates[monthKey].sum += item.completion_rate;
    monthlyAggregates[monthKey].count++;
  });
  
  const chartData = Object.keys(monthlyAggregates).sort().map(monthKey => ({
      month: monthlyAggregates[monthKey].monthDisplay,
      completionRate: monthlyAggregates[monthKey].count > 0 ? (monthlyAggregates[monthKey].sum / monthlyAggregates[monthKey].count) * 100 : 0, // Percentage
  }));

  console.log(`Client-side Monthly Stats for ${year}:`, chartData);
  return chartData;
  // Then use this data with Chart.js
}
```

### Comparing Habits (with Chart.js)
*Fetch details for each habit (which includes stats like streak, longest_streak, total_completions) using `GET /habits/:habitId`.*
```javascript
async function compareMultipleHabits(habitIds) {
  const comparisonData = [];
  for (const habitId of habitIds) {
    try {
      const habitDetails = await fetchHabitById(habitId); // Uses GET /habits/:habitId
      if (habitDetails) {
        comparisonData.push({
          habitId: habitDetails.id,
          habitName: habitDetails.name,
          currentStreak: habitDetails.streak || 0,
          longestStreak: habitDetails.longest_streak || 0, // Field name from API_REFERENCE
          totalCompletions: habitDetails.total_completions || 0, // Field name from API_REFERENCE
        });
      }
    } catch (error) {
      console.error(`Could not fetch details for habit ${habitId} for comparison:`, error.message);
    }
  }
  console.log("Habit Comparison Data:", comparisonData);
  return comparisonData;
  // Then use this data with Chart.js (e.g., a Radar chart)
}
```

## Error Handling Examples (General)
