// Unit tests for environment-aware error handler
// Tests information disclosure prevention and environment-specific behavior

// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { errorHandlerEnhanced } from '../errorHandlerEnhanced.js';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  BaseError,
} from '../../utils/errors.js';
import { HTTPException } from 'hono/http-exception';

// Mock security configuration
const mockSecurityConfig = {
  development: {
    errorHandling: {
      showStackTrace: true,
      showErrorDetails: true,
      logLevel: 'debug',
    },
  },
  production: {
    errorHandling: {
      showStackTrace: false,
      showErrorDetails: false,
      logLevel: 'warn',
    },
  },
  test: {
    errorHandling: {
      showStackTrace: true,
      showErrorDetails: true,
      logLevel: 'error',
    },
  },
};

let currentEnvironment = 'production';

vi.mock('../../config/security.js', () => ({
  getSecurityConfig: vi.fn(() => mockSecurityConfig[currentEnvironment]),
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('errorHandlerEnhanced', () => {
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    currentEnvironment = 'production';
    
    // Set up mock context
    mockContext = {
      req: {
        path: '/api/test',
        method: 'GET',
        header: vi.fn(),
      },
      get: vi.fn(),
      status: vi.fn(),
      json: vi.fn(),
    };
  });

  describe('production environment behavior', () => {
    beforeEach(() => {
      currentEnvironment = 'production';
    });

    it('should hide error details in production', () => {
      const error = new Error('Sensitive internal error message');
      
      errorHandlerEnhanced(error, mockContext);

      expect(mockContext.status).toHaveBeenCalledWith(500);
      expect(mockContext.json).toHaveBeenCalledWith({
        error: {
          message: 'Internal server error',
          code: 'internal_server_error',
          requestId: expect.stringMatching(/^err_\d+_/),
          timestamp: expect.any(String),
        },
      });
    });

    it('should not include stack traces in production', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at someFunction';
      
      errorHandlerEnhanced(error, mockContext);

      const jsonCall = mockContext.json.mock.calls[0][0];
      expect(jsonCall.error.details).toBeUndefined();
    });

    it('should sanitize validation error details in production', () => {
      const error = new ValidationError('Validation failed', {
        password: 'secret123',
        email: 'invalid-email',
        token: 'sensitive-token',
      });
      
      errorHandlerEnhanced(error, mockContext);

      expect(mockContext.status).toHaveBeenCalledWith(400);
      const jsonCall = mockContext.json.mock.calls[0][0];
      expect(jsonCall.error.message).toBe('Invalid request data');
      expect(jsonCall.error.details).toBeUndefined();
    });

    it('should use generic message for unauthorized errors', () => {
      const error = new UnauthorizedError('Invalid JWT signature detected');
      
      errorHandlerEnhanced(error, mockContext);

      expect(mockContext.status).toHaveBeenCalledWith(401);
      expect(mockContext.json).toHaveBeenCalledWith({
        error: {
          message: 'Authentication required',
          code: 'unauthorized',
          requestId: expect.stringMatching(/^err_\d+_/),
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('development environment behavior', () => {
    beforeEach(() => {
      currentEnvironment = 'development';
    });

    it('should show detailed error messages in development', () => {
      const error = new Error('Detailed internal error for debugging');
      
      errorHandlerEnhanced(error, mockContext);

      expect(mockContext.status).toHaveBeenCalledWith(500);
      const jsonCall = mockContext.json.mock.calls[0][0];
      expect(jsonCall.error.message).toBe('Detailed internal error for debugging');
    });

    it('should include stack traces in development', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at someFunction\n    at anotherFunction';
      
      errorHandlerEnhanced(error, mockContext);

      const jsonCall = mockContext.json.mock.calls[0][0];
      expect(jsonCall.error.details).toEqual({
        stack: ['Error: Test error', '    at someFunction', '    at anotherFunction'],
      });
    });

    it('should show validation error details in development', () => {
      const error = new ValidationError('Validation failed', {
        email: 'invalid-email',
        age: 'must be a number',
      });
      
      errorHandlerEnhanced(error, mockContext);

      const jsonCall = mockContext.json.mock.calls[0][0];
      expect(jsonCall.error.message).toBe('Validation failed');
      expect(jsonCall.error.details).toEqual({
        email: 'invalid-email',
        age: 'must be a number',
      });
    });
  });

  describe('error type handling', () => {
    it('should handle NotFoundError correctly', () => {
      const error = new NotFoundError('User not found');
      
      errorHandlerEnhanced(error, mockContext);

      expect(mockContext.status).toHaveBeenCalledWith(404);
      expect(mockContext.json).toHaveBeenCalledWith({
        error: {
          message: 'Resource not found',
          code: 'not_found',
          requestId: expect.stringMatching(/^err_\d+_/),
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle ForbiddenError correctly', () => {
      const error = new ForbiddenError('Access denied to admin area');
      
      errorHandlerEnhanced(error, mockContext);

      expect(mockContext.status).toHaveBeenCalledWith(403);
      expect(mockContext.json).toHaveBeenCalledWith({
        error: {
          message: 'Access denied',
          code: 'forbidden',
          requestId: expect.stringMatching(/^err_\d+_/),
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle RateLimitError correctly', () => {
      const error = new RateLimitError('Too many requests');
      
      errorHandlerEnhanced(error, mockContext);

      expect(mockContext.status).toHaveBeenCalledWith(429);
      expect(mockContext.json).toHaveBeenCalledWith({
        error: {
          message: 'Too many requests',
          code: 'too_many_requests',
          requestId: expect.stringMatching(/^err_\d+_/),
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle HTTPException correctly', () => {
      const error = new HTTPException(422, { message: 'Unprocessable entity' });
      
      errorHandlerEnhanced(error, mockContext);

      expect(mockContext.status).toHaveBeenCalledWith(422);
      expect(mockContext.json).toHaveBeenCalledWith({
        error: {
          message: 'Request failed',
          code: 'validation_error',
          requestId: expect.stringMatching(/^err_\d+_/),
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle custom BaseError correctly', () => {
      const error = new BaseError('Custom business logic error', 409, 'business_logic_error');
      
      errorHandlerEnhanced(error, mockContext);

      expect(mockContext.status).toHaveBeenCalledWith(409);
      expect(mockContext.json).toHaveBeenCalledWith({
        error: {
          message: 'Request failed',
          code: 'business_logic_error',
          requestId: expect.stringMatching(/^err_\d+_/),
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('database error handling', () => {
    it('should handle SQLite errors with information hiding', () => {
      const error = new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email');
      error.name = 'SqliteError';
      
      errorHandlerEnhanced(error, mockContext);

      expect(mockContext.status).toHaveBeenCalledWith(500);
      const jsonCall = mockContext.json.mock.calls[0][0];
      expect(jsonCall.error.message).toBe('Internal server error');
      expect(jsonCall.error.code).toBe('database_error');
    });

    it('should show database errors in development', () => {
      currentEnvironment = 'development';
      const error = new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email');
      error.name = 'SqliteError';
      
      errorHandlerEnhanced(error, mockContext);

      const jsonCall = mockContext.json.mock.calls[0][0];
      expect(jsonCall.error.message).toBe('Database error: SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email');
    });
  });

  describe('security features', () => {
    it('should sanitize sensitive fields from error details', () => {
      currentEnvironment = 'development';
      const error = new ValidationError('Validation failed', {
        username: 'valid-user',
        password: 'should-be-hidden',
        email: 'invalid-email',
        authToken: 'sensitive-token',
        secretKey: 'super-secret',
      });
      
      errorHandlerEnhanced(error, mockContext);

      const jsonCall = mockContext.json.mock.calls[0][0];
      expect(jsonCall.error.details).toEqual({
        username: 'valid-user',
        email: 'invalid-email',
        // password, authToken, secretKey should be filtered out
      });
    });

    it('should include request context in error logging', async () => {
      const { default: logger } = await import('../../utils/logger.js');
      
      mockContext.req.header.mockImplementation((headerName: string) => {
        if (headerName === 'User-Agent') return 'Test Browser';
        if (headerName === 'CF-Connecting-IP') return '192.168.1.1';
        return undefined;
      });

      mockContext.get.mockImplementation((key: string) => {
        if (key === 'auth') return {
          userId: 'user123',
          metadata: { requestId: 'req_123' },
        };
        return undefined;
      });

      const error = new Error('Test error');
      errorHandlerEnhanced(error, mockContext);

      expect(logger.error).toHaveBeenCalledWith('Server error occurred', expect.objectContaining({
        path: '/api/test',
        method: 'GET',
        userId: 'user123',
        userAgent: 'Test Browser',
        ipAddress: '192.168.1.1',
        errorType: 'Error',
        errorMessage: 'Test error',
      }));
    });

    it('should generate unique request IDs for error tracking', () => {
      const error = new Error('Test error');
      
      errorHandlerEnhanced(error, mockContext);
      const firstRequestId = mockContext.json.mock.calls[0][0].error.requestId;

      // Clear mocks and test again
      mockContext.json.mockClear();
      errorHandlerEnhanced(error, mockContext);
      const secondRequestId = mockContext.json.mock.calls[0][0].error.requestId;

      expect(firstRequestId).not.toEqual(secondRequestId);
      expect(firstRequestId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(secondRequestId).toMatch(/^err_\d+_[a-z0-9]+$/);
    });
  });

  describe('logging behavior', () => {
    it('should log client errors as warnings', async () => {
      const { default: logger } = await import('../../utils/logger.js');
      const error = new ValidationError('Invalid input');
      
      errorHandlerEnhanced(error, mockContext);

      expect(logger.warn).toHaveBeenCalledWith('Client error occurred', expect.any(Object));
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log server errors as errors', async () => {
      const { default: logger } = await import('../../utils/logger.js');
      const error = new Error('Internal server error');
      
      errorHandlerEnhanced(error, mockContext);

      expect(logger.error).toHaveBeenCalledWith('Server error occurred', expect.any(Object));
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});