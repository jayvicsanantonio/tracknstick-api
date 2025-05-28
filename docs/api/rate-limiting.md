# Rate Limiting

This document describes the rate limiting implementation in the TracknStick API.

## Overview

The TracknStick API implements rate limiting to prevent abuse and ensure fair usage of the service. Rate limiting is applied to all endpoints and is based on the client's IP address.

## Configuration

Rate limiting is configured using environment variables:

```env
# Rate limiting window in milliseconds (default: 15 minutes)
RATE_LIMIT_WINDOW_MS=900000

# Maximum number of requests per window (default: 100)
RATE_LIMIT_MAX_REQUESTS=100
```

## Implementation

The API uses the `express-rate-limit` middleware to implement rate limiting:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 900000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    data: null,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply to all routes
app.use(limiter);
```

## Rate Limit Headers

The API includes rate limit information in the response headers:

```
RateLimit-Limit: 100
RateLimit-Remaining: 99
RateLimit-Reset: 1616342400
```

- `RateLimit-Limit`: The maximum number of requests allowed per window
- `RateLimit-Remaining`: The number of requests remaining in the current window
- `RateLimit-Reset`: The time at which the current rate limit window resets (Unix timestamp)

## Error Response

When the rate limit is exceeded, the API returns a 429 Too Many Requests response:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later"
  }
}
```

## Best Practices

### For API Users

1. **Handle Rate Limits**

   - Monitor the `RateLimit-Remaining` header
   - Implement exponential backoff when limits are reached
   - Cache responses when appropriate
   - Batch requests when possible

2. **Optimize Requests**
   - Use pagination for large data sets
   - Request only needed data
   - Use appropriate HTTP methods
   - Implement client-side caching

### For Developers

1. **Testing**

   - Test rate limit behavior
   - Verify header information
   - Test error responses
   - Monitor rate limit effectiveness

2. **Monitoring**
   - Track rate limit hits
   - Monitor abuse patterns
   - Adjust limits as needed
   - Log rate limit events

## Customization

### Different Limits for Different Routes

You can apply different rate limits to different routes:

```javascript
// Stricter limit for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
});

// Higher limit for public routes
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
});

app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/public', publicLimiter);
```

### Custom Rate Limit Keys

You can customize how rate limits are tracked:

```javascript
const limiter = rateLimit({
  // ... other options ...
  keyGenerator: (req) => {
    // Use user ID instead of IP if authenticated
    return req.auth?.userId || req.ip;
  },
});
```

## Production Considerations

1. **Scaling**

   - Use a distributed rate limiter in production
   - Consider using Redis for rate limit storage
   - Implement proper error handling
   - Monitor rate limit effectiveness

2. **Security**

   - Protect against IP spoofing
   - Consider using API keys for higher limits
   - Implement proper logging
   - Regular security audits

3. **Performance**
   - Optimize rate limit checks
   - Use appropriate storage backend
   - Monitor memory usage
   - Regular performance testing

## Troubleshooting

### Common Issues

1. **Rate Limit Too Strict**

   - Adjust the window size
   - Increase the request limit
   - Implement different limits for different routes
   - Consider using API keys

2. **Rate Limit Not Working**

   - Check middleware order
   - Verify environment variables
   - Check for proxy configuration
   - Monitor rate limit headers

3. **False Positives**
   - Check for shared IP addresses
   - Verify client implementation
   - Monitor rate limit logs
   - Adjust limits if needed

Last Updated: 2024-03-21
