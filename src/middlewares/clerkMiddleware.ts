import { createClerkClient } from '@clerk/backend';
import { UnauthorizedError } from '../utils/errors.js';
import logger from '../utils/logger.js';

export const clerkMiddleware = () => async (c: any, next: any) => {
  try {
    const clerk = createClerkClient({ 
      secretKey: c.env.CLERK_SECRET_KEY,
      publishableKey: c.env.CLERK_PUBLISHABLE_KEY || 'pk_test_' // Fallback for development
    });

    // Create a Request object from the Hono context
    const request = new Request(c.req.url, {
      method: c.req.method,
      headers: c.req.header(),
      body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? await c.req.raw.clone().text() : undefined,
    });

    try {
      // Use authenticateRequest to verify the session token
      const requestState = await clerk.authenticateRequest(request, {
        authorizedParties: [
          'http://localhost:5173',
          'http://localhost:3000',
          'https://tracknstick.com',
          'https://www.tracknstick.com'
        ],
      });

      // Check if the request is authenticated using the status
      if (requestState.status !== 'signed-in') {
        throw new UnauthorizedError('User not authenticated');
      }

      const auth = requestState.toAuth();
      
      if (!auth || !auth.userId) {
        throw new UnauthorizedError('Invalid user session');
      }

      // Set authenticated user ID in context variables
      c.set('auth', {
        userId: auth.userId,
        sessionId: auth.sessionId || '',
      });

      logger.debug('User authenticated successfully', { userId: auth.userId });
      await next();
    } catch (authError) {
      const errorMessage = authError instanceof Error ? authError.message : String(authError);
      logger.warn('Authentication failed', { error: errorMessage });
      throw new UnauthorizedError('Invalid or expired token');
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Authentication middleware error', err);
    throw new UnauthorizedError('Authentication failed');
  }
};
