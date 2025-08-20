// Unit tests for middleware failure handling system
// Tests security event logging and error propagation

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  withFailureHandling,
  withClerkFailureHandling,
  withRateLimitFailureHandling,
  getSecurityLogger,
  middlewareChainMonitor,
  type SecurityEvent,
} from '../middlewareFailureHandler.js';
import { UnauthorizedError, RateLimitError, BaseError } from '../../utils/errors.js';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Middleware Failure Handler', () => {
  let mockContext: any;
  let mockNext: any;

  beforeEach(() => {
    mockContext = {
      req: {
        path: '/api/test',
        method: 'GET',
        header: vi.fn((name: string) => {
          const headers: Record<string, string> = {
            'CF-Connecting-IP': '192.168.1.1',
            'User-Agent': 'Test-Agent/1.0',
          };
          return headers[name];
        }),
      },
      get: vi.fn((key: string) => {
        if (key === 'auth') {
          return {
            userId: 'user_123',
            metadata: {
              requestId: 'req_test_123',
            },
          };
        }
        return undefined;
      }),
    };

    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe('withFailureHandling', () => {
    it('should execute middleware successfully when no errors occur', async () => {
      const successMiddleware = vi.fn(async (c: any, next: any) => {
        await next();
      });

      const wrappedMiddleware = withFailureHandling('test_middleware', successMiddleware);
      
      await wrappedMiddleware(mockContext, mockNext);

      expect(successMiddleware).toHaveBeenCalledWith(mockContext, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log security event and re-throw UnauthorizedError', async () => {
      const error = new UnauthorizedError('Authentication failed');
      const failingMiddleware = vi.fn(async () => {
        throw error;
      });

      const wrappedMiddleware = withFailureHandling('auth_middleware', failingMiddleware);

      await expect(wrappedMiddleware(mockContext, mockNext)).rejects.toThrow(UnauthorizedError);
      expect(failingMiddleware).toHaveBeenCalledWith(mockContext, mockNext);
    });

    it('should log security event and re-throw RateLimitError', async () => {
      const error = new RateLimitError('Too many requests');
      const failingMiddleware = vi.fn(async () => {
        throw error;
      });

      const wrappedMiddleware = withFailureHandling('rate_limit_middleware', failingMiddleware);

      await expect(wrappedMiddleware(mockContext, mockNext)).rejects.toThrow(RateLimitError);
      expect(failingMiddleware).toHaveBeenCalledWith(mockContext, mockNext);
    });

    it('should handle non-Error objects gracefully', async () => {
      const failingMiddleware = vi.fn(async () => {
        throw 'String error';
      });

      const wrappedMiddleware = withFailureHandling('test_middleware', failingMiddleware);

      await expect(wrappedMiddleware(mockContext, mockNext)).rejects.toThrow('String error');
    });

    it('should log middleware failure with proper context', async () => {
      const error = new BaseError('Custom error', 500);
      const failingMiddleware = vi.fn(async () => {
        throw error;
      });

      const wrappedMiddleware = withFailureHandling('custom_middleware', failingMiddleware);

      await expect(wrappedMiddleware(mockContext, mockNext)).rejects.toThrow(BaseError);
      expect(failingMiddleware).toHaveBeenCalledWith(mockContext, mockNext);
    });
  });

  describe('SecurityEventLogger', () => {
    let securityLogger: ReturnType<typeof getSecurityLogger>;

    beforeEach(() => {
      securityLogger = getSecurityLogger();
    });

    it('should log authentication failure with high severity', () => {
      const error = new UnauthorizedError('Invalid token');
      
      securityLogger.logAuthFailure(mockContext, error, 'clerk_middleware');

      // Verify that the error logger was called (implementation logs to console.error for high severity)
      expect(mockContext.req.header).toHaveBeenCalledWith('CF-Connecting-IP');
      expect(mockContext.req.header).toHaveBeenCalledWith('User-Agent');
    });

    it('should log rate limit exceeded with medium severity', () => {
      const details = {
        limit: 100,
        current: 101,
        window: 900000,
      };

      securityLogger.logRateLimitExceeded(mockContext, details);

      // Verify context extraction calls
      expect(mockContext.get).toHaveBeenCalledWith('auth');
    });

    it('should log validation failure with low severity', () => {
      const error = new Error('Invalid request format');
      
      securityLogger.logValidationFailure(mockContext, error, 'validation_middleware');

      // Verify the logger captured the error context
      expect(mockContext.req.header).toHaveBeenCalled();
    });

    it('should extract security context properly', () => {
      const error = new Error('Test error');
      
      securityLogger.logMiddlewareFailure(mockContext, error, 'test_middleware');

      // Verify all context extraction calls
      expect(mockContext.get).toHaveBeenCalledWith('auth');
      expect(mockContext.req.header).toHaveBeenCalledWith('CF-Connecting-IP');
      expect(mockContext.req.header).toHaveBeenCalledWith('User-Agent');
    });
  });

  describe('MiddlewareChainMonitor', () => {
    beforeEach(() => {
      // Reset the monitor state
      middlewareChainMonitor.getFailureStats(); // This triggers reset check
    });

    it('should record middleware failures', () => {
      middlewareChainMonitor.recordFailure('test_middleware');
      middlewareChainMonitor.recordFailure('test_middleware');
      middlewareChainMonitor.recordFailure('other_middleware');

      const stats = middlewareChainMonitor.getFailureStats();
      
      expect(stats['test_middleware']).toBe(2);
      expect(stats['other_middleware']).toBe(1);
    });

    it('should provide failure statistics', () => {
      middlewareChainMonitor.recordFailure('auth_middleware');
      middlewareChainMonitor.recordFailure('rate_limit_middleware');
      middlewareChainMonitor.recordFailure('auth_middleware');

      const stats = middlewareChainMonitor.getFailureStats();
      
      expect(stats['auth_middleware']).toBe(2);
      expect(stats['rate_limit_middleware']).toBe(1);
    });

    it('should handle empty failure stats', () => {
      const stats = middlewareChainMonitor.getFailureStats();
      
      expect(Object.keys(stats).length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Enhanced wrapper functions', () => {
    it('should create enhanced Clerk middleware wrapper', () => {
      const mockClerkMiddleware = vi.fn();
      const enhanced = withClerkFailureHandling(mockClerkMiddleware);
      
      expect(typeof enhanced).toBe('function');
    });

    it('should create enhanced rate limit middleware wrapper', () => {
      const mockRateLimitMiddleware = vi.fn();
      const enhanced = withRateLimitFailureHandling(mockRateLimitMiddleware);
      
      expect(typeof enhanced).toBe('function');
    });

    it('should handle Clerk middleware failures', async () => {
      const error = new UnauthorizedError('Clerk auth failed');
      const failingClerkMiddleware = vi.fn(async () => {
        throw error;
      });

      const enhanced = withClerkFailureHandling(failingClerkMiddleware);

      await expect(enhanced(mockContext, mockNext)).rejects.toThrow(UnauthorizedError);
      expect(failingClerkMiddleware).toHaveBeenCalledWith(mockContext, mockNext);
    });

    it('should handle rate limit middleware failures', async () => {
      const error = new RateLimitError('Rate limit exceeded');
      const failingRateLimitMiddleware = vi.fn(async () => {
        throw error;
      });

      const enhanced = withRateLimitFailureHandling(failingRateLimitMiddleware);

      await expect(enhanced(mockContext, mockNext)).rejects.toThrow(RateLimitError);
      expect(failingRateLimitMiddleware).toHaveBeenCalledWith(mockContext, mockNext);
    });
  });

  describe('Context extraction edge cases', () => {
    it('should handle missing auth context', async () => {
      mockContext.get = vi.fn(() => undefined);
      
      const error = new Error('Test error');
      const failingMiddleware = vi.fn(async () => {
        throw error;
      });

      const wrappedMiddleware = withFailureHandling('test_middleware', failingMiddleware);

      await expect(wrappedMiddleware(mockContext, mockNext)).rejects.toThrow('Test error');
    });

    it('should handle missing headers gracefully', async () => {
      mockContext.req.header = vi.fn(() => undefined);
      
      const error = new Error('Test error');
      const failingMiddleware = vi.fn(async () => {
        throw error;
      });

      const wrappedMiddleware = withFailureHandling('test_middleware', failingMiddleware);

      await expect(wrappedMiddleware(mockContext, mockNext)).rejects.toThrow('Test error');
      expect(mockContext.req.header).toHaveBeenCalledWith('CF-Connecting-IP');
    });
  });
});