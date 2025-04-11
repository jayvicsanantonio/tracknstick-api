/**
 * Calculates the current streak for a habit based on tracker entries and frequency.
 * Assumes trackerRows are sorted descending by timestamp.
 * @param {Array<object>} trackerRows - Array of tracker objects { timestamp: string }.
 * @param {Array<string>} frequency - Array of short day names (e.g., ['Mon', 'Wed']).
 * @param {string} timeZone - The IANA timezone name.
 * @returns {number} The calculated current streak.
 */
function calculateStreak(trackerRows, frequency, timeZone) {
  if (!trackerRows || trackerRows.length === 0) {
    return 0;
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone });
  } catch (ex) {
    console.error(`Invalid timeZone provided to calculateStreak: ${timeZone}`);
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

  for (let i = 0; i < uniqueCompletionDates.length; i++) {
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
      currentStreak++;
    }

    currentDate.setDate(currentDate.getDate() - 1);
  }
  return currentStreak;
}

module.exports = {
  calculateStreak,
};
