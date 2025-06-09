// @ts-nocheck
import { createClerkClient } from '@clerk/backend';
import { UnauthorizedError } from '../utils/errors.js';

// The auth type is already defined in types/index.ts

export const clerkMiddleware = () => async (c, next) => {
  try {
    // Get authorization header
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Invalid authorization header');
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const clerk = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY });

    try {
      // Verify the JWT
      const claims = await clerk.verifyToken(token);

      if (!claims || !claims.sub) {
        throw new UnauthorizedError('Invalid token format');
      }

      // Set authenticated user ID in context variables
      c.set('auth', {
        userId: claims.sub,
        sessionId: claims.sid || '',
      });

      await next();
    } catch (tokenError) {
      throw new UnauthorizedError('Invalid token');
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    throw new UnauthorizedError('Authentication failed');
  }
};
