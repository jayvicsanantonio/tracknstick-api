// Pure fold over the scheduled-day history
// Adjacency in the array is adjacency in the streak

import { describe, it, expect } from 'vitest';
import { computeStreaks, type DayCompletion } from '../streakUtils.js';

const day = (date: string, completionRate: number): DayCompletion => ({
  date,
  completionRate,
});

describe('computeStreaks', () => {
  it('returns zeroes for an empty history', () => {
    expect(computeStreaks([], '2026-01-10')).toEqual({
      currentStreak: 0,
      longestStreak: 0,
    });
  });

  it('counts a dense run of fully-completed days', () => {
    const history = [
      day('2026-01-10', 100),
      day('2026-01-09', 100),
      day('2026-01-08', 100),
    ];

    expect(computeStreaks(history, '2026-01-10')).toEqual({
      currentStreak: 3,
      longestStreak: 3,
    });
  });

  it('does not lose a completed run when a later run resets it', () => {
    // The old implementation reset its counter without folding the run into
    // the maximum first, so this returned 1.
    const history = [
      day('2026-01-10', 100),
      day('2026-01-08', 0),
      day('2026-01-07', 100),
      day('2026-01-06', 100),
    ];

    expect(computeStreaks(history, '2026-01-10').longestStreak).toBe(2);
  });

  it('treats scheduled days as adjacent regardless of calendar gaps', () => {
    // Mon / Wed / Fri habit: the calendar gaps are not misses.
    const history = [
      day('2026-01-09', 100),
      day('2026-01-07', 100),
      day('2026-01-05', 100),
    ];

    expect(computeStreaks(history, '2026-01-09')).toEqual({
      currentStreak: 3,
      longestStreak: 3,
    });
  });

  it('breaks the current streak on an incomplete day', () => {
    const history = [
      day('2026-01-10', 100),
      day('2026-01-09', 50),
      day('2026-01-08', 100),
    ];

    expect(computeStreaks(history, '2026-01-10').currentStreak).toBe(1);
  });

  it('keeps the streak alive when today is still in progress', () => {
    const history = [
      day('2026-01-10', 40),
      day('2026-01-09', 100),
      day('2026-01-08', 100),
    ];

    expect(computeStreaks(history, '2026-01-10').currentStreak).toBe(2);
  });

  it('counts a rest day today as not breaking the streak', () => {
    // Today is absent from the history because nothing was scheduled.
    const history = [day('2026-01-09', 100), day('2026-01-08', 100)];

    expect(computeStreaks(history, '2026-01-10').currentStreak).toBe(2);
  });

  it('reports zero current streak when the latest scheduled day was missed', () => {
    const history = [day('2026-01-09', 0), day('2026-01-08', 100)];

    expect(computeStreaks(history, '2026-01-10').currentStreak).toBe(0);
  });
});
