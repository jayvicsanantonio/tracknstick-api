import { toLocalDateKey } from './dateUtils.js';

/** A habit's schedule, as the habits table stores it. */
export interface HabitSchedule {
  id: number;
  /** Comma-joined short day names, e.g. "Mon,Wed,Fri". */
  frequency: string;
  start_date: string;
  end_date?: string | null;
  deleted_at?: string | null;
}

/** A completion, as the trackers table stores it. */
export interface TrackerStamp {
  habit_id: number;
  timestamp: string;
}

/** One day on which at least one habit was scheduled. */
export interface DayScore {
  /** YYYY-MM-DD in the user's timezone. */
  date: string;
  scheduled: number;
  completed: number;
  /** completed/scheduled as a whole percentage. */
  completionRate: number;
}

export interface CompletionSummary {
  /** Scheduled days, newest first. Days with nothing scheduled are absent. */
  days: DayScore[];
  /** Distinct habits completed, keyed by the day they were completed on. */
  habitsByDay: Map<string, Set<number>>;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * The weekday a date key falls on.
 *
 * Noon UTC is safe here because the key is already a calendar date rather
 * than an instant: no zone offset can push noon onto a neighbouring day.
 */
export function weekdayOfDateKey(dateKey: string): string {
  return DAY_NAMES[new Date(`${dateKey}T12:00:00Z`).getUTCDay()];
}

/** Every date key from `from` to `to` inclusive, ascending. */
export function dateKeysBetween(from: string, to: string): string[] {
  const keys: string[] = [];
  const cursor = new Date(`${from}T12:00:00Z`);
  const last = new Date(`${to}T12:00:00Z`);

  while (cursor <= last) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
}

/** Whether a habit was on the books, and scheduled, on a given day. */
function isScheduledOn(habit: HabitSchedule, dateKey: string): boolean {
  if (habit.start_date.slice(0, 10) > dateKey) return false;

  const end = habit.end_date?.slice(0, 10);
  if (end && end < dateKey) return false;

  // A deleted habit still counts for the days it was live, so history does
  // not silently improve when a habit is removed.
  const deleted = habit.deleted_at?.slice(0, 10);
  if (deleted && deleted <= dateKey) return false;

  return habit.frequency.split(',').includes(weekdayOfDateKey(dateKey));
}

/**
 * Scores each day in a range against the habits scheduled on it.
 *
 * This is the single definition of "what fraction of today did I complete".
 * The progress history, the streak counts and the day-counting achievements
 * all read it, so a completion cannot land on one calendar day in one
 * feature and a different one in another -- which is what happened while
 * achievements bucketed completions with SQLite's UTC DATE() and history
 * bucketed them in the user's timezone.
 */
export function summariseCompletion(
  habits: HabitSchedule[],
  trackers: TrackerStamp[],
  timeZone: string,
  from: string,
  to: string
): CompletionSummary {
  const habitsByDay = new Map<string, Set<number>>();
  for (const tracker of trackers) {
    const day = toLocalDateKey(new Date(tracker.timestamp), timeZone);
    let completed = habitsByDay.get(day);
    if (!completed) {
      completed = new Set();
      habitsByDay.set(day, completed);
    }
    completed.add(tracker.habit_id);
  }

  const days: DayScore[] = [];

  for (const date of dateKeysBetween(from, to)) {
    const scheduledIds = habits
      .filter((habit) => isScheduledOn(habit, date))
      .map((habit) => habit.id);

    if (scheduledIds.length === 0) continue;

    const completedIds = habitsByDay.get(date);
    const completed = completedIds
      ? scheduledIds.filter((id) => completedIds.has(id)).length
      : 0;

    days.push({
      date,
      scheduled: scheduledIds.length,
      completed,
      completionRate: Math.round((completed / scheduledIds.length) * 100),
    });
  }

  days.reverse();

  return { days, habitsByDay };
}

/** The most habits completed on any single day. */
export function peakHabitsInADay(
  habitsByDay: Map<string, Set<number>>
): number {
  let peak = 0;
  for (const completed of habitsByDay.values()) {
    if (completed.size > peak) peak = completed.size;
  }
  return peak;
}
