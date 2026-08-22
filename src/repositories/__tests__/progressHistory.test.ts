import { describe, it, expect } from 'vitest';
import { createMockD1Database } from '../../tests/setup.js';
import {
  getUserProgressHistory,
  getUserStreaks,
} from '../tracker.repository.js';

const DAILY = 'Sun,Mon,Tue,Wed,Thu,Fri,Sat';

const dateKey = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);

const daysAgo = (n: number, timeZone: string) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return dateKey(d, timeZone);
};

interface HabitRow {
  id: number;
  frequency: string;
  start_date: string;
  end_date?: string | null;
  deleted_at?: string | null;
}

/**
 * A database holding exactly these habits and trackers. The two tables need
 * separate responders: a single canned result made the habits query and the
 * trackers query indistinguishable, which is how a fault in the tracker
 * branch stayed invisible.
 */
const dbWith = (
  habits: HabitRow[],
  trackers: Array<{ habit_id: number; timestamp: string }>
) =>
  createMockD1Database({ success: true, results: [] }, [
    {
      match: 'FROM habits',
      result: {
        success: true,
        results: habits.map((h) => ({
          end_date: null,
          deleted_at: null,
          ...h,
        })),
      },
    },
    { match: 'FROM trackers', result: { success: true, results: trackers } },
  ]);

describe('getUserProgressHistory', () => {
  it('scores a day on which the single scheduled habit was completed', async () => {
    const today = daysAgo(0, 'UTC');
    const db = dbWith(
      [{ id: 1, frequency: DAILY, start_date: '2020-01-01T00:00:00.000Z' }],
      [{ habit_id: 1, timestamp: `${today}T12:00:00.000Z` }]
    );

    const history = await getUserProgressHistory(
      db,
      'u1',
      undefined,
      undefined,
      'UTC'
    );

    expect(history.find((d) => d.date === today)).toEqual({
      date: today,
      completionRate: 100,
    });
  });

  it('scores a partially completed day proportionally', async () => {
    const today = daysAgo(0, 'UTC');
    const db = dbWith(
      [
        { id: 1, frequency: DAILY, start_date: '2020-01-01T00:00:00.000Z' },
        { id: 2, frequency: DAILY, start_date: '2020-01-01T00:00:00.000Z' },
        { id: 3, frequency: DAILY, start_date: '2020-01-01T00:00:00.000Z' },
      ],
      [
        { habit_id: 1, timestamp: `${today}T12:00:00.000Z` },
        { habit_id: 2, timestamp: `${today}T13:00:00.000Z` },
      ]
    );

    const history = await getUserProgressHistory(
      db,
      'u1',
      undefined,
      undefined,
      'UTC'
    );

    expect(history.find((d) => d.date === today)?.completionRate).toBe(67);
  });

  it('buckets a completion by the user timezone, not by UTC', async () => {
    const zone = 'America/Los_Angeles';
    const today = daysAgo(0, zone);
    const yesterday = daysAgo(1, zone);

    // 02:00 UTC on today's local date is still yesterday evening in
    // Los Angeles, so the completion belongs to yesterday.
    const db = dbWith(
      [{ id: 1, frequency: DAILY, start_date: '2020-01-01T00:00:00.000Z' }],
      [{ habit_id: 1, timestamp: `${today}T02:00:00.000Z` }]
    );

    const history = await getUserProgressHistory(
      db,
      'u1',
      undefined,
      undefined,
      zone
    );

    expect(history.find((d) => d.date === yesterday)?.completionRate).toBe(100);
    expect(history.find((d) => d.date === today)?.completionRate).toBe(0);
  });

  it('omits days on which nothing was scheduled', async () => {
    const db = dbWith(
      [{ id: 1, frequency: 'Mon', start_date: '2020-01-01T00:00:00.000Z' }],
      []
    );

    const history = await getUserProgressHistory(
      db,
      'u1',
      undefined,
      undefined,
      'UTC'
    );

    const weekdays = new Set(
      history.map((d) =>
        new Date(`${d.date}T12:00:00Z`).getUTCDay()
      )
    );
    expect([...weekdays]).toEqual([1]);
  });

  it('returns days newest first', async () => {
    const db = dbWith(
      [{ id: 1, frequency: DAILY, start_date: '2020-01-01T00:00:00.000Z' }],
      []
    );

    const history = await getUserProgressHistory(
      db,
      'u1',
      undefined,
      undefined,
      'UTC'
    );

    const dates = history.map((d) => d.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('restricts the returned range without changing the scores', async () => {
    const today = daysAgo(0, 'UTC');
    const db = dbWith(
      [{ id: 1, frequency: DAILY, start_date: '2020-01-01T00:00:00.000Z' }],
      [{ habit_id: 1, timestamp: `${today}T12:00:00.000Z` }]
    );

    const history = await getUserProgressHistory(db, 'u1', today, today, 'UTC');

    expect(history).toEqual([{ date: today, completionRate: 100 }]);
  });
});

describe('getUserStreaks', () => {
  it('counts consecutive fully completed days', async () => {
    const days = [0, 1, 2].map((n) => daysAgo(n, 'UTC'));
    const db = dbWith(
      [{ id: 1, frequency: DAILY, start_date: '2020-01-01T00:00:00.000Z' }],
      days.map((day) => ({ habit_id: 1, timestamp: `${day}T12:00:00.000Z` }))
    );

    await expect(getUserStreaks(db, 'u1', 'UTC')).resolves.toEqual({
      currentStreak: 3,
      longestStreak: 3,
    });
  });

  it('does not let an unfinished today break the streak', async () => {
    const days = [1, 2].map((n) => daysAgo(n, 'UTC'));
    const db = dbWith(
      [{ id: 1, frequency: DAILY, start_date: '2020-01-01T00:00:00.000Z' }],
      days.map((day) => ({ habit_id: 1, timestamp: `${day}T12:00:00.000Z` }))
    );

    await expect(getUserStreaks(db, 'u1', 'UTC')).resolves.toEqual({
      currentStreak: 2,
      longestStreak: 2,
    });
  });
});
