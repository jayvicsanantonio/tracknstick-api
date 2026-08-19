// Guards the rate limiter's endpoint keys against the routes actually mounted
// A key that matches no route silently disables its own policy

import { describe, it, expect } from 'vitest';
import { getSecurityConfig } from '../security.js';

// Mirrors the app.route() calls in src/index.ts
const MOUNTED_PREFIXES = [
  '/api/v1/habits',
  '/api/v1/progress',
  '/api/v1/achievements',
  '/api/v1/chat',
  '/health',
];

// Paths that carry an explicit policy today. Achievements and chat are
// deliberately absent -- they fall through to the global limit, and adding
// policy for them is a product decision, not a bug fix.
const POLICED_PATHS = [
  '/api/v1/habits',
  '/api/v1/habits/42/trackers',
  '/api/v1/progress/history',
  '/health',
];

/** Mirrors RateLimitMiddleware.getEndpointConfig resolution. */
function resolveKey(
  endpointLimits: Record<string, unknown>,
  path: string
): string | null {
  if (endpointLimits[path]) return path;
  for (const pattern of Object.keys(endpointLimits)) {
    if (path.startsWith(pattern)) return pattern;
  }
  return null;
}

describe.each(['development', 'production', 'test'])(
  'endpointLimits in %s',
  (env) => {
    const { endpointLimits } = getSecurityConfig(env).rateLimit;

    it('only declares keys that prefix a mounted route', () => {
      for (const key of Object.keys(endpointLimits)) {
        const matches = MOUNTED_PREFIXES.some((p) => p.startsWith(key));
        expect(matches, `"${key}" prefixes no mounted route`).toBe(true);
      }
    });
  }
);

describe('production endpoint policy actually applies', () => {
  const { endpointLimits } = getSecurityConfig('production').rateLimit;

  it.each(POLICED_PATHS)('resolves a policy for %s', (path) => {
    expect(resolveKey(endpointLimits, path), path).not.toBeNull();
  });

  it('exempts the health route from rate limiting', () => {
    const key = resolveKey(endpointLimits, '/health');
    expect(key).not.toBeNull();
    const entry = endpointLimits[key as string];
    expect(entry.skipIf?.('/health')).toBe(true);
  });
});
