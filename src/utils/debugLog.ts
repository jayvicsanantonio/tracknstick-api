/**
 * Simple debug logging utility to avoid circular dependencies with the main logger
 */

export function debugLog(message: string, data?: any): void {
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[DEBUG] ${message}`, data || '');
  }
}

export function errorLog(message: string, error?: Error): void {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${message}`, error || '');
  }
}

export function warnLog(message: string, data?: any): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[WARN] ${message}`, data || '');
  }
}