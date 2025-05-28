# Error Handling Examples

This document provides practical examples of how to handle various error scenarios when using the TracknStick API.

## Common Error Types

### API Error Class

```javascript
class APIError extends Error {
  constructor(message, code, status, details = {}) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static fromResponse(response, data) {
    return new APIError(
      data.error?.message || 'An error occurred',
      data.error?.code || 'UNKNOWN_ERROR',
      response.status,
      data.error?.details || {}
    );
  }
}

// Usage
async function handleApiError(response) {
  const data = await response.json();
  throw APIError.fromResponse(response, data);
}
```

## Authentication Errors

### Handling Authentication Failures

```javascript
class AuthError extends APIError {
  constructor(message, code, status, details = {}) {
    super(message, code, status, details);
    this.name = 'AuthError';
  }

  static isAuthError(error) {
    return error instanceof AuthError || error.status === 401;
  }
}

// Usage in React component
function useAuthErrorHandler() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleAuthError = useCallback(
    async (error) => {
      if (AuthError.isAuthError(error)) {
        // Clear any stored tokens
        localStorage.removeItem('auth_token');

        // Show error message
        toast.error('Your session has expired. Please sign in again.');

        // Sign out and redirect to login
        await signOut();
        navigate('/login');
      }
    },
    [signOut, navigate]
  );

  return handleAuthError;
}

// Usage in API call
async function makeAuthenticatedRequest(url, options = {}) {
  try {
    const token = await getToken();
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthError(
          'Authentication failed',
          'AUTH_FAILED',
          response.status
        );
      }
      throw await APIError.fromResponse(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new APIError('Request failed', 'REQUEST_FAILED', 500, {
      originalError: error,
    });
  }
}
```

## Rate Limiting Errors

### Handling Rate Limits

```javascript
class RateLimitError extends APIError {
  constructor(message, retryAfter) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.retryAfter = retryAfter;
  }

  static fromResponse(response) {
    const retryAfter = response.headers.get('Retry-After');
    return new RateLimitError(
      'Too many requests. Please try again later.',
      parseInt(retryAfter, 10)
    );
  }
}

// Usage in API client
class APIClient {
  constructor() {
    this.retryQueue = [];
    this.isProcessingQueue = false;
  }

  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const error = RateLimitError.fromResponse(response);
        return this.handleRateLimit(error);
      }

      if (!response.ok) {
        throw await APIError.fromResponse(response);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      throw new APIError('Request failed', 'REQUEST_FAILED', 500, {
        originalError: error,
      });
    }
  }

  async handleRateLimit(error) {
    return new Promise((resolve, reject) => {
      this.retryQueue.push({
        url,
        options,
        resolve,
        reject,
        retryAfter: error.retryAfter,
      });

      if (!this.isProcessingQueue) {
        this.processRetryQueue();
      }
    });
  }

  async processRetryQueue() {
    if (this.retryQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }

    this.isProcessingQueue = true;
    const { url, options, resolve, reject, retryAfter } = this.retryQueue[0];

    try {
      // Wait for the retry period
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));

      // Retry the request
      const result = await this.makeRequest(url, options);
      resolve(result);
    } catch (error) {
      reject(error);
    }

    // Remove the processed request and continue with the queue
    this.retryQueue.shift();
    this.processRetryQueue();
  }
}

// Usage in React component
function useRateLimitedRequest() {
  const apiClient = useMemo(() => new APIClient(), []);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(null);

  const makeRequest = useCallback(
    async (url, options = {}) => {
      try {
        setIsRateLimited(false);
        setRetryAfter(null);
        return await apiClient.makeRequest(url, options);
      } catch (error) {
        if (error instanceof RateLimitError) {
          setIsRateLimited(true);
          setRetryAfter(error.retryAfter);
          toast.warning(
            `Rate limit exceeded. Retrying in ${error.retryAfter} seconds.`
          );
        }
        throw error;
      }
    },
    [apiClient]
  );

  return {
    makeRequest,
    isRateLimited,
    retryAfter,
  };
}
```

## Validation Errors

### Handling Input Validation

