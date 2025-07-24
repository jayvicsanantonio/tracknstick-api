import { Context, MiddlewareHandler, Next } from 'hono';
import { isProduction } from '../utils/config.js';

/**
 * Comprehensive security headers middleware
 * Provides protection against various web vulnerabilities
 */
export const securityHeaders = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const config = c.get('config');
    const isProd = isProduction(config);

    // Content Security Policy
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Relaxed for API, tighten for web apps
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "media-src 'self'",
      "object-src 'none'",
      "child-src 'none'",
      "worker-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      isProd ? "upgrade-insecure-requests" : "",
    ].filter(Boolean).join('; ');

    // Set comprehensive security headers
    c.header('Content-Security-Policy', cspDirectives);
    
    // Prevent clickjacking
    c.header('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    c.header('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    c.header('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions policy (formerly Feature Policy)
    c.header('Permissions-Policy', [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'magnetometer=()',
      'gyroscope=()',
      'payment=()',
      'usb=()',
    ].join(', '));

    // HSTS (only in production with HTTPS)
    if (isProd) {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Prevent caching of sensitive content
    if (c.req.path.includes('/api/')) {
      c.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      c.header('Pragma', 'no-cache');
      c.header('Expires', '0');
    }

    // Remove server information
    c.header('Server', ''); // Hide server information
    
    // Add custom security header for API identification
    c.header('X-API-Version', '1.0.0');
    c.header('X-Powered-By', ''); // Remove default powered-by header

    await next();
  };
};