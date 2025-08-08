import { Hono } from 'hono';
import { clerkMiddleware } from '../middlewares/clerkMiddleware.js';
import * as googleService from '../services/google.service.js';

const app = new Hono();

app.use('*', clerkMiddleware());

// GET /api/v1/google/auth -> redirect to Google consent
app.get('/auth', async (c) => {
  const { userId } = c.get('auth');
  const url = await googleService.getAuthorizationUrl(
    {
      GOOGLE_CLIENT_ID: (c.env as any).GOOGLE_CLIENT_ID,
      GOOGLE_REDIRECT_URI: (c.env as any).GOOGLE_REDIRECT_URI,
    } as any,
    (c.env as any).DB,
    userId
  );
  return c.redirect(url, 302);
});

// GET /api/v1/google/callback -> handle OAuth callback
app.get('/callback', async (c) => {
  const { userId } = c.get('auth');
  const code = c.req.query('code');
  const state = c.req.query('state');
  if (!code || !state) return c.json({ error: { message: 'Missing code/state' } }, 400);

  await googleService.exchangeCodeForTokens(
    {
      GOOGLE_CLIENT_ID: (c.env as any).GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: (c.env as any).GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: (c.env as any).GOOGLE_REDIRECT_URI,
    } as any,
    (c.env as any).DB,
    userId,
    code,
    state
  );

  return c.json({ message: 'Google account connected' }, 200);
});

export default app;