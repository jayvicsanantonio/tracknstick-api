// Secure JWT authentication middleware using Clerk verification
// Replaces unsafe manual JWT parsing with proper cryptographic verification

import { createClerkClient } from '@clerk/backend';
import type { Context, Next } from 'hono';
import type { AuthContext } from '../types/index.js';
import { UnauthorizedError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Generates a unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const clerkMiddleware = () => async (c: Context, next: Next) => {
  try {
    // Validate that secret key is available
    if (!c.env.CLERK_SECRET_KEY) {
      logger.error('Clerk secret key not configured');
      throw new Error('Service configuration error');
    }

    const clerkClient = createClerkClient({
      secretKey: c.env.CLERK_SECRET_KEY,
    });

    try {
      // Use Clerk's authenticateRequest method (recommended for HTTP requests)
      const requestState = await clerkClient.authenticateRequest(c.req.raw, {
        publishableKey: c.env.CLERK_PUBLISHABLE_KEY,
        // jwtKey: c.env.CLERK_JWT_KEY, // Optional for networkless verification
        authorizedParties: [],
      });

      if (!requestState.isAuthenticated) {
        logger.warn('Authentication failed - user not signed in', {
          path: c.req.path,
          method: c.req.method,
          reason: requestState.reason,
        });
        throw new UnauthorizedError('Authentication required');
      }

      const auth = requestState.toAuth();

      if (!auth.userId) {
        logger.warn('Authentication failed - no user ID in auth context', {
          path: c.req.path,
          method: c.req.method,
        });
        throw new UnauthorizedError('Authentication required');
      }

      // User enrichment decision: Keep authentication context minimal for performance
      // The basic JWT claims (userId, sessionId) plus security metadata provide
      // sufficient context for this habit tracking API without additional API calls

      // Extract verified user claims and session information
      const authContext: AuthContext = {
        userId: auth.userId,
        sessionId: auth.sessionId || '',
        claims: {
          iss: auth.sessionClaims?.iss || '',
          aud: (auth.sessionClaims?.aud as string | string[]) || '',
          exp: auth.sessionClaims?.exp || 0,
          iat: auth.sessionClaims?.iat || 0,
          nbf: auth.sessionClaims?.nbf || 0,
        },
        metadata: {
          ipAddress:
            c.req.header('CF-Connecting-IP') ||
            c.req.header('X-Forwarded-For') ||
            'unknown',
          userAgent: c.req.header('User-Agent') || 'unknown',
          requestId: generateRequestId(),
        },
      };

      // Set authenticated context in request
      c.set('auth', authContext);
      c.set('userId', auth.userId);

      logger.debug('Authentication successful', {
        userId: auth.userId,
        sessionId: auth.sessionId,
        path: c.req.path,
        method: c.req.method,
      });

      await next();
    } catch (authError: unknown) {
      // Handle specific Clerk authentication errors
      const errorMessage =
        authError instanceof Error
          ? authError.message
          : 'Unknown authentication error';
      logger.warn('Authentication failed', {
        path: c.req.path,
        method: c.req.method,
        error: errorMessage,
      });

      throw new UnauthorizedError('Authentication required');
    }
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    // Handle configuration errors specifically
    if (
      error instanceof Error &&
      error.message === 'Service configuration error'
    ) {
      throw error;
    }

    // Log unexpected errors but don't expose details
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error('Authentication middleware error', {
      path: c.req.path,
      method: c.req.method,
      error: errorMessage,
    } as any);

    throw new UnauthorizedError('Authentication required');
  }
};
