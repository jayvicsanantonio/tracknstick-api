import { Context, MiddlewareHandler, Next } from 'hono';
import logger from '../utils/logger.js';

interface PerformanceMetrics {
  path: string;
  method: string;
  duration: number;
  statusCode: number;
  userId?: string;
  timestamp: string;
}

/**
 * Performance monitoring middleware
 * Tracks request duration and logs slow requests
 */
export const performanceMonitor = (options: {
  slowRequestThreshold?: number; // milliseconds
  logAllRequests?: boolean;
} = {}): MiddlewareHandler => {
  const { 
    slowRequestThreshold = 1000, // 1 second default
    logAllRequests = false 
  } = options;

  return async (c: Context, next: Next) => {
    const startTime = Date.now();
    const startHrTime = process.hrtime?.() || [0, 0];

    // Execute the request
    await next();

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Get high-resolution time if available (more accurate)
    let precisionDuration = duration;
    if (process.hrtime) {
      const [seconds, nanoseconds] = process.hrtime(startHrTime);
      precisionDuration = seconds * 1000 + nanoseconds / 1000000;
    }

    const metrics: PerformanceMetrics = {
      path: c.req.path,
      method: c.req.method,
      duration: Math.round(precisionDuration * 100) / 100, // Round to 2 decimal places
      statusCode: c.res.status,
      userId: c.get('auth')?.userId,
      timestamp: new Date().toISOString(),
    };

    // Add performance header
    c.header('X-Response-Time', `${metrics.duration}ms`);

    // Log slow requests
    if (metrics.duration > slowRequestThreshold) {
      logger.warn('Slow request detected', {
        ...metrics,
        threshold: slowRequestThreshold,
        userAgent: c.req.header('User-Agent'),
        ip: c.req.header('CF-Connecting-IP'),
      });
    }

    // Log all requests if enabled (useful for development)
    if (logAllRequests) {
      logger.info('Request completed', metrics);
    }

    // Log errors with performance context
    if (metrics.statusCode >= 400) {
      logger.info('Request completed with error', {
        ...metrics,
        userAgent: c.req.header('User-Agent'),
        ip: c.req.header('CF-Connecting-IP'),
      });
    }

    // Store metrics in context for potential use by other middleware
    c.set('performanceMetrics', metrics);
  };
};

/**
 * Get performance statistics from stored metrics
 * This is a simple in-memory implementation
 * For production, consider using external analytics services
 */
class PerformanceStats {
  private metrics: PerformanceMetrics[] = [];
  private maxStoredMetrics = 1000; // Limit memory usage

  addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Keep only recent metrics to prevent memory leaks
    if (this.metrics.length > this.maxStoredMetrics) {
      this.metrics = this.metrics.slice(-this.maxStoredMetrics);
    }
  }

  getStats() {
    if (this.metrics.length === 0) {
      return null;
    }

    const durations = this.metrics.map(m => m.duration);
    const sorted = [...durations].sort((a, b) => a - b);

    return {
      totalRequests: this.metrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      medianDuration: sorted[Math.floor(sorted.length / 2)],
      p95Duration: sorted[Math.floor(sorted.length * 0.95)],
      p99Duration: sorted[Math.floor(sorted.length * 0.99)],
      slowestRequest: Math.max(...durations),
      fastestRequest: Math.min(...durations),
      errorRate: this.metrics.filter(m => m.statusCode >= 400).length / this.metrics.length,
    };
  }

  getSlowEndpoints(threshold = 500) {
    const endpointStats = new Map<string, { count: number; totalDuration: number; maxDuration: number }>();

    this.metrics
      .filter(m => m.duration > threshold)
      .forEach(metric => {
        const key = `${metric.method} ${metric.path}`;
        const existing = endpointStats.get(key) || { count: 0, totalDuration: 0, maxDuration: 0 };
        
        endpointStats.set(key, {
          count: existing.count + 1,
          totalDuration: existing.totalDuration + metric.duration,
          maxDuration: Math.max(existing.maxDuration, metric.duration),
        });
      });

    return Array.from(endpointStats.entries()).map(([endpoint, stats]) => ({
      endpoint,
      slowRequestCount: stats.count,
      averageDuration: stats.totalDuration / stats.count,
      maxDuration: stats.maxDuration,
    }));
  }
}

// Export singleton instance for basic stats collection
export const performanceStats = new PerformanceStats();