```javascript
class ValidationError extends APIError {
  constructor(message, fields) {
    super(message, 'VALIDATION_ERROR', 400);
    this.fields = fields;
  }

  static fromResponse(response, data) {
    return new ValidationError(
      'Validation failed',
      data.error?.details?.fields || {}
    );
  }
}

// Usage in form handling
function useFormValidation() {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateAndSubmit = async (formData, submitFn) => {
    setIsSubmitting(true);
    setErrors({});

    try {
      await submitFn(formData);
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors(error.fields);
        return false;
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }

    return true;
  };

  return {
    errors,
    isSubmitting,
    validateAndSubmit,
  };
}

// Usage in React component
function HabitForm() {
  const { errors, isSubmitting, validateAndSubmit } = useFormValidation();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequency: 'daily',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const success = await validateAndSubmit(formData, async (data) => {
      const response = await fetch('http://localhost:3000/api/v1/habits', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400) {
          throw ValidationError.fromResponse(response, errorData);
        }
        throw await APIError.fromResponse(response, errorData);
      }

      return response.json();
    });

    if (success) {
      toast.success('Habit created successfully!');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Habit Name</label>
        <input
          id="name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>
      {/* Other form fields */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Habit'}
      </button>
    </form>
  );
}
```

## Network Errors

### Handling Network Issues

```javascript
class NetworkError extends APIError {
  constructor(message, originalError) {
    super(message, 'NETWORK_ERROR', 0);
    this.originalError = originalError;
  }

  static isNetworkError(error) {
    return (
      error instanceof NetworkError ||
      error.name === 'TypeError' ||
      !navigator.onLine
    );
  }
}

// Usage in API client with retry logic
class ResilientAPIClient {
  constructor(maxRetries = 3, retryDelay = 1000) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  async makeRequest(url, options = {}, retryCount = 0) {
    try {
      if (!navigator.onLine) {
        throw new NetworkError('No internet connection');
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        throw await APIError.fromResponse(response);
      }

      return await response.json();
    } catch (error) {
      if (NetworkError.isNetworkError(error)) {
        if (retryCount < this.maxRetries) {
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, retryCount);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.makeRequest(url, options, retryCount + 1);
        }
        throw new NetworkError('Network request failed after retries', error);
      }
      throw error;
    }
  }
}

// Usage in React component
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastError, setLastError] = useState(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastError(null);
      toast.success('Back online!');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastError(new NetworkError('No internet connection'));
      toast.error('You are offline. Some features may be unavailable.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    lastError,
  };
}

// Usage in component
function NetworkAwareComponent() {
  const { isOnline, lastError } = useNetworkStatus();
  const apiClient = useMemo(() => new ResilientAPIClient(), []);

  const fetchData = async () => {
    try {
      if (!isOnline) {
        throw new NetworkError('No internet connection');
      }

      const data = await apiClient.makeRequest(
        'http://localhost:3000/api/v1/habits'
      );
      return data;
    } catch (error) {
      if (error instanceof NetworkError) {
        toast.error('Network error. Please check your connection.');
      }
      throw error;
    }
  };

  return (
    <div>
      {!isOnline && (
        <div className="offline-banner">
          You are currently offline. Changes will be synced when you're back
          online.
        </div>
      )}
      {/* Component content */}
    </div>
  );
}
```

## Global Error Handler

### Implementing a Global Error Handler

```javascript
// Error handler middleware
function errorHandler(error, req, res, next) {
  console.error('Error:', error);

  if (error instanceof APIError) {
    return res.status(error.status).json({
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
      },
    });
  }

  // Handle unknown errors
  return res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
  });
}

// Usage in React application
function ErrorBoundary({ children }) {
  const [error, setError] = useState(null);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    const handleError = (error) => {
      console.error('Unhandled error:', error);
      setError(error);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  if (error) {
    return (
      <div className="error-boundary">
        <h2>Something went wrong</h2>
        {error instanceof NetworkError && !isOnline ? (
          <p>Please check your internet connection and try again.</p>
        ) : error instanceof AuthError ? (
          <p>Your session has expired. Please sign in again.</p>
        ) : error instanceof RateLimitError ? (
          <p>Too many requests. Please try again later.</p>
        ) : (
          <p>An unexpected error occurred. Please try again.</p>
        )}
        <button onClick={() => window.location.reload()}>Refresh Page</button>
      </div>
    );
  }

  return children;
}

// Usage in app
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>{/* Your routes */}</Routes>
      </Router>
    </ErrorBoundary>
  );
}
```

Last Updated: 2024-03-21
