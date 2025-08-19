// Unit tests for secure Clerk JWT authentication middleware
// Tests proper token verification and error handling scenarios

// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clerkMiddleware } from '../clerkMiddleware.js';
import { UnauthorizedError } from '../../utils/errors.js';

// Mock Clerk client with new authenticateRequest API
const mockClerkClient = {
  authenticateRequest: vi.fn(),
};

vi.mock('@clerk/backend', () => ({
  createClerkClient: vi.fn(() => mockClerkClient),
}));

// Mock logger to prevent console output during tests
vi.mock('../../utils/logger.js', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('clerkMiddleware', () => {
  let mockContext;
  let mockNext;
  let middleware;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNext = vi.fn();
    middleware = clerkMiddleware();
    
    // Set up mock context
    mockContext = {
      req: {
        header: vi.fn(),
        path: '/api/test',
        method: 'GET',
        raw: new Request('https://example.com/api/test', {
          headers: { 'Authorization': 'Bearer valid.token' }
        }),
      },
      set: vi.fn(),
      env: {
        CLERK_SECRET_KEY: 'test-secret-key',
      },
    };
  });

  describe('successful authentication', () => {
    it('should authenticate valid request and set auth context', async () => {
      const mockAuth = {
        userId: 'user_123',
        sessionId: 'session_456',
        sessionClaims: {
          iss: 'https://clerk.dev',
          aud: 'test-audience',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          nbf: Math.floor(Date.now() / 1000),
        },
      };

      const mockRequestState = {
        isSignedIn: true,
        toAuth: () => mockAuth,
      };

      mockClerkClient.authenticateRequest.mockResolvedValue(mockRequestState);

      await middleware(mockContext, mockNext);

      expect(mockClerkClient.authenticateRequest).toHaveBeenCalledWith(
        mockContext.req.raw,
        { authorizedParties: [] }
      );
      
      expect(mockContext.set).toHaveBeenCalledWith('auth', expect.objectContaining({
        userId: 'user_123',
        sessionId: 'session_456',
        claims: expect.objectContaining({
          iss: 'https://clerk.dev',
          aud: 'test-audience',
        }),
        metadata: expect.objectContaining({
          requestId: expect.stringMatching(/^req_\d+_/),
        }),
      }));
      
      expect(mockContext.set).toHaveBeenCalledWith('userId', 'user_123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle request without session ID', async () => {
      const mockAuth = {
        userId: 'user_123',
        sessionClaims: {
          iss: 'https://clerk.dev',
          aud: 'test-audience',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          nbf: Math.floor(Date.now() / 1000),
        },
      };

      const mockRequestState = {
        isSignedIn: true,
        toAuth: () => mockAuth,
      };

      mockClerkClient.authenticateRequest.mockResolvedValue(mockRequestState);

      await middleware(mockContext, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('auth', expect.objectContaining({
        userId: 'user_123',
        sessionId: '',
      }));
    });
  });

  describe('authentication failures', () => {
    it('should reject request when user is not signed in', async () => {
      const mockRequestState = {
        isSignedIn: false,
        reason: 'invalid-token',
      };

      mockClerkClient.authenticateRequest.mockResolvedValue(mockRequestState);

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(UnauthorizedError);
      await expect(middleware(mockContext, mockNext)).rejects.toThrow('Authentication required');
      
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request when Clerk secret key is missing', async () => {
      mockContext.env.CLERK_SECRET_KEY = undefined;

      await expect(middleware(mockContext, mockNext)).rejects.toThrow('Service configuration error');
      
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request when auth has no user ID', async () => {
      const mockAuth = {
        sessionClaims: {
          iss: 'https://clerk.dev',
          aud: 'test-audience',
        },
      };

      const mockRequestState = {
        isSignedIn: true,
        toAuth: () => mockAuth,
      };

      mockClerkClient.authenticateRequest.mockResolvedValue(mockRequestState);

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(UnauthorizedError);
      await expect(middleware(mockContext, mockNext)).rejects.toThrow('Authentication required');
      
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle Clerk authentication errors', async () => {
      const authError = new Error('Token signature verification failed');
      mockClerkClient.authenticateRequest.mockRejectedValue(authError);

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(UnauthorizedError);
      await expect(middleware(mockContext, mockNext)).rejects.toThrow('Authentication required');
      
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const unexpectedError = new Error('Database connection failed');
      mockClerkClient.authenticateRequest.mockRejectedValue(unexpectedError);

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(UnauthorizedError);
      await expect(middleware(mockContext, mockNext)).rejects.toThrow('Authentication required');
      
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should propagate UnauthorizedError instances without wrapping', async () => {
      mockContext.env.CLERK_SECRET_KEY = undefined;
      
      const error = await middleware(mockContext, mockNext).catch(e => e);
      
      expect(error.message).toBe('Service configuration error');
    });
  });

  describe('security metadata', () => {
    it('should extract IP address from CF-Connecting-IP header', async () => {
      mockContext.req.header.mockImplementation((headerName) => {
        if (headerName === 'CF-Connecting-IP') return '192.168.1.1';
        return undefined;
      });

      const mockAuth = {
        userId: 'user_123',
        sessionClaims: { iss: 'https://clerk.dev' },
      };

      const mockRequestState = {
        isSignedIn: true,
        toAuth: () => mockAuth,
      };

      mockClerkClient.authenticateRequest.mockResolvedValue(mockRequestState);

      await middleware(mockContext, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('auth', expect.objectContaining({
        metadata: expect.objectContaining({
          ipAddress: '192.168.1.1',
        }),
      }));
    });

    it('should fall back to X-Forwarded-For when CF-Connecting-IP is missing', async () => {
      mockContext.req.header.mockImplementation((headerName) => {
        if (headerName === 'X-Forwarded-For') return '10.0.0.1';
        return undefined;
      });

      const mockAuth = {
        userId: 'user_123',
        sessionClaims: { iss: 'https://clerk.dev' },
      };

      const mockRequestState = {
        isSignedIn: true,
        toAuth: () => mockAuth,
      };

      mockClerkClient.authenticateRequest.mockResolvedValue(mockRequestState);

      await middleware(mockContext, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('auth', expect.objectContaining({
        metadata: expect.objectContaining({
          ipAddress: '10.0.0.1',
        }),
      }));
    });
  });
});