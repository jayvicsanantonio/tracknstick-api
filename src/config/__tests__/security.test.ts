// Unit tests for security configuration system
// Tests environment detection, configuration loading, and validation

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectEnvironment,
  getSecurityConfig,
  validateSecurityConfig,
  type SecurityConfig,
  type Environment,
} from '../security.js';

describe('Security Configuration', () => {
  beforeEach(() => {
    // Clear any mocked globals before each test
    vi.clearAllMocks();
  });

  describe('detectEnvironment', () => {
    it('should detect production from ENVIRONMENT global', () => {
      (globalThis as any).ENVIRONMENT = 'production';
      
      const result = detectEnvironment();
      
      expect(result).toBe('production');
    });

    it('should detect development from ENVIRONMENT global', () => {
      (globalThis as any).ENVIRONMENT = 'development';
      
      const result = detectEnvironment();
      
      expect(result).toBe('development');
    });

    it('should detect test from ENVIRONMENT global', () => {
      (globalThis as any).ENVIRONMENT = 'test';
      
      const result = detectEnvironment();
      
      expect(result).toBe('test');
    });

    it('should fall back to NODE_ENV when ENVIRONMENT is not set', () => {
      delete (globalThis as any).ENVIRONMENT;
      process.env.NODE_ENV = 'development';
      
      const result = detectEnvironment();
      
      expect(result).toBe('development');
    });

    it('should default to production when no environment variables are set', () => {
      delete (globalThis as any).ENVIRONMENT;
      delete process.env.NODE_ENV;
      
      const result = detectEnvironment();
      
      expect(result).toBe('production');
    });

    it('should default to production for invalid environment values', () => {
      (globalThis as any).ENVIRONMENT = 'invalid';
      
      const result = detectEnvironment();
      
      expect(result).toBe('production');
    });
  });

  describe('getSecurityConfig', () => {
    it('should return development config for development environment', () => {
      (globalThis as any).ENVIRONMENT = 'development';
      
      const config = getSecurityConfig();
      
      expect(config.cors.origins).toContain('http://localhost:3000');
      expect(config.cors.origins).toContain('http://localhost:5173');
      expect(config.errorHandling.showStackTrace).toBe(true);
      expect(config.errorHandling.showErrorDetails).toBe(true);
      expect(config.headers.enableHsts).toBe(false);
    });

    it('should return production config for production environment', () => {
      (globalThis as any).ENVIRONMENT = 'production';
      
      const config = getSecurityConfig();
      
      expect(config.cors.origins).toEqual(['https://tracknstick.com']);
      expect(config.errorHandling.showStackTrace).toBe(false);
      expect(config.errorHandling.showErrorDetails).toBe(false);
      expect(config.headers.enableHsts).toBe(true);
      expect(config.rateLimit.globalLimit).toBe(100);
    });

    it('should return test config for test environment', () => {
      (globalThis as any).ENVIRONMENT = 'test';
      
      const config = getSecurityConfig();
      
      expect(config.cors.origins).toContain('http://localhost:3000');
      expect(config.rateLimit.globalLimit).toBe(10000);
      expect(config.rateLimit.skipSuccessfulRequests).toBe(true);
      expect(config.headers.enableHsts).toBe(false);
    });

    it('should have different rate limits per environment', () => {
      // Test production limits
      (globalThis as any).ENVIRONMENT = 'production';
      const prodConfig = getSecurityConfig();
      
      // Test development limits
      (globalThis as any).ENVIRONMENT = 'development';
      const devConfig = getSecurityConfig();
      
      expect(prodConfig.rateLimit.globalLimit).toBeLessThan(devConfig.rateLimit.globalLimit);
      expect(prodConfig.rateLimit.endpointLimits['/api/auth'].limit)
        .toBeLessThan(devConfig.rateLimit.endpointLimits['/api/auth'].limit);
    });
  });

  describe('validateSecurityConfig', () => {
    let validConfig: SecurityConfig;

    beforeEach(() => {
      validConfig = {
        cors: {
          origins: ['https://example.com'],
          methods: ['GET', 'POST'],
          allowedHeaders: ['Content-Type'],
          credentials: true,
        },
        rateLimit: {
          globalLimit: 100,
          windowMs: 60000,
          endpointLimits: {
            '/api/test': { limit: 10, windowMs: 60000 },
          },
          skipSuccessfulRequests: false,
          skipFailedRequests: false,
        },
        errorHandling: {
          showStackTrace: false,
          showErrorDetails: false,
          logLevel: 'warn',
        },
        headers: {
          enableHsts: true,
          enableContentTypeOptions: true,
          enableFrameOptions: true,
          enableXssProtection: true,
        },
      };
    });

    it('should validate a correct configuration', () => {
      const result = validateSecurityConfig(validConfig);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject config with empty CORS origins', () => {
      validConfig.cors.origins = [];
      
      const result = validateSecurityConfig(validConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CORS origins must be specified');
    });

    it('should reject config with negative global rate limit', () => {
      validConfig.rateLimit.globalLimit = -1;
      
      const result = validateSecurityConfig(validConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Global rate limit must be positive');
    });

    it('should reject config with zero rate limit window', () => {
      validConfig.rateLimit.windowMs = 0;
      
      const result = validateSecurityConfig(validConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Rate limit window must be positive');
    });

    it('should reject config with negative endpoint rate limit', () => {
      validConfig.rateLimit.endpointLimits['/api/test'].limit = -5;
      
      const result = validateSecurityConfig(validConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Rate limit for /api/test must be positive');
    });

    it('should reject config with zero endpoint window', () => {
      validConfig.rateLimit.endpointLimits['/api/test'].windowMs = 0;
      
      const result = validateSecurityConfig(validConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Rate limit window for /api/test must be positive');
    });

    it('should collect multiple validation errors', () => {
      validConfig.cors.origins = [];
      validConfig.rateLimit.globalLimit = -1;
      validConfig.rateLimit.windowMs = 0;
      
      const result = validateSecurityConfig(validConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('environment-specific configurations', () => {
    it('should have stricter production CORS settings', () => {
      (globalThis as any).ENVIRONMENT = 'production';
      const prodConfig = getSecurityConfig();
      
      (globalThis as any).ENVIRONMENT = 'development';
      const devConfig = getSecurityConfig();
      
      expect(prodConfig.cors.origins).toHaveLength(1);
      expect(prodConfig.cors.origins[0]).toMatch(/^https:/);
      expect(devConfig.cors.origins.length).toBeGreaterThan(1);
      expect(devConfig.cors.origins.some(origin => origin.includes('localhost'))).toBe(true);
    });

    it('should have different error handling per environment', () => {
      (globalThis as any).ENVIRONMENT = 'production';
      const prodConfig = getSecurityConfig();
      
      (globalThis as any).ENVIRONMENT = 'development';
      const devConfig = getSecurityConfig();
      
      expect(prodConfig.errorHandling.showStackTrace).toBe(false);
      expect(prodConfig.errorHandling.showErrorDetails).toBe(false);
      expect(devConfig.errorHandling.showStackTrace).toBe(true);
      expect(devConfig.errorHandling.showErrorDetails).toBe(true);
    });

    it('should enable HSTS only in production', () => {
      (globalThis as any).ENVIRONMENT = 'production';
      const prodConfig = getSecurityConfig();
      
      (globalThis as any).ENVIRONMENT = 'development';
      const devConfig = getSecurityConfig();
      
      expect(prodConfig.headers.enableHsts).toBe(true);
      expect(devConfig.headers.enableHsts).toBe(false);
    });
  });
});