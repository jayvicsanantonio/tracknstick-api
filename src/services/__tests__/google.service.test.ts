import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as googleService from '../google.service.js';
import * as googleRepo from '../../repositories/google.repository.js';

const env = {
  GOOGLE_CLIENT_ID: 'cid',
  GOOGLE_CLIENT_SECRET: 'secret',
};

// Minimal fake D1Database; not used directly since we mock repo
const db: any = {};

describe('google.service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('creates a new recurring event and saves mapping when none exists', async () => {
    // Mock account with a valid access token
    vi.spyOn(googleRepo, 'getGoogleAccount').mockResolvedValue({
      id: 1,
      clerk_user_id: 'u1',
      access_token: 'at',
      refresh_token: null,
      scope: null,
      token_type: 'Bearer',
      expiry_date: new Date(Date.now() + 3600_000).toISOString(),
    } as any);

    // No existing mapping
    vi.spyOn(googleRepo, 'getHabitEventMapping').mockResolvedValue(null);

    // Capture save mapping
    const saveSpy = vi
      .spyOn(googleRepo, 'saveHabitEventMapping')
      .mockResolvedValue();

    // Mock fetch for create
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'evt_123' }),
    })) as any);

    await googleService.createOrUpdateHabitEvent(
      env as any,
      db,
      'user-1',
      42,
      {
        name: 'Drink Water',
        frequency: ['Mon', 'Wed', 'Fri'],
        startDate: '2025-01-01T09:00:00Z',
        endDate: '2025-02-01T09:00:00Z',
      }
    );

    expect(fetch).toHaveBeenCalledOnce();
    expect(saveSpy).toHaveBeenCalledWith(db, 'user-1', 42, 'evt_123', 'primary');
  });

  it('updates an existing recurring event when mapping exists', async () => {
    // Mock account
    vi.spyOn(googleRepo, 'getGoogleAccount').mockResolvedValue({
      id: 1,
      clerk_user_id: 'u1',
      access_token: 'at',
      refresh_token: null,
      scope: null,
      token_type: 'Bearer',
      expiry_date: new Date(Date.now() + 3600_000).toISOString(),
    } as any);

    // Existing mapping
    vi.spyOn(googleRepo, 'getHabitEventMapping').mockResolvedValue({
      event_id: 'evt_123',
      calendar_id: 'primary',
    });

    // Mock fetch for update
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })) as any);

    await googleService.createOrUpdateHabitEvent(
      env as any,
      db,
      'user-1',
      42,
      {
        name: 'Read Book',
        frequency: ['Tue', 'Thu'],
        startDate: '2025-01-01T08:00:00Z',
      }
    );

    expect(fetch).toHaveBeenCalledOnce();
    const url = (fetch as any).mock.calls[0][0] as string;
    expect(url).toContain('/calendars/primary/events/evt_123');
    const options = (fetch as any).mock.calls[0][1];
    expect(options.method).toBe('PATCH');
  });

  it('deletes an existing recurring event and removes mapping', async () => {
    // Mock account
    vi.spyOn(googleRepo, 'getGoogleAccount').mockResolvedValue({
      id: 1,
      clerk_user_id: 'u1',
      access_token: 'at',
      refresh_token: null,
      scope: null,
      token_type: 'Bearer',
      expiry_date: new Date(Date.now() + 3600_000).toISOString(),
    } as any);

    // Existing mapping
    vi.spyOn(googleRepo, 'getHabitEventMapping').mockResolvedValue({
      event_id: 'evt_456',
      calendar_id: 'primary',
    });

    const delMapSpy = vi
      .spyOn(googleRepo, 'deleteHabitEventMapping')
      .mockResolvedValue();

    // Mock fetch for delete
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })) as any);

    await googleService.deleteHabitEvent(env as any, db, 'user-1', 55);

    expect(fetch).toHaveBeenCalledOnce();
    const url = (fetch as any).mock.calls[0][0] as string;
    expect(url).toContain('/calendars/primary/events/evt_456');
    const options = (fetch as any).mock.calls[0][1];
    expect(options.method).toBe('DELETE');
    expect(delMapSpy).toHaveBeenCalledWith(db, 'user-1', 55);
  });
});