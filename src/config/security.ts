// Security configuration module with environment-aware policies
// Provides centralized configuration for all security-related settings

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface CorsConfig {
  origins: string[];
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
}

export interface RateLimitConfig {
  globalLimit: number;
  windowMs: number;
  endpointLimits: Record<string, EndpointLimit>;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

export interface EndpointLimit {
  limit: number;
  windowMs: number;
  skipIf?: (path: string) => boolean;
}

export interface ErrorConfig {
  showStackTrace: boolean;
  showErrorDetails: boolean;
  logLevel: LogLevel;
}

export interface SecurityHeadersConfig {
  enableHsts: boolean;
  enableContentTypeOptions: boolean;
  enableFrameOptions: boolean;
  enableXssProtection: boolean;
}

export interface SecurityConfig {
  cors: CorsConfig;
  rateLimit: RateLimitConfig;
  errorHandling: ErrorConfig;
  headers: SecurityHeadersConfig;
}

export type Environment = 'development' | 'production' | 'test';

/**
 * Detects the current environment from various sources
 */
export function detectEnvironment(): Environment {
  // Check ENVIRONMENT variable first (from wrangler.toml)
  const envVar = (globalThis as any).ENVIRONMENT;
  if (envVar === 'development' || envVar === 'production' || envVar === 'test') {
    return envVar;
  }

  // Check NODE_ENV as fallback
  const nodeEnv = process?.env?.NODE_ENV;
  if (nodeEnv === 'development' || nodeEnv === 'production' || nodeEnv === 'test') {
    return nodeEnv;
  }

  // Default to production for security
  return 'production';
}

/**
 * Development security configuration - more permissive for debugging
 */
const developmentConfig: SecurityConfig = {
  cors: {
    origins: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  rateLimit: {
    globalLimit: 1000,
    windowMs: 15 * 60 * 1000, // 15 minutes
    endpointLimits: {
      '/api/auth': { limit: 100, windowMs: 15 * 60 * 1000 },
      '/api/habits': { limit: 200, windowMs: 15 * 60 * 1000 },
    },
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  errorHandling: {
    showStackTrace: true,
    showErrorDetails: true,
    logLevel: 'debug',
  },
  headers: {
    enableHsts: false,
    enableContentTypeOptions: true,
    enableFrameOptions: true,
    enableXssProtection: true,
  },
};

/**
 * Production security configuration - restrictive for security
 */
const productionConfig: SecurityConfig = {
  cors: {
    origins: ['https://tracknstick.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  rateLimit: {
    globalLimit: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    endpointLimits: {
      '/api/auth': { limit: 10, windowMs: 15 * 60 * 1000 },
      '/api/habits': { limit: 50, windowMs: 15 * 60 * 1000 },
      '/api/progress': { limit: 30, windowMs: 15 * 60 * 1000 },
      '/api/health': { 
        limit: 1000, 
        windowMs: 15 * 60 * 1000,
        skipIf: (path: string) => path === '/api/health'
      },
    },
    skipSuccessfulRequests: false,
    skipFailedRequests: true,
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

/**
 * Test security configuration - minimal restrictions for testing
 */
const testConfig: SecurityConfig = {
  cors: {
    origins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  rateLimit: {
    globalLimit: 10000,
    windowMs: 60 * 1000, // 1 minute for faster test cycles
    endpointLimits: {},
    skipSuccessfulRequests: true,
    skipFailedRequests: true,
  },
  errorHandling: {
    showStackTrace: true,
    showErrorDetails: true,
    logLevel: 'error',
  },
  headers: {
    enableHsts: false,
    enableContentTypeOptions: false,
    enableFrameOptions: false,
    enableXssProtection: false,
  },
};

/**
 * Gets security configuration based on current environment
 */
export function getSecurityConfig(): SecurityConfig {
  const environment = detectEnvironment();
  
  switch (environment) {
    case 'development':
      return developmentConfig;
    case 'test':
      return testConfig;
    case 'production':
    default:
      return productionConfig;
  }
}

/**
 * Validates security configuration for completeness
 */
export function validateSecurityConfig(config: SecurityConfig): { 
  valid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];

  // Validate CORS configuration
  if (!config.cors.origins || config.cors.origins.length === 0) {
    errors.push('CORS origins must be specified');
  }

  // Validate rate limiting
  if (config.rateLimit.globalLimit <= 0) {
    errors.push('Global rate limit must be positive');
  }

  if (config.rateLimit.windowMs <= 0) {
    errors.push('Rate limit window must be positive');
  }

  // Validate endpoint limits
  for (const [endpoint, limit] of Object.entries(config.rateLimit.endpointLimits)) {
    if (limit.limit <= 0) {
      errors.push(`Rate limit for ${endpoint} must be positive`);
    }
    if (limit.windowMs <= 0) {
      errors.push(`Rate limit window for ${endpoint} must be positive`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}