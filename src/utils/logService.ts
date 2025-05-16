/**
 * Enhanced logging service with structured logging
 * Uses latest JavaScript features supported by Wrangler v4
 */

// Define a disposable logger that automatically cleans up resources
class LoggingResource {
  private context: string;
  private startTime: number;

  constructor(context: string) {
    this.context = context;
    this.startTime = performance.now();
    console.info(`[${this.context}] Started`);
  }

  info(message: string, data?: Record<string, any>): void {
    console.info(`[${this.context}] ${message}`, data);
  }

  warn(message: string, data?: Record<string, any>): void {
    console.warn(`[${this.context}] ${message}`, data);
  }

  error(message: string, error?: Error, data?: Record<string, any>): void {
    console.error(
      `[${this.context}] ${message}`,
      error ? { error: error.message, stack: error.stack, ...data } : data
    );
  }

  // Implement Symbol.dispose for automatic cleanup
  [Symbol.dispose](): void {
    const duration = Math.round(performance.now() - this.startTime);
    console.info(`[${this.context}] Completed in ${duration}ms`);
  }
}

// Example use of JSON module import (enabled in Wrangler v4)
import config from './logger-config.json' with { type: 'json' };

// Function to create a disposable logger
export function createLogger(context: string): LoggingResource {
  return new LoggingResource(`${config.appName}:${context}`);
}

// Log API requests with timing information
export async function logApiRequest(
  context: string,
  callback: () => Promise<any>
): Promise<any> {
  // The 'using' keyword automatically calls Symbol.dispose when exiting scope
  using logger = createLogger(`api:${context}`);

  try {
    const result = await callback();
    return result;
  } catch (error) {
    logger.error('Request failed', error as Error);
    throw error;
  }
}
