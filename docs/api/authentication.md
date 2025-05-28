# Authentication

This document describes the authentication system used in the TracknStick API.

## Overview

The TracknStick API uses [Clerk](https://clerk.dev/) for authentication and user management. Clerk provides JWT-based authentication that is secure, scalable, and easy to integrate.

## Authentication Flow

1. **User Authentication**

   - Users authenticate through your Clerk frontend application
   - Clerk handles the authentication process and user management
   - Upon successful authentication, Clerk provides a JWT session token

2. **API Authentication**
   - Include the JWT token in the `Authorization` header of all API requests
   - The API validates the token using Clerk's middleware
   - If valid, the request proceeds; if invalid, a 401 error is returned

## Implementation

### Frontend Integration

1. **Install Clerk SDK**

   ```bash
   npm install @clerk/clerk-react
   ```

2. **Initialize Clerk**

   ```javascript
   import { ClerkProvider } from '@clerk/clerk-react';

   const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

   function App() {
     return (
       <ClerkProvider publishableKey={clerkPubKey}>
         <YourApp />
       </ClerkProvider>
     );
   }
   ```

3. **Get Session Token**

   ```javascript
   import { useAuth } from '@clerk/clerk-react';

   function YourComponent() {
     const { getToken } = useAuth();

     const makeApiCall = async () => {
       const token = await getToken();
       // Include token in API requests
       const response = await fetch('/api/v1/habits', {
         headers: {
           Authorization: `Bearer ${token}`,
         },
       });
     };
   }
   ```

### Backend Integration

1. **Install Clerk Middleware**

   ```bash
   npm install @clerk/express
   ```

2. **Configure Environment Variables**

   ```env
   CLERK_SECRET_KEY=sk_test_your_secret_key
   CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
   ```

3. **Use Clerk Middleware**

   ```javascript
   const { clerkMiddleware } = require('@clerk/express');

   // Apply to all routes
   app.use(clerkMiddleware());

   // Or apply to specific routes
   router.get('/habits', clerkMiddleware(), habitController.getHabits);
   ```

## Security Considerations

1. **Token Security**

   - JWT tokens are signed and encrypted
   - Tokens have a limited lifetime
   - Tokens are automatically refreshed by Clerk
   - Tokens are invalidated on logout

2. **API Security**

   - All endpoints (except public ones) require authentication
   - Rate limiting is applied to prevent abuse
   - CORS is configured to allow only trusted origins
   - Security headers are set using Helmet.js

3. **User Data**
   - User data is stored securely in Clerk
   - Only necessary user information is stored in the local database
   - User IDs are linked using Clerk's user ID

## Error Handling

### Authentication Errors

1. **Missing Token**

   ```json
   {
     "success": false,
     "data": null,
     "error": {
       "code": "UNAUTHORIZED",
       "message": "Authentication required"
     }
   }
   ```

2. **Invalid Token**

   ```json
   {
     "success": false,
     "data": null,
     "error": {
       "code": "INVALID_TOKEN",
       "message": "Invalid or expired token"
     }
   }
   ```

3. **Token Expired**
   ```json
   {
     "success": false,
     "data": null,
     "error": {
       "code": "TOKEN_EXPIRED",
       "message": "Token has expired"
     }
   }
   ```

## Best Practices

1. **Token Management**

   - Store tokens securely
   - Don't expose tokens in client-side code
   - Handle token expiration gracefully
   - Implement token refresh logic

2. **Error Handling**

   - Handle authentication errors appropriately
   - Provide clear error messages
   - Implement proper error logging
   - Handle token refresh failures

3. **Security**
   - Use HTTPS for all API requests
   - Implement proper CORS policies
   - Set secure cookie options
   - Regular security audits

## User Management

Clerk provides a complete user management system:

1. **User Signup**

   - Email/password
   - Social providers (Google, GitHub, etc.)
   - Custom signup flows

2. **User Profile**

   - Profile management
   - Email verification
   - Password reset
   - Account deletion

3. **Session Management**
   - Multiple sessions
   - Session revocation
   - Device management
   - Activity logging

## Development

### Testing Authentication

1. **Local Development**

   - Use Clerk's test keys
   - Test different authentication scenarios
   - Verify token validation
   - Test error handling

2. **Integration Testing**
   - Test authentication flow
   - Verify protected routes
   - Test token refresh
   - Test error scenarios

Last Updated: 2024-03-21
