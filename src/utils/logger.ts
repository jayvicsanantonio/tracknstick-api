/**
 * Custom logger for Cloudflare Workers environment
 * Replacement for Winston that works in the edge runtime
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger {
  private context: string;
  private defaultMetadata: Record<string, any>;
  /**
   * Immutable on purpose. A Workers isolate serves concurrent requests off
   * one module scope, so a mutable level on the shared root logger would
   * leak across in-flight requests.
   */
  private readonly minLevel: LogLevel;

  constructor(
    context: string,
    defaultMetadata: Record<string, any> = {},
    minLevel: LogLevel = 'info'
  ) {
    this.context = context;
    this.defaultMetadata = defaultMetadata;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_RANK[level] >= LEVEL_RANK[this.minLevel];
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
    if (!this.shouldLog('debug')) return;
    console.debug(this.formatMessage(message, 'debug', metadata));
  }

  /**
   * Log an info message
   */
  info(message: string, metadata: Record<string, any> = {}): void {
    if (!this.shouldLog('info')) return;
    console.info(this.formatMessage(message, 'info', metadata));
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata: Record<string, any> = {}): void {
    if (!this.shouldLog('warn')) return;
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
    if (!this.shouldLog('error')) return;
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
  child(
    context: string,
    metadata: Record<string, any> = {},
    minLevel: LogLevel = this.minLevel
  ): Logger {
    const childContext = `${this.context}:${context}`;
    const childMetadata = { ...this.defaultMetadata, ...metadata };
    return new Logger(childContext, childMetadata, minLevel);
  }
}

// Create a root logger instance.
// 'info' is the safe default: c.env.ENVIRONMENT is per-invocation state and
// cannot be read at module scope on Workers, so the root logger cannot
// self-configure. A handler holding c.env can build a child at 'debug'.
const rootLogger = new Logger('api');

// Export default logger
export default rootLogger;
