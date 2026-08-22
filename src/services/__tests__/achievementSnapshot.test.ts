import { describe, it, expect } from 'vitest';
import { createMockD1Database } from '../../tests/setup.js';
import { AchievementService } from '../achievement.service.js';
import { getUserProgressHistory } from '../../repositories/tracker.repository.js';

const DAILY = 'Sun,Mon,Tue,Wed,Thu,Fri,Sat';

const dateKey = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);

const daysAgo = (n: number, timeZone: string) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return dateKey(d, timeZone);
};

const count = (n: number) => ({ success: true, results: [{ count: n }] });

interface Fixture {
  habits: Array<{
    id: number;
    frequency: string;
    start_date: string;
    end_date?: string | null;
    deleted_at?: string | null;
  }>;
  trackers: Array<{ habit_id: number; timestamp: string }>;
  notedCompletions?: number;
}

const dbWith = ({ habits, trackers, notedCompletions = 0 }: Fixture) =>
  createMockD1Database({ success: true, results: [] }, [
    // Ordered most specific first: the noted-completions count shares its
    // FROM clause with the totals query.
    { match: 'TRIM(notes)', result: count(notedCompletions) },
    { match: 'COUNT(*) as count FROM habits', result: count(habits.length) },
    {
      match: 'COUNT(*) as count FROM trackers',
      result: count(trackers.length),
    },
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

/** buildSnapshot is private; this is the narrowest honest way to read it. */
const snapshotOf = (fixture: Fixture, timeZone = 'UTC') =>
  (
    new AchievementService(dbWith(fixture)) as unknown as {
      buildSnapshot(
        userId: string,
        timeZone: string
      ): Promise<{
        totalHabits: number;
        totalCompletions: number;
        notedCompletions: number;
        activeDays: number;
        perfectDays: number;
        maxHabitsInOneDay: number;
        currentStreak: number;
        longestStreak: number;
      }>;
    }
  ).buildSnapshot('u1', timeZone);

describe('achievement snapshot', () => {
  it('counts a day as perfect only when every scheduled habit is done', async () => {
    const [today, yesterday] = [daysAgo(0, 'UTC'), daysAgo(1, 'UTC')];
    const habits = [
      { id: 1, frequency: DAILY, start_date: `${yesterday}T00:00:00.000Z` },
      { id: 2, frequency: DAILY, start_date: `${yesterday}T00:00:00.000Z` },
    ];

    const snapshot = await snapshotOf({
      habits,
      trackers: [
        { habit_id: 1, timestamp: `${yesterday}T10:00:00.000Z` },
        { habit_id: 2, timestamp: `${yesterday}T11:00:00.000Z` },
        // Today only half done.
        { habit_id: 1, timestamp: `${today}T10:00:00.000Z` },
      ],
    });

    expect(snapshot.perfectDays).toBe(1);
    expect(snapshot.activeDays).toBe(2);
    expect(snapshot.maxHabitsInOneDay).toBe(2);
  });

  it('measures days in the requesting timezone, not in UTC', async () => {
    const zone = 'America/Los_Angeles';
    const today = daysAgo(0, zone);
    const yesterday = daysAgo(1, zone);

    // 02:00 UTC is the previous evening in Los Angeles, so both completions
    // belong to the same local day even though UTC splits them.
    const fixture: Fixture = {
      habits: [
        { id: 1, frequency: DAILY, start_date: `${yesterday}T00:00:00.000Z` },
      ],
      trackers: [
        { habit_id: 1, timestamp: `${yesterday}T20:00:00.000Z` },
        { habit_id: 1, timestamp: `${today}T02:00:00.000Z` },
      ],
    };

    const local = await snapshotOf(fixture, zone);
    expect(local.activeDays).toBe(1);

    const utc = await snapshotOf(fixture, 'UTC');
    expect(utc.activeDays).toBe(2);
  });

  it('reports the same longest streak the progress endpoint reports', async () => {
    const days = [0, 1, 2, 3].map((n) => daysAgo(n, 'UTC'));
    const fixture: Fixture = {
      habits: [
        { id: 1, frequency: DAILY, start_date: `${days[3]}T00:00:00.000Z` },
      ],
      trackers: days.map((day) => ({
        habit_id: 1,
        timestamp: `${day}T12:00:00.000Z`,
      })),
    };

    const snapshot = await snapshotOf(fixture);
    const history = await getUserProgressHistory(
      dbWith(fixture),
      'u1',
      undefined,
      undefined,
      'UTC'
    );

    expect(snapshot.longestStreak).toBe(4);
    expect(snapshot.currentStreak).toBe(4);
    expect(history.filter((d) => d.completionRate === 100)).toHaveLength(
      snapshot.perfectDays
    );
  });

  it('passes the timezone-independent counts straight through', async () => {
    const today = daysAgo(0, 'UTC');
    const snapshot = await snapshotOf({
      habits: [
        { id: 1, frequency: DAILY, start_date: `${today}T00:00:00.000Z` },
        { id: 2, frequency: DAILY, start_date: `${today}T00:00:00.000Z` },
      ],
      trackers: [
        { habit_id: 1, timestamp: `${today}T10:00:00.000Z` },
        { habit_id: 2, timestamp: `${today}T11:00:00.000Z` },
      ],
      // Distinct from the tracker total so the two counts cannot be
      // answered by the same canned result.
      notedCompletions: 1,
    });

    expect(snapshot.totalHabits).toBe(2);
    expect(snapshot.totalCompletions).toBe(2);
    expect(snapshot.notedCompletions).toBe(1);
  });

  it('reports no progress for a user with nothing recorded', async () => {
    const snapshot = await snapshotOf({ habits: [], trackers: [] });

    expect(snapshot).toEqual({
      totalHabits: 0,
      totalCompletions: 0,
      notedCompletions: 0,
      activeDays: 0,
      perfectDays: 0,
      maxHabitsInOneDay: 0,
      currentStreak: 0,
      longestStreak: 0,
    });
  });
});
