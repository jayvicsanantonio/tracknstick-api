/**
 * Custom logger for Cloudflare Workers environment
 * Replacement for Winston that works in the edge runtime
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private context: string;
  private defaultMetadata: Record<string, any>;

  constructor(context: string, defaultMetadata: Record<string, any> = {}) {
    this.context = context;
    this.defaultMetadata = defaultMetadata;
  }

  /**
   * Format a log message with timestamp, level, and context
   */
  private formatMessage(
    message: string,
    level: LogLevel,
    metadata: Record<string, any> = {}
  ): string {
    const timestamp = new Date().toISOString();
    const combinedMetadata = { ...this.defaultMetadata, ...metadata };
    const metadataStr =
      Object.keys(combinedMetadata).length > 0
        ? JSON.stringify(combinedMetadata)
        : '';

    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message} ${metadataStr}`.trim();
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata: Record<string, any> = {}): void {
    if (process.env.NODE_ENV === 'production') return;
    console.debug(this.formatMessage(message, 'debug', metadata));
  }

  /**
   * Log an info message
   */
  info(message: string, metadata: Record<string, any> = {}): void {
    console.info(this.formatMessage(message, 'info', metadata));
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata: Record<string, any> = {}): void {
    console.warn(this.formatMessage(message, 'warn', metadata));
  }

  /**
   * Log an error message
   */
  error(
    message: string,
    error?: Error,
    metadata: Record<string, any> = {}
  ): void {
    const errorMetadata = error
      ? {
          ...metadata,
          errorName: error.name,
          errorMessage: error.message,
          stack: error.stack,
        }
      : metadata;

    console.error(this.formatMessage(message, 'error', errorMetadata));
  }

  /**
   * Create a child logger with additional context and metadata
   */
  child(context: string, metadata: Record<string, any> = {}): Logger {
    const childContext = `${this.context}:${context}`;
    const childMetadata = { ...this.defaultMetadata, ...metadata };
    return new Logger(childContext, childMetadata);
  }
}

// Create a root logger instance
const rootLogger = new Logger('api');

// Export default logger
export default rootLogger;
