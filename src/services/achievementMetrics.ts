// Maps each achievement to the value that measures it
// Keyed by achievement key, which is UNIQUE in the schema and needs no re-seed

import type { UserHabitStats } from '../repositories/achievement.repository.js';

/** Everything an achievement rule can measure, read once per request. */
export interface UserStatsSnapshot extends UserHabitStats {
  currentStreak: number;
}

type Metric = (s: UserStatsSnapshot) => number;

/**
 * Registered achievements are measurable from the snapshot. Anything absent
 * is explicitly unmeasurable and reports no progress rather than a false 0%.
 *
 * Keyed by `key` rather than `type` or `requirement_type` on purpose: it needs
 * no schema change and no re-seed. Re-seeding would be actively dangerous,
 * because initializeAchievements uses INSERT OR REPLACE, which on SQLite
 * deletes and reinserts with a new id -- and user_achievements.achievement_id
 * cascades on delete.
 */
export const METRICS: Record<string, Metric> = {
  // Habits created
  first_habit: (s) => s.totalHabits,
  three_habits: (s) => s.totalHabits,
  five_habits: (s) => s.totalHabits,
  ten_habits: (s) => s.totalHabits,
  twenty_habits: (s) => s.totalHabits,

  // Total completions
  first_completion: (s) => s.totalCompletions,
  completions_10: (s) => s.totalCompletions,
  completions_25: (s) => s.totalCompletions,
  completions_50: (s) => s.totalCompletions,
  completions_100: (s) => s.totalCompletions,
  completions_250: (s) => s.totalCompletions,
  completions_500: (s) => s.totalCompletions,
  completions_1000: (s) => s.totalCompletions,

  // Streaks measure the best run ever achieved
  streak_3: (s) => s.longestStreak,
  streak_7: (s) => s.longestStreak,
  streak_14: (s) => s.longestStreak,
  streak_21: (s) => s.longestStreak,
  streak_30: (s) => s.longestStreak,
  streak_50: (s) => s.longestStreak,
  streak_66: (s) => s.longestStreak,
  streak_100: (s) => s.longestStreak,
  streak_365: (s) => s.longestStreak,
  streak_500: (s) => s.longestStreak,
  streak_1000: (s) => s.longestStreak,

  // Days on which at least one habit was completed
  first_week: (s) => s.activeDays,
  active_30_days: (s) => s.activeDays,
  active_60_days: (s) => s.activeDays,
  active_100_days: (s) => s.activeDays,
  time_traveler: (s) => s.activeDays,

  // Days on which every scheduled habit was completed
  perfect_week: (s) => s.perfectDays,
  perfect_month: (s) => s.perfectDays,

  // Miscellaneous measurable behaviours
  social_butterfly: (s) => s.notedCompletions,
  maximalist: (s) => s.maxHabitsInOneDay,
};

/**
 * Keys deliberately left unregistered, with the reason. Kept as data so the
 * registry test can assert every definition is either measured or listed here,
 * and neither list can silently drift from the seeded catalogue.
 */
export const UNMEASURABLE: Record<string, string> = {
  early_bird: 'needs completion time-of-day in the user timezone',
  night_owl: 'needs completion time-of-day in the user timezone',
  weekend_warrior: 'needs weekend-day counting in the user timezone',
  comeback_kid: 'needs gap analysis between completions',
  phoenix: 'needs gap analysis between completions',
  perfectionist: 'needs consecutive perfect days, not a total',
  habit_guru: 'needs a completion rate over a rolling 30-day window',
  minimalist: 'ambiguous: "maintain just 1 habit for 30 days"',
  habit_variety: 'habits have no "type" column to vary',
  habit_architect_advanced:
    'needs coverage across all frequency types, not a count',
  habit_legend:
    'counts earned achievements, which would make evaluation self-referential',
};

/**
 * The measured value for an achievement, or null when it has no metric.
 * null is distinct from 0: it means "not measurable", not "none yet".
 */
export function measure(
  achievement: { key: string },
  snapshot: UserStatsSnapshot
): number | null {
  const metric = METRICS[achievement.key];
  return metric ? metric(snapshot) : null;
}
