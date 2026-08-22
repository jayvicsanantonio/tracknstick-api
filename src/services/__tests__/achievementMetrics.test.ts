// Keeps the metric registry honest against the seeded achievement catalogue
// Previously 20 of 44 definitions matched no branch and reported a false 0%

import { describe, it, expect } from 'vitest';
import {
  METRICS,
  UNMEASURABLE,
  measure,
  type UserStatsSnapshot,
} from '../achievementMetrics.js';
import { AchievementRepository } from '../../repositories/achievement.repository.js';

// getDefaultAchievements needs no database access
const definitions = new AchievementRepository(
  null as never
).getDefaultAchievements();

const SNAPSHOT: UserStatsSnapshot = {
  totalHabits: 3,
  totalCompletions: 42,
  longestStreak: 9,
  currentStreak: 4,
  activeDays: 31,
  perfectDays: 8,
  notedCompletions: 21,
  maxHabitsInOneDay: 11,
};

describe('achievement metric registry', () => {
  it('covers every seeded achievement exactly once', () => {
    for (const def of definitions) {
      const registered = def.key in METRICS;
      const excused = def.key in UNMEASURABLE;

      expect(
        registered || excused,
        `"${def.key}" is neither measured nor listed as unmeasurable`
      ).toBe(true);
      expect(
        registered && excused,
        `"${def.key}" is both measured and listed as unmeasurable`
      ).toBe(false);
    }
  });

  it('registers no key that is not a seeded achievement', () => {
    const keys = new Set(definitions.map((d) => d.key));
    for (const key of [...Object.keys(METRICS), ...Object.keys(UNMEASURABLE)]) {
      expect(keys.has(key), `"${key}" is not a seeded achievement`).toBe(true);
    }
  });

  it('leaves no achievement silently unearnable', () => {
    // The original defect: a definition whose type matched no switch branch
    // returned a well-formed progress object of 0 and could never be awarded.
    const unmeasured = definitions.filter((d) => !(d.key in METRICS));
    for (const def of unmeasured) {
      expect(measure(def, SNAPSHOT), def.key).toBeNull();
      expect(UNMEASURABLE[def.key], `${def.key} needs a reason`).toBeTruthy();
    }
  });

  it.each([
    ['first_habit', 3],
    ['completions_25', 42],
    ['streak_7', 9],
    ['active_30_days', 31],
    ['perfect_week', 8],
    ['social_butterfly', 21],
    ['maximalist', 11],
  ])('measures %s from the snapshot', (key, expected) => {
    expect(measure({ key }, SNAPSHOT)).toBe(expected);
  });

  it('returns null rather than zero for an unregistered key', () => {
    expect(measure({ key: 'early_bird' }, SNAPSHOT)).toBeNull();
  });
});
