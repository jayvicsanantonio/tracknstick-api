// @ts-nocheck
import { D1Database } from '@cloudflare/workers-types';
import * as googleRepo from '../repositories/google.repository.js';
import logger from '../utils/logger.js';

function toGoogleByDay(days: string[]): string {
  const map: Record<string, string> = {
    Mon: 'MO',
    Tue: 'TU',
    Wed: 'WE',
    Thu: 'TH',
    Fri: 'FR',
    Sat: 'SA',
    Sun: 'SU',
  };
  return days.map((d) => map[d]).filter(Boolean).join(',');
}

function addMinutes(iso: string, minutes: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

export async function getAuthorizationUrl(
  env: { GOOGLE_CLIENT_ID: string; GOOGLE_REDIRECT_URI: string },
  db: D1Database,
  userId: string
): Promise<string> {
  const state = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await googleRepo.createOAuthState(db, state, userId, expiresAt);

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ].join(' '),
    state,
    include_granted_scopes: 'true',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  env: {
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_REDIRECT_URI: string;
  },
  db: D1Database,
  userId: string,
  code: string,
  state: string
): Promise<void> {
  const ok = await googleRepo.verifyAndConsumeOAuthState(db, state, userId);
  if (!ok) throw new Error('Invalid OAuth state');

  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!response.ok) {
    const text = await response.text();
    logger.error('Google token exchange failed', { text });
    throw new Error('Failed to exchange code');
  }
  const json = await response.json();
  const expiryDate = json.expires_in
    ? new Date(Date.now() + json.expires_in * 1000).toISOString()
    : null;

  await googleRepo.upsertGoogleAccount(db, userId, {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || null,
    scope: json.scope || null,
    tokenType: json.token_type || null,
    expiryDate,
  });
}

async function getValidAccessToken(
  env: { GOOGLE_CLIENT_ID: string; GOOGLE_CLIENT_SECRET: string },
  db: D1Database,
  userId: string
): Promise<string | null> {
  const account = await googleRepo.getGoogleAccount(db, userId);
  if (!account) return null;

  const notExpired = account.expiry_date
    ? new Date(account.expiry_date).getTime() > Date.now() + 60 * 1000
    : !!account.access_token;

  if (notExpired) return account.access_token;

  if (!account.refresh_token) return null;

  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: account.refresh_token,
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!response.ok) {
    const text = await response.text();
    logger.error('Google token refresh failed', { text });
    return null;
  }
  const json = await response.json();
  const expiryDate = json.expires_in
    ? new Date(Date.now() + json.expires_in * 1000).toISOString()
    : null;

  await googleRepo.upsertGoogleAccount(db, userId, {
    accessToken: json.access_token,
    refreshToken: account.refresh_token,
    scope: json.scope || account.scope,
    tokenType: json.token_type || account.token_type,
    expiryDate,
  });

  return json.access_token as string;
}

function buildRecurringEventPayload(
  habit: {
    name: string;
    frequency: string[];
    startDate: string;
    endDate?: string | null;
  }
) {
  const startISO = habit.startDate;
  const endISO = addMinutes(habit.startDate, 30);
  const byDay = toGoogleByDay(habit.frequency);

  const rruleParts = [`FREQ=WEEKLY`, `BYDAY=${byDay}`, 'WKST=MO'];
  if (habit.endDate) {
    const until = new Date(habit.endDate)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z')
      .replace(/Z$/, 'Z');
    rruleParts.push(`UNTIL=${until.replace(/\..*Z$/, 'Z').replace(/[-:]/g, '')}`);
  }

  return {
    summary: habit.name,
    start: { dateTime: startISO, timeZone: 'UTC' },
    end: { dateTime: endISO, timeZone: 'UTC' },
    recurrence: [`RRULE:${rruleParts.join(';')}`],
  };
}

export async function createOrUpdateHabitEvent(
  env: { GOOGLE_CLIENT_ID: string; GOOGLE_CLIENT_SECRET: string },
  db: D1Database,
  userId: string,
  habitId: number | string,
  habit: { name: string; frequency: string[]; startDate: string; endDate?: string | null }
): Promise<void> {
  const accessToken = await getValidAccessToken(env, db, userId);
  if (!accessToken) return; // User not connected

  const mapping = await googleRepo.getHabitEventMapping(db, userId, habitId);
  const payload = buildRecurringEventPayload(habit);

  if (!mapping) {
    // Create new event
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
    if (!response.ok) {
      const text = await response.text();
      logger.error('Google event create failed', { text });
      return;
    }
    const json = await response.json();
    await googleRepo.saveHabitEventMapping(db, userId, habitId, json.id, 'primary');
  } else {
    // Update existing event
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(mapping.calendar_id)}/events/${encodeURIComponent(mapping.event_id)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
    if (!response.ok) {
      const text = await response.text();
      logger.error('Google event update failed', { text });
      return;
    }
  }
}

export async function deleteHabitEvent(
  env: { GOOGLE_CLIENT_ID: string; GOOGLE_CLIENT_SECRET: string },
  db: D1Database,
  userId: string,
  habitId: number | string
): Promise<void> {
  const accessToken = await getValidAccessToken(env, db, userId);
  if (!accessToken) return;

  const mapping = await googleRepo.getHabitEventMapping(db, userId, habitId);
  if (!mapping) return;

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(mapping.calendar_id)}/events/${encodeURIComponent(mapping.event_id)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    logger.error('Google event delete failed', { text });
    return;
  }

  await googleRepo.deleteHabitEventMapping(db, userId, habitId);
}