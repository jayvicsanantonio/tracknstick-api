import { z } from 'zod';
import { ValidationError } from './errors.js';

// Define the configuration schema
const configSchema = z.object({
  ENVIRONMENT: z.enum(['development', 'production', 'test']).default('development'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  DB: z.any(), // D1Database type - can't validate at runtime
});

export type Config = z.infer<typeof configSchema>;

/**
 * Validate and return the configuration from the environment
 */
export function validateConfig(env: any): Config {
  try {
    return configSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      
      throw new ValidationError(
        `Configuration validation failed: ${missingVars}`,
        error.errors
      );
    }
    throw error;
  }
}

/**
 * Check if we're running in production
 */
export function isProduction(config: Config): boolean {
  return config.ENVIRONMENT === 'production';
}

/**
 * Check if we're running in development
 */
export function isDevelopment(config: Config): boolean {
  return config.ENVIRONMENT === 'development';
}

/**
 * Check if we're running in test mode
 */
export function isTest(config: Config): boolean {
  return config.ENVIRONMENT === 'test';
}

/**
 * Get log level based on environment
 */
export function getLogLevel(config: Config): 'debug' | 'info' | 'warn' | 'error' {
  switch (config.ENVIRONMENT) {
    case 'development':
      return 'debug';
    case 'test':
      return 'warn';
    case 'production':
    default:
      return 'info';
  }
}