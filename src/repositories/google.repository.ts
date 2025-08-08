// @ts-nocheck
import { D1Database } from '@cloudflare/workers-types';

export type GoogleAccount = {
  id: number;
  clerk_user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  scope: string | null;
  token_type: string | null;
  expiry_date: string | null;
};

export async function upsertGoogleAccount(
  db: D1Database,
  clerkUserId: string,
  {
    accessToken,
    refreshToken,
    scope,
    tokenType,
    expiryDate,
  }: {
    accessToken: string;
    refreshToken?: string | null;
    scope?: string | null;
    tokenType?: string | null;
    expiryDate?: string | null;
  }
): Promise<void> {
  const exists = await db
    .prepare('SELECT id FROM google_accounts WHERE clerk_user_id = ?')
    .bind(clerkUserId)
    .first<{ id: number }>();

  if (exists) {
    await db
      .prepare(
        `UPDATE google_accounts SET access_token = ?, refresh_token = COALESCE(?, refresh_token), scope = ?, token_type = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP WHERE clerk_user_id = ?`
      )
      .bind(
        accessToken,
        refreshToken || null,
        scope || null,
        tokenType || null,
        expiryDate || null,
        clerkUserId
      )
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO google_accounts (clerk_user_id, access_token, refresh_token, scope, token_type, expiry_date) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        clerkUserId,
        accessToken,
        refreshToken || null,
        scope || null,
        tokenType || null,
        expiryDate || null
      )
      .run();
  }
}

export async function getGoogleAccount(
  db: D1Database,
  clerkUserId: string
): Promise<GoogleAccount | null> {
  const row = await db
    .prepare(
      'SELECT id, clerk_user_id, access_token, refresh_token, scope, token_type, expiry_date FROM google_accounts WHERE clerk_user_id = ?'
    )
    .bind(clerkUserId)
    .first<GoogleAccount>();
  return (row as GoogleAccount) || null;
}

export async function saveHabitEventMapping(
  db: D1Database,
  userId: string,
  habitId: number | string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO habit_google_events (habit_id, user_id, calendar_id, event_id) VALUES (?, ?, ?, ?) ON CONFLICT(habit_id, user_id) DO UPDATE SET event_id = excluded.event_id, calendar_id = excluded.calendar_id, updated_at = CURRENT_TIMESTAMP`
    )
    .bind(habitId, userId, calendarId, eventId)
    .run();
}

export async function getHabitEventMapping(
  db: D1Database,
  userId: string,
  habitId: number | string
): Promise<{ event_id: string; calendar_id: string } | null> {
  const row = await db
    .prepare(
      'SELECT event_id, calendar_id FROM habit_google_events WHERE habit_id = ? AND user_id = ?'
    )
    .bind(habitId, userId)
    .first<{ event_id: string; calendar_id: string }>();
  return (row as any) || null;
}

export async function deleteHabitEventMapping(
  db: D1Database,
  userId: string,
  habitId: number | string
): Promise<void> {
  await db
    .prepare('DELETE FROM habit_google_events WHERE habit_id = ? AND user_id = ?')
    .bind(habitId, userId)
    .run();
}

export async function createOAuthState(
  db: D1Database,
  state: string,
  userId: string,
  expiresAtISO: string
): Promise<void> {
  await db
    .prepare('INSERT INTO oauth_states (state, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(state, userId, expiresAtISO)
    .run();
}

export async function verifyAndConsumeOAuthState(
  db: D1Database,
  state: string,
  userId: string
): Promise<boolean> {
  const row = await db
    .prepare('SELECT state, user_id, expires_at FROM oauth_states WHERE state = ?')
    .bind(state)
    .first<{ state: string; user_id: string; expires_at: string }>();

  if (!row || row.user_id !== userId) return false;

  if (new Date(row.expires_at).getTime() < Date.now()) return false;

  await db.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();
  return true;
}