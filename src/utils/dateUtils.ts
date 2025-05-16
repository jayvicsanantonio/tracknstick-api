/**
 * Calculates the start and end ISO timestamps for a given UTC date in a specific timezone.
 * @param utcDate - The date object (assumed UTC or correctly parsed).
 * @param timeZone - The IANA timezone name (e.g., 'America/Los_Angeles').
 * @returns Object containing start and end ISO strings.
 * @throws If the timeZone is invalid.
 */
export function getLocaleStartEnd(
  utcDate: Date,
  timeZone: string
): { localeStartISO: string; localeEndISO: string } {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
  } catch (ex) {
    throw new Error(
      `Invalid timeZone provided to getLocaleStartEnd: ${timeZone}`
    );
  }

  const localeDate = new Date(
    utcDate.toLocaleString('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
  );
  const localeStart = new Date(
    localeDate.getFullYear(),
    localeDate.getMonth(),
    localeDate.getDate(),
    0,
    0,
    0,
    0
  );
  const localeEnd = new Date(
    localeDate.getFullYear(),
    localeDate.getMonth(),
    localeDate.getDate(),
    23,
    59,
    59,
    999
  );
  return {
    localeStartISO: localeStart.toISOString(),
    localeEndISO: localeEnd.toISOString(),
  };
}

/**
 * Helper function to get short day of week format (e.g., "Mon")
 * @param date Date object to extract day of week from
 * @returns Short day name (e.g., "Mon", "Tue", etc.)
 */
export function formatDayOfWeek(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

/**
 * Helper function to format date as YYYY-MM-DD
 * @param date Date object to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDate(date: Date): string {
  return date.toISOString().substring(0, 10);
}

/**
 * Helper function to calculate days between two dates
 * @param d1 First date
 * @param d2 Second date
 * @returns Number of days between dates (absolute value)
 */
export function getDaysBetween(d1: Date, d2: Date): number {
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
