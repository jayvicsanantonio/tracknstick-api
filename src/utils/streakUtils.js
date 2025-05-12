const logger = require('./logger');

/**
 * Calculates the current streak for a habit based on tracker entries and frequency.
 * Assumes trackerRows are sorted descending by timestamp.
 * @param {Array<object>} trackerRows - Array of tracker objects { timestamp: string }.
 * @param {Array<string>} frequency - Array of short day names (e.g., ['Mon', 'Wed']).
 * @param {string} timeZone - The IANA timezone name.
 * @returns {number} The calculated current streak.
 */
function calculateCurrentStreak(trackerRows, frequency, timeZone) {
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
 * @param {Array<object>} trackerRows - Array of tracker objects { timestamp: string }, sorted by timestamp descending.
 * @param {Array<string>} frequency - Array of short day names (e.g., ['Mon', 'Wed']).
 * @param {string} timeZone - The IANA timezone name.
 * @param {object} currentStats - Current habit stats { streak: number, longestStreak: number }.
 * @returns {object} Updated stats { streak: number, longestStreak: number }.
 */
function updateStreakInfo(trackerRows, frequency, timeZone, currentStats) {
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

module.exports = {
  calculateCurrentStreak,
  updateStreakInfo,
};
