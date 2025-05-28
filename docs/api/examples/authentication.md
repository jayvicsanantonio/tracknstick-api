# Authentication Examples

This document provides practical examples of how to handle authentication with the TracknStick API.

## Getting a Session Token

### Using Clerk React SDK

```javascript
import { useAuth } from '@clerk/clerk-react';

function HabitTracker() {
  const { getToken } = useAuth();

  const fetchHabits = async () => {
    try {
      const token = await getToken();
      const response = await fetch('http://localhost:3000/api/v1/habits', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch habits');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching habits:', error);
      throw error;
    }
  };

  return (
    // Component JSX
  );
}
```

### Using Clerk JavaScript SDK

```javascript
import { Clerk } from '@clerk/clerk-js';

const clerk = new Clerk('your_publishable_key');

async function initializeClerk() {
  await clerk.load();

  if (clerk.session) {
    const token = await clerk.session.getToken();
    return token;
  } else {
    throw new Error('No active session');
  }
}

// Usage
async function makeAuthenticatedRequest() {
  try {
    const token = await initializeClerk();
    const response = await fetch('http://localhost:3000/api/v1/habits', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}
```

## Handling Token Expiration

### Automatic Token Refresh

```javascript
import { useAuth } from '@clerk/clerk-react';

function useAuthenticatedFetch() {
  const { getToken } = useAuth();

  const authenticatedFetch = async (url, options = {}) => {
    try {
      // Get a fresh token for each request
      const token = await getToken();

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Handle token expiration
      if (response.status === 401) {
        // Token is expired, Clerk will automatically refresh it
        const newToken = await getToken({ forceRefresh: true });

        // Retry the request with the new token
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          }
        });
      }

      return response;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  };

  return authenticatedFetch;
}

// Usage
function HabitList() {
  const authenticatedFetch = useAuthenticatedFetch();

  const fetchHabits = async () => {
    try {
      const response = await authenticatedFetch('http://localhost:3000/api/v1/habits');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch habits:', error);
      throw error;
    }
  };

  return (
    // Component JSX
  );
}
```

### Manual Token Refresh

```javascript
import { Clerk } from '@clerk/clerk-js';

class AuthManager {
  constructor() {
    this.clerk = new Clerk('your_publishable_key');
    this.token = null;
    this.tokenExpiry = null;
  }

  async initialize() {
    await this.clerk.load();
    await this.refreshToken();
  }

  async refreshToken() {
    if (this.clerk.session) {
      this.token = await this.clerk.session.getToken();
      // Set token expiry (e.g., 1 hour from now)
      this.tokenExpiry = Date.now() + 3600000;
    } else {
      throw new Error('No active session');
    }
  }

  async getValidToken() {
    // Refresh token if expired or about to expire (within 5 minutes)
    if (!this.token || Date.now() > this.tokenExpiry - 300000) {
      await this.refreshToken();
    }
    return this.token;
  }

  async makeRequest(url, options = {}) {
    try {
      const token = await this.getValidToken();
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        // Force token refresh and retry
        await this.refreshToken();
        return this.makeRequest(url, options);
      }

      return response;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }
}

// Usage
const authManager = new AuthManager();

async function initializeApp() {
  try {
    await authManager.initialize();

    // Now you can make authenticated requests
    const response = await authManager.makeRequest(
      'http://localhost:3000/api/v1/habits'
    );
    const data = await response.json();
    console.log('Habits:', data);
  } catch (error) {
    console.error('Initialization failed:', error);
  }
}
```

## Refreshing Tokens

### Using Clerk's Built-in Refresh

```javascript
import { useAuth } from '@clerk/clerk-react';

function useTokenRefresh() {
  const { getToken } = useAuth();

  const refreshToken = async () => {
    try {
      // Force a token refresh
      const newToken = await getToken({ forceRefresh: true });
      return newToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  };

  return refreshToken;
}

// Usage in a component
function SecureComponent() {
  const refreshToken = useTokenRefresh();

  const handleTokenRefresh = async () => {
    try {
      const newToken = await refreshToken();
      console.log('Token refreshed successfully');
      // Update your application state or storage with the new token
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // Handle the error (e.g., redirect to login)
    }
  };

  return <button onClick={handleTokenRefresh}>Refresh Token</button>;
}
```

### Custom Refresh Logic

```javascript
import { Clerk } from '@clerk/clerk-js';

class TokenManager {
  constructor() {
    this.clerk = new Clerk('your_publishable_key');
    this.refreshPromise = null;
  }

  async initialize() {
    await this.clerk.load();
  }

  async refreshToken() {
    // If a refresh is already in progress, return that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start a new refresh
    this.refreshPromise = (async () => {
      try {
        if (!this.clerk.session) {
          throw new Error('No active session');
        }

        // Force a new token
        const newToken = await this.clerk.session.getToken({
          forceRefresh: true,
        });

        // Update any stored token
        localStorage.setItem('auth_token', newToken);

        return newToken;
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Clear stored token on failure
        localStorage.removeItem('auth_token');
        throw error;
      } finally {
        // Clear the refresh promise
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async getToken() {
    try {
      // Try to get a token from storage
      let token = localStorage.getItem('auth_token');

      if (!token) {
        // If no token in storage, get a new one
        token = await this.refreshToken();
      }

      return token;
    } catch (error) {
      console.error('Failed to get token:', error);
      throw error;
    }
  }
}

// Usage
const tokenManager = new TokenManager();

async function setupAuth() {
  try {
    await tokenManager.initialize();

    // Set up an interval to refresh the token before it expires
    setInterval(
      async () => {
        try {
          await tokenManager.refreshToken();
          console.log('Token refreshed successfully');
        } catch (error) {
          console.error('Scheduled token refresh failed:', error);
        }
      },
      45 * 60 * 1000
    ); // Refresh every 45 minutes

    // Make an authenticated request
    const token = await tokenManager.getToken();
    const response = await fetch('http://localhost:3000/api/v1/habits', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Habits:', data);
  } catch (error) {
    console.error('Auth setup failed:', error);
  }
}
```

## Error Handling

### Comprehensive Error Handler

```javascript
class AuthError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.details = details;
  }
}

function handleAuthError(error) {
  if (error instanceof AuthError) {
    switch (error.code) {
      case 'TOKEN_EXPIRED':
        // Handle token expiration
        return refreshToken();

      case 'INVALID_TOKEN':
        // Handle invalid token
        return redirectToLogin();

      case 'UNAUTHORIZED':
        // Handle unauthorized access
        return showUnauthorizedMessage();

      default:
        // Handle other auth errors
        console.error('Auth error:', error);
        return showErrorMessage(error.message);
    }
  }

  // Handle non-auth errors
  console.error('Unexpected error:', error);
  return showErrorMessage('An unexpected error occurred');
}

// Usage in a component
function SecureComponent() {
  const { getToken } = useAuth();

  const makeSecureRequest = async () => {
    try {
      const token = await getToken();
      const response = await fetch('http://localhost:3000/api/v1/habits', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new AuthError(
          data.error.message,
          data.error.code,
          data.error.details
        );
      }

      return await response.json();
    } catch (error) {
      return handleAuthError(error);
    }
  };

  return (
    // Component JSX
  );
}
```

Last Updated: 2024-03-21
