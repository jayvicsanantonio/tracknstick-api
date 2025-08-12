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
  // Validate timezone
  if (!isValidTimeZone(timeZone)) {
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

/**
 * Validates if a given timezone string is valid
 * @param timeZone IANA timezone string to validate
 * @returns boolean indicating if timezone is valid
 */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone }).format(new Date());
    return true;
  } catch (ex) {
    return false;
  }
}

/**
 * Safely parse a date string with proper error handling
 * @param dateString Date string to parse
 * @returns Date object or null if invalid
 */
export function safeDateParse(dateString: string): Date | null {
  try {
    const parsed = new Date(dateString);
    // Check if date is valid
    if (isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Convert timestamp to date considering timezone for collision detection
 * @param timestamp ISO timestamp string
 * @param timeZone IANA timezone name
 * @returns Date string in YYYY-MM-DD format for the given timezone
 */
export function getDateInTimeZone(timestamp: string, timeZone: string): string {
  if (!isValidTimeZone(timeZone)) {
    throw new Error(`Invalid timezone: ${timeZone}`);
  }
  
  const date = safeDateParse(timestamp);
  if (!date) {
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }
  
  // Use Intl.DateTimeFormat to safely get date in timezone (MUCH MORE RELIABLE)
  const formatter = new Intl.DateTimeFormat('en-CA', { 
    timeZone,
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  });
  
  return formatter.format(date); // Returns YYYY-MM-DD format directly
}
