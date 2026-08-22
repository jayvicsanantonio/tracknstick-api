// Verifies security headers reach every response shape
// Regression guard for handlers that return a raw Response

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { securityHeaders } from '../securityHeaders.js';

function buildApp(handler: (c: never) => Response) {
  const app = new Hono();
  app.use('*', securityHeaders());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.get('/', handler as any);
  return app;
}

const ENV = { ENVIRONMENT: 'production' };

const EXPECTED = [
  'X-Content-Type-Options',
  'X-Frame-Options',
  'X-XSS-Protection',
  'Referrer-Policy',
  'Permissions-Policy',
  'Strict-Transport-Security',
];

describe('securityHeaders', () => {
  it('sets headers on a c.json response', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = buildApp(((c: any) => c.json({ ok: true })) as never);
    const res = await app.fetch(new Request('http://x/'), ENV);

    for (const header of EXPECTED) {
      expect(res.headers.get(header), header).not.toBeNull();
    }
  });

  it('sets headers on a handler that returns a raw Response', async () => {
    // This is the streaming-chat shape: the handler builds its own Response,
    // so Hono never flushes preparedHeaders.
    const app = buildApp((() => new Response('stream body')) as never);
    const res = await app.fetch(new Request('http://x/'), ENV);

    expect(await res.text()).toBe('stream body');
    for (const header of EXPECTED) {
      expect(res.headers.get(header), header).not.toBeNull();
    }
  });

  it('omits HSTS outside production', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = buildApp(((c: any) => c.json({ ok: true })) as never);
    const res = await app.fetch(new Request('http://x/'), {
      ENVIRONMENT: 'development',
    });

    expect(res.headers.get('Strict-Transport-Security')).toBeNull();
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
