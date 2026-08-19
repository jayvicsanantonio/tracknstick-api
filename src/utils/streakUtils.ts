import logger from './logger.js';
import { formatDayOfWeek, formatDate, getDaysBetween } from './dateUtils.js';

interface TrackerRow {
  timestamp: string;
  habit_id?: number;
  id?: number;
  user_id?: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface StreakStats {
  streak: number;
  longestStreak: number;
}

/**
 * Calculates the current streak for a habit based on tracker entries and frequency.
 * Assumes trackerRows are sorted descending by timestamp.
 */
export function calculateCurrentStreak(
  trackerRows: TrackerRow[],
  frequency: string[],
  timeZone: string
): number {
  if (!trackerRows || trackerRows.length === 0) {
    return 0;
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone });
  } catch (ex) {
    logger.error(
      `Invalid timeZone provided to calculateCurrentStreak: ${timeZone}`
    );
    return 0;
  }

  const uniqueCompletionDates = [
    ...new Set(
      trackerRows.map((row) => {
        const utcDate = new Date(row.timestamp);
        return utcDate.toLocaleDateString('en-CA', { timeZone });
      })
    ),
  ];

  let currentStreak = 0;
  const today = new Date();
  let currentDate = new Date(today.toLocaleDateString('en-CA', { timeZone }));

  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  });

  for (let i = 0; i < uniqueCompletionDates.length; i += 1) {
    const completionDate = new Date(uniqueCompletionDates[i]);

    if (completionDate.getTime() !== currentDate.getTime()) {
      if (i === 0) {
        const yesterday = new Date(currentDate);
        yesterday.setDate(currentDate.getDate() - 1);
        if (completionDate.getTime() === yesterday.getTime()) {
          currentDate = yesterday;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    const dayOfWeek = dayFormatter.format(currentDate);
    if (frequency.includes(dayOfWeek)) {
      currentStreak += 1;
    }

    currentDate.setDate(currentDate.getDate() - 1);
  }
  return currentStreak;
}

/**
 * Updates streak information for a habit based on completion status.
 * This function should be called whenever a habit is completed or missed.
 */
export function updateStreakInfo(
  trackerRows: TrackerRow[],
  frequency: string[],
  timeZone: string,
  currentStats: StreakStats
): StreakStats {
  if (!trackerRows || trackerRows.length === 0) {
    return { streak: 0, longestStreak: currentStats.longestStreak };
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone });
  } catch (ex) {
    logger.error(`Invalid timeZone provided to updateStreakInfo: ${timeZone}`);
    return currentStats;
  }

  const currentStreak = calculateCurrentStreak(
    trackerRows,
    frequency,
    timeZone
  );
  const longestStreak = Math.max(currentStreak, currentStats.longestStreak);

  return {
    streak: currentStreak,
    longestStreak,
  };
}

/**
 * Calculate streak for daily habits
 * @param trackers Array of tracker entries sorted by date (most recent first)
 * @returns Current streak count
 */
