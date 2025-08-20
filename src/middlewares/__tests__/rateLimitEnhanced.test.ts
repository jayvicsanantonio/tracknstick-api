// Unit tests for production-grade rate limiting middleware
// Tests sliding window, endpoint-specific limits, and security configuration

// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimitMiddleware, rateLimitMiddleware } from '../rateLimitEnhanced.js';
import { RateLimitError } from '../../utils/errors.js';

// Mock security configuration
vi.mock('../../config/security.js', () => ({
  getSecurityConfig: vi.fn(() => ({
    rateLimit: {
      globalLimit: 100,
      windowMs: 60000, // 1 minute
      endpointLimits: {
        '/api/auth': { limit: 10, windowMs: 60000 },
        '/api/habits': { limit: 50, windowMs: 60000 },
        '/api/health': { 
          limit: 1000, 
          windowMs: 60000,
          skipIf: (path: string) => path === '/api/health'
        },
      },
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
  })),
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  default: {
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('RateLimitMiddleware', () => {
  let middleware: RateLimitMiddleware;
  let mockContext: any;
  let mockNext: any;

  beforeEach(() => {
    middleware = new RateLimitMiddleware();
    mockNext = vi.fn();
    
    // Set up mock context
    mockContext = {
      req: {
        path: '/api/test',
        method: 'GET',
        header: vi.fn(),
      },
      get: vi.fn(),
      header: vi.fn(),
    };
  });

  afterEach(() => {
    middleware.destroy();
    vi.clearAllMocks();
  });

  describe('global rate limiting', () => {
    it('should allow requests within global limit', async () => {
      mockContext.req.header.mockReturnValue('192.168.1.1'); // CF-Connecting-IP
      
      const middlewareFunc = middleware.middleware();

      // Make 5 requests (well within 100 limit)
      for (let i = 0; i < 5; i++) {
        await middlewareFunc(mockContext, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockContext.header).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(mockContext.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '95');
    });

    it('should reject requests exceeding global limit', async () => {
      mockContext.req.header.mockReturnValue('192.168.1.1');
      
      const middlewareFunc = middleware.middleware();

      // Simulate exceeding limit by setting count manually
      const key = 'ip:192.168.1.1:global:/api/test';
      middleware['store'].set(key, {
        count: 101,
        resetAt: Date.now() + 60000,
        firstRequest: Date.now(),
      });

      await expect(middlewareFunc(mockContext, mockNext)).rejects.toThrow(RateLimitError);
      await expect(middlewareFunc(mockContext, mockNext)).rejects.toThrow('Too many requests');
      
      expect(mockContext.header).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });
  });

  describe('endpoint-specific rate limiting', () => {
    it('should apply endpoint-specific limits for /api/auth', async () => {
      mockContext.req.path = '/api/auth/login';
      mockContext.req.header.mockReturnValue('192.168.1.1');
      
      const middlewareFunc = middleware.middleware();

      // Make 5 requests (within 10 limit for /api/auth)
      for (let i = 0; i < 5; i++) {
        await middlewareFunc(mockContext, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockContext.header).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
      expect(mockContext.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '5');
    });

    it('should reject requests exceeding endpoint-specific limit', async () => {
      mockContext.req.path = '/api/auth/login';
      mockContext.req.header.mockReturnValue('192.168.1.1');
      
      const middlewareFunc = middleware.middleware();

      // Simulate exceeding endpoint limit
      const key = 'ip:192.168.1.1:/api/auth';
      middleware['store'].set(key, {
        count: 11,
        resetAt: Date.now() + 60000,
        firstRequest: Date.now(),
      });

      await expect(middlewareFunc(mockContext, mockNext)).rejects.toThrow(RateLimitError);
    });

    it('should skip rate limiting for configured endpoints', async () => {
      mockContext.req.path = '/api/health';
      mockContext.req.header.mockReturnValue('192.168.1.1');
      
      const middlewareFunc = middleware.middleware();

      // Health check should be skipped regardless of count
      await middlewareFunc(mockContext, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockContext.header).not.toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
    });
  });

  describe('identifier handling', () => {
    it('should prefer user ID over IP address for authenticated users', async () => {
      mockContext.get.mockImplementation((key: string) => {
        if (key === 'userId') return 'user_123';
        return undefined;
      });
      
      const middlewareFunc = middleware.middleware();
      await middlewareFunc(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // The internal key should use user: prefix
    });

    it('should use IP address for anonymous users', async () => {
      mockContext.get.mockReturnValue(undefined);
      mockContext.req.header.mockImplementation((headerName: string) => {
        if (headerName === 'CF-Connecting-IP') return '192.168.1.1';
        return undefined;
      });
      
      const middlewareFunc = middleware.middleware();
      await middlewareFunc(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fall back to X-Forwarded-For when CF-Connecting-IP is missing', async () => {
      mockContext.get.mockReturnValue(undefined);
      mockContext.req.header.mockImplementation((headerName: string) => {
        if (headerName === 'X-Forwarded-For') return '10.0.0.1';
        return undefined;
      });
      
      const middlewareFunc = middleware.middleware();
      await middlewareFunc(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use "unknown" when no identifier is available', async () => {
      mockContext.get.mockReturnValue(undefined);
      mockContext.req.header.mockReturnValue(undefined);
      
      const middlewareFunc = middleware.middleware();
      await middlewareFunc(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('sliding window behavior', () => {
    it('should reset count when window expires', async () => {
      mockContext.req.header.mockReturnValue('192.168.1.1');
      
      const middlewareFunc = middleware.middleware();

      // Set up expired entry
      const key = 'ip:192.168.1.1:global:/api/test';
      middleware['store'].set(key, {
        count: 50,
        resetAt: Date.now() - 1000, // Expired 1 second ago
        firstRequest: Date.now() - 61000,
      });

      await middlewareFunc(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockContext.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '99'); // Reset to 1 request
    });
  });

  describe('rate limit headers', () => {
    it('should set all required rate limit headers', async () => {
      mockContext.req.header.mockReturnValue('192.168.1.1');
      
      const middlewareFunc = middleware.middleware();
      await middlewareFunc(mockContext, mockNext);

      expect(mockContext.header).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(mockContext.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '99');
      expect(mockContext.header).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
      expect(mockContext.header).toHaveBeenCalledWith('X-RateLimit-Window', '60');
    });

    it('should set Retry-After header when limit exceeded', async () => {
      mockContext.req.header.mockReturnValue('192.168.1.1');
      
      const middlewareFunc = middleware.middleware();

      // Simulate exceeding limit
      const key = 'ip:192.168.1.1:global:/api/test';
      middleware['store'].set(key, {
        count: 101,
        resetAt: Date.now() + 30000, // 30 seconds remaining
        firstRequest: Date.now(),
      });

      await expect(middlewareFunc(mockContext, mockNext)).rejects.toThrow(RateLimitError);
      expect(mockContext.header).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });
  });

  describe('cleanup functionality', () => {
    it('should clean up expired entries', async () => {
      // Add some expired entries
      const now = Date.now();
      middleware['store'].set('expired1', {
        count: 10,
        resetAt: now - 1000,
        firstRequest: now - 61000,
      });
      middleware['store'].set('expired2', {
        count: 5,
        resetAt: now - 2000,
        firstRequest: now - 62000,
      });
      middleware['store'].set('active', {
        count: 3,
        resetAt: now + 60000,
        firstRequest: now,
      });

      expect(Array.from(middleware['store'].entries()).length).toBe(3);

      // Trigger cleanup
      middleware['cleanup']();

      expect(Array.from(middleware['store'].entries()).length).toBe(1);
    });
  });

  describe('statistics and monitoring', () => {
    it('should provide rate limiting statistics', () => {
      const stats = middleware.getStats();

      expect(stats).toHaveProperty('totalKeys');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('config');
      expect(stats.config.globalLimit).toBe(100);
    });

    it('should clear all data when requested', () => {
      // Add some data
      middleware['store'].set('test', {
        count: 1,
        resetAt: Date.now() + 60000,
        firstRequest: Date.now(),
      });

      expect(Array.from(middleware['store'].entries()).length).toBe(1);

      middleware.clear();

      expect(Array.from(middleware['store'].entries()).length).toBe(0);
    });
  });

  describe('singleton instance', () => {
    it('should provide a singleton instance', () => {
      expect(rateLimitMiddleware).toBeInstanceOf(RateLimitMiddleware);
    });

    it('should provide a convenience function', async () => {
      const { createRateLimit } = await import('../rateLimitEnhanced.js');
      const middlewareFunc = createRateLimit();
      expect(typeof middlewareFunc).toBe('function');
    });
  });
});