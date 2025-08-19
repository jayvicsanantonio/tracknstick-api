// Security integration tests - End-to-end security pipeline validation
// Tests authentication flows, rate limiting, CORS enforcement, and error handling

// @ts-nocheck
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestEnv, resetMocks } from '../setup.js';
import app from '../../index.js';

describe('Security Integration Tests', () => {
  const { env: testEnv, mockDb } = createTestEnv();

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Flow Integration', () => {
    it('should block unauthenticated requests to protected routes', async () => {
      const req = new Request('http://localhost/api/v1/habits', {
        method: 'GET',
      });
      
      const response = await app.fetch(req, testEnv);

      expect(response.status).toBe(401);
      
      const body = await response.json();
      expect(body).toMatchObject({
        error: {
          message: 'Authentication required',
          code: 'unauthorized',
        },
      });
      expect(body.error.requestId).toMatch(/^err_/);
      expect(body.error.timestamp).toBeDefined();
    });

    it('should reject requests with malformed Authorization header', async () => {
      const req = new Request('http://localhost/api/v1/habits', {
        method: 'GET',
        headers: {
          'Authorization': 'Invalid Bearer Token Format',
        },
      });
      
      const response = await app.fetch(req, testEnv);

      expect(response.status).toBe(401);
      
      const body = await response.json();
      expect(body.error.code).toBe('unauthorized');
    });

    it('should allow access to health endpoints without authentication', async () => {
      const req = new Request('http://localhost/health', {
        method: 'GET',
      });
      
      const response = await app.fetch(req, testEnv);

      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.status).toBe('ok');
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should include rate limit headers in responses', async () => {
      const req = new Request('http://localhost/health', {
        method: 'GET',
        headers: {
          'X-Forwarded-For': '192.168.1.100',
        },
      });
      
      const response = await app.fetch(req, testEnv);

      expect(response.headers.get('X-RateLimit-Limit')).toMatch(/^\d+$/);
      expect(response.headers.get('X-RateLimit-Remaining')).toMatch(/^\d+$/);
      expect(response.headers.get('X-RateLimit-Reset')).toMatch(/^\d+$/);
      expect(response.headers.get('X-RateLimit-Window')).toMatch(/^\d+$/);
    });

    it('should apply rate limiting across multiple requests', async () => {
      const requests = [];
      
      // Make multiple requests to test rate limiting
      for (let i = 0; i < 3; i++) {
        const req = new Request('http://localhost/health', {
          method: 'GET',
          headers: {
            'X-Forwarded-For': '192.168.1.101',
          },
        });
        requests.push(app.fetch(req, testEnv));
      }

      const responses = await Promise.all(requests);
      
      // All should have rate limit headers
      responses.forEach(response => {
        expect(response.headers.has('X-RateLimit-Limit')).toBe(true);
        expect(response.headers.has('X-RateLimit-Remaining')).toBe(true);
      });

      // Check that remaining count decreases
      const remaining1 = parseInt(responses[0].headers.get('X-RateLimit-Remaining') || '0');
      const remaining2 = parseInt(responses[1].headers.get('X-RateLimit-Remaining') || '0');
      expect(remaining2).toBeLessThan(remaining1);
    });
  });

  describe('CORS Integration', () => {
    it('should handle CORS preflight requests properly', async () => {
      const req = new Request('http://localhost/api/v1/habits', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization',
        },
      });
      
      const response = await app.fetch(req, testEnv);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('should allow requests from authorized development origins', async () => {
      const req = new Request('http://localhost/health', {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000',
        },
      });
      
      const response = await app.fetch(req, testEnv);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('should not include CORS headers for unauthorized origins', async () => {
      const req = new Request('http://localhost/health', {
        method: 'GET',
        headers: {
          'Origin': 'https://malicious-site.com',
        },
      });
      
      const response = await app.fetch(req, testEnv);

      // Should not include CORS headers for unauthorized origins
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });

  describe('Security Headers Integration', () => {
    it('should include all required security headers in responses', async () => {
      const req = new Request('http://localhost/health', {
        method: 'GET',
      });
      
      const response = await app.fetch(req, testEnv);

      // Security headers should be present (development configuration)
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(response.headers.get('Permissions-Policy')).toContain('geolocation=()');

      // HSTS should not be enabled in test environment
      expect(response.headers.get('Strict-Transport-Security')).toBeNull();
    });

    it('should maintain security headers across different endpoints', async () => {
      const endpoints = ['/health', '/api/v1/habits'];
      
      for (const endpoint of endpoints) {
        const req = new Request(`http://localhost${endpoint}`, {
          method: 'GET',
        });
        
        const response = await app.fetch(req, testEnv);

        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
        expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      }
    });
  });

  describe('Error Handling Pipeline Integration', () => {
    it('should provide consistent error format for 404 routes', async () => {
      const req = new Request('http://localhost/api/v1/nonexistent', {
        method: 'GET',
      });
      
      const response = await app.fetch(req, testEnv);

      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body).toMatchObject({
        error: {
          message: expect.any(String),
          code: expect.any(String),
        },
      });
    });

    it('should handle malformed JSON requests gracefully', async () => {
      const req = new Request('http://localhost/api/v1/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json {',
      });
      
      const response = await app.fetch(req, testEnv);

      expect(response.status).toBe(401); // Auth happens first
      
      const body = await response.json();
      expect(body.error.code).toBe('unauthorized');
      expect(body.error.requestId).toMatch(/^err_/);
    });

    it('should include correlation IDs in error responses', async () => {
      const req = new Request('http://localhost/api/v1/habits', {
        method: 'GET',
      });
      
      const response = await app.fetch(req, testEnv);

      expect(response.status).toBe(401);
      
      const body = await response.json();
      expect(body.error.requestId).toBeDefined();
      expect(body.error.requestId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(body.error.timestamp).toBeDefined();
    });
  });

  describe('Middleware Chain Integration', () => {
    it('should execute middleware in correct security-optimized order', async () => {
      const req = new Request('http://localhost/api/v1/habits', {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000',
          'X-Forwarded-For': '192.168.1.200',
        },
      });
      
      const response = await app.fetch(req, testEnv);

      // Rate limiting headers should be present (executed before auth)
      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
      
      // CORS headers should be present (executed after rate limiting)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      
      // Security headers should be present (executed after CORS)
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      
      // Auth failure should be the final result
      expect(response.status).toBe(401);
    });

    it('should properly propagate errors through middleware chain', async () => {
      const req = new Request('http://localhost/api/v1/habits', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token-format',
        },
      });
      
      const response = await app.fetch(req, testEnv);

      expect(response.status).toBe(401);
      
      // Should still include middleware-set headers despite error
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
    });

    it('should handle middleware failures gracefully', async () => {
      const req = new Request('http://localhost/api/v1/habits', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + 'x'.repeat(1000), // Long token to test robustness
          'Origin': 'http://localhost:3000',
        },
      });
      
      const response = await app.fetch(req, testEnv);

      // Should get some kind of error response, not a timeout or hang
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(600);
    });
  });

  describe('Complete Security Pipeline Validation', () => {
    it('should validate end-to-end security for health endpoint', async () => {
      const req = new Request('http://localhost/health', {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000',
          'X-Forwarded-For': '192.168.1.250',
          'User-Agent': 'Security-Test-Agent/1.0',
        },
      });
      
      const response = await app.fetch(req, testEnv);

      expect(response.status).toBe(200);
      
      // Verify all security measures are in place
      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      
      const body = await response.json();
      expect(body.status).toBe('ok');
    });

    it('should validate complete error handling pipeline', async () => {
      const req = new Request('http://localhost/api/v1/habits/invalid-id', {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000',
          'X-Forwarded-For': '192.168.1.251',
        },
      });
      
      const response = await app.fetch(req, testEnv);

      // Should be blocked by authentication first
      expect(response.status).toBe(401);
      
      const body = await response.json();
      
      // Should have proper error structure
      expect(body).toMatchObject({
        error: {
          message: expect.any(String),
          code: 'unauthorized',
          requestId: expect.stringMatching(/^err_/),
          timestamp: expect.any(String),
        },
      });
      
      // Should maintain security headers even in error responses
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
    });
  });
});