export function calculateDailyStreak(trackers: TrackerRow[]): number {
  if (trackers.length === 0) {
    return 0;
  }

  let streak = 1; // Start with the most recent day
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mostRecentDate = new Date(trackers[0].timestamp);
  mostRecentDate.setHours(0, 0, 0, 0);

  // If most recent isn't today or yesterday, streak is broken
  const dayDiff = getDaysBetween(mostRecentDate, today);
  if (dayDiff > 1) {
    return 0;
  }

  // Count consecutive days
  for (let i = 0; i < trackers.length - 1; i++) {
    const currentDate = new Date(trackers[i].timestamp);
    const nextDate = new Date(trackers[i + 1].timestamp);

    currentDate.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);

    const diffTime = currentDate.getTime() - nextDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate streak for non-daily habits based on frequency pattern
 * @param trackers Array of tracker entries sorted by date (most recent first)
 * @param frequencyDays Array of days when habit is scheduled (e.g., ["Mon", "Wed", "Fri"])
 * @returns Current streak count
 */
export function calculateNonDailyStreak(
  trackers: TrackerRow[],
  frequencyDays: string[]
): number {
  if (trackers.length === 0) {
    return 0;
  }

  // Create a Set for faster lookups of scheduled days
  const scheduledDays = new Set(frequencyDays);

  // Get most recent tracker date to start from
  const mostRecentDate = new Date(trackers[0].timestamp);
  mostRecentDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if the most recent tracked date is on or after the most recent scheduled day
  // If the user has missed their most recent scheduled day, streak is broken
  const daysSinceMostRecent = getDaysBetween(mostRecentDate, today);

  // If more than 7 days have passed, we may need a more complex calculation
  // but for simplicity, we'll assume streak is broken if the most recent tracker
  // is more than a week old
  if (daysSinceMostRecent > 7) {
    return 0;
  }

  // Convert trackers to a map of dates for quick lookup
  const trackersByDate = new Map<string, TrackerRow>();
  trackers.forEach((tracker) => {
    const date = new Date(tracker.timestamp);
    date.setHours(0, 0, 0, 0);
    trackersByDate.set(formatDate(date), tracker);
  });

  // Start from today and walk backwards through the scheduled days
  let currentDate = new Date(today);
  let streak = 0;
  let missedScheduledDay = false;

  // Look back up to 30 days to find streak (arbitrary limit to prevent infinite loop)
  for (let i = 0; i < 30 && !missedScheduledDay; i++) {
    const dayOfWeek = formatDayOfWeek(currentDate);

    // If this is a scheduled day for the habit
    if (scheduledDays.has(dayOfWeek)) {
      const dateStr = formatDate(currentDate);

      if (trackersByDate.has(dateStr)) {
        // Habit was completed on this scheduled day
        streak++;
      } else if (currentDate <= today) {
        // Habit was not completed on a scheduled day that's today or in the past
        // This breaks the streak (unless it's today, which is still in progress)
        if (getDaysBetween(currentDate, today) > 0) {
          missedScheduledDay = true;
        }
      }
    }

    // Move to previous day
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

/**
 * Calculate the longest streak from historical tracker data
 * This handles historical toggles properly by analyzing all completion periods
 */
export function calculateLongestStreakFromTrackers(
  trackers: TrackerRow[],
  frequencyDays: string[],
  timeZone: string
): number {
  if (!trackers || trackers.length === 0) {
    return 0;
  }

  try {
    // Validate timezone
    Intl.DateTimeFormat(undefined, { timeZone });
  } catch (ex) {
    logger.error(`Invalid timeZone provided: ${timeZone}`);
    return 0;
  }

  // Convert trackers to timezone-aware completion dates
  const completionDates = trackers
    .map((tracker) => {
      const utcDate = new Date(tracker.timestamp);
      return utcDate.toLocaleDateString('en-CA', { timeZone });
    })
    .sort() // Sort chronologically
    .filter((date, index, array) => array.indexOf(date) === index); // Remove duplicates

  if (completionDates.length === 0) {
    return 0;
  }

  const scheduledDays = new Set(frequencyDays);
  let maxStreak = 0;
  let currentStreak = 0;

  // Walk through all dates from first completion to last
  const startDate = new Date(completionDates[0]);
  const endDate = new Date(completionDates[completionDates.length - 1]);
  const completionSet = new Set(completionDates);

  let currentDate = new Date(startDate);
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  });

  while (currentDate <= endDate) {
    const dateStr = currentDate.toLocaleDateString('en-CA', { timeZone });
    const dayOfWeek = dayFormatter.format(currentDate);

    if (scheduledDays.has(dayOfWeek)) {
      if (completionSet.has(dateStr)) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return maxStreak;
}

/**
 * Get the most recent completion date in user's timezone
 */
export function getMostRecentCompletionDate(
  trackers: TrackerRow[],
  timeZone: string
): string | null {
  if (!trackers || trackers.length === 0) {
    return null;
  }

  try {
    // Validate timezone
    Intl.DateTimeFormat(undefined, { timeZone });
  } catch (ex) {
    logger.error(`Invalid timeZone provided: ${timeZone}`);
    return null;
  }

  // Sort by timestamp descending to get most recent
  const sortedTrackers = trackers.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return sortedTrackers[0].timestamp;
}

/**
 * One scheduled day of habit history.
 * The producer (getUserProgressHistory) emits an entry only for days on which
 * at least one habit was scheduled, so consecutive array positions are
 * consecutive *scheduled* days -- which is what a streak counts.
 */
export interface DayCompletion {
  date: string; // YYYY-MM-DD in the user's timezone
  completionRate: number; // 0-100
}

/**
 * Folds a descending (newest first) run of scheduled days into streaks.
 *
 * Adjacency in the array is streak adjacency: a Mon/Wed/Fri habit is not
 * penalised for Tuesday, because Tuesday was never a scheduled day and so is
 * absent from the history entirely.
 *
 * @param descendingHistory scheduled days, newest first
 * @param todayKey today's date key in the user's timezone
 */
export function computeStreaks(
  descendingHistory: readonly DayCompletion[],
  todayKey: string
): { currentStreak: number; longestStreak: number } {
  let currentStreak = 0;
  let longestStreak = 0;
  let run = 0;

  // Longest: one pass, counting runs of fully-completed days and folding each
  // run into the maximum before resetting.
  for (const entry of descendingHistory) {
    if (entry.completionRate === 100) {
      run += 1;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 0;
    }
  }

  // Current: leading fully-completed days, anchored at the most recent
  // scheduled day. A day still in progress does not extend the streak, but it
  // does not break it either -- we simply start from the previous entry.
  let index = 0;
  if (
    descendingHistory.length > 0 &&
    descendingHistory[0].date === todayKey &&
    descendingHistory[0].completionRate !== 100
  ) {
    index = 1;
  }

  for (; index < descendingHistory.length; index += 1) {
    if (descendingHistory[index].completionRate !== 100) break;
    currentStreak += 1;
  }

  return { currentStreak, longestStreak };
}
