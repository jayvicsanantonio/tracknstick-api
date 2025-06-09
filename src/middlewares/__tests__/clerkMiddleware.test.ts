import { clerkMiddleware } from '../clerkMiddleware.js';
import { UnauthorizedError } from '../../utils/errors.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock @clerk/backend
const mockVerifyToken = vi.fn();
vi.mock('@clerk/backend', () => ({
  createClerkClient: vi.fn(() => ({
    verifyToken: mockVerifyToken,
  })),
}));

describe('clerkMiddleware', () => {
  let mockC;
  let mockNext;

  beforeEach(() => {
    mockVerifyToken.mockReset();
    mockNext = vi.fn();
    mockC = {
      req: {
        header: vi.fn(),
      },
      set: vi.fn(),
      env: {
        CLERK_SECRET_KEY: 'test-secret-key', // Actual value doesn't matter due to mock
      },
    };
  });

  it('should call next and set auth context for a valid token', async () => {
    mockC.req.header.mockReturnValue('Bearer valid-token');
    const mockPayload = { sub: 'user-id-123', sid: 'session-id-456' };
    mockVerifyToken.mockResolvedValue(mockPayload);

    await clerkMiddleware()(mockC, mockNext);

    expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
    expect(mockC.set).toHaveBeenCalledWith('auth', {
      userId: mockPayload.sub,
      sessionId: mockPayload.sid,
    });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should throw UnauthorizedError if verifyToken throws an error', async () => {
    mockC.req.header.mockReturnValue('Bearer invalid-token');
    mockVerifyToken.mockRejectedValue(new Error('Clerk verification failed'));

    try {
      await clerkMiddleware()(mockC, mockNext);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('Invalid token');
    }
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError if Authorization header is missing', async () => {
    mockC.req.header.mockReturnValue(undefined);

    try {
      await clerkMiddleware()(mockC, mockNext);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('Invalid authorization header');
    }
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError if Authorization header is not Bearer', async () => {
    mockC.req.header.mockReturnValue('NotBearer some-token');
     try {
      await clerkMiddleware()(mockC, mockNext);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('Invalid authorization header');
    }
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError if token is malformed (e.g., "Bearer " with no token)', async () => {
    mockC.req.header.mockReturnValue('Bearer '); // Note the space

    try {
      await clerkMiddleware()(mockC, mockNext);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('No token provided');
    }
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError if token does not contain sub', async () => {
    mockC.req.header.mockReturnValue('Bearer valid-token-no-sub');
    const mockPayloadNoSub = { sid: 'session-id-789' }; // No 'sub'
    mockVerifyToken.mockResolvedValue(mockPayloadNoSub);

    try {
      await clerkMiddleware()(mockC, mockNext);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('Invalid token format');
    }
    expect(mockNext).not.toHaveBeenCalled();
  });
});
