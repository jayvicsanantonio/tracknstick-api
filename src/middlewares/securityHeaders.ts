// Applies environment-aware security response headers
// Runs after the handler so headers reach every response shape

import { Context, MiddlewareHandler, Next } from 'hono';
import { getSecurityConfig } from '../config/security.js';

/**
 * Sets security headers on the outgoing response.
 *
 * These are applied *after* next() on purpose. Before the context is
 * finalized, c.header() writes into Hono's internal preparedHeaders, which
 * are flushed only by c.json/c.text/c.body. A handler that returns a raw
 * Response -- the streaming chat endpoint does -- never triggers that flush,
 * so headers set before next() are silently dropped. After next() the
 * context is finalized and c.header() writes straight to the response.
 */
export const securityHeaders = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    await next();

    const config = getSecurityConfig(c.env.ENVIRONMENT);

    if (config.headers.enableHsts) {
      c.header(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
    }

    if (config.headers.enableContentTypeOptions) {
      c.header('X-Content-Type-Options', 'nosniff');
    }

    if (config.headers.enableFrameOptions) {
      c.header('X-Frame-Options', 'DENY');
    }

    if (config.headers.enableXssProtection) {
      c.header('X-XSS-Protection', '1; mode=block');
    }

    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  };
};
