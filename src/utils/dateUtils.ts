/**
 * Calculates the start and end UTC timestamps for a given UTC date in a specific timezone.
 * Returns the UTC times that correspond to midnight (00:00:00) and end of day (23:59:59.999)
 * in the specified timezone.
 *
 * @param utcDate - The date object (assumed UTC or correctly parsed).
 * @param timeZone - The IANA timezone name (e.g., 'America/Los_Angeles').
 * @returns Object containing start and end ISO strings representing UTC times.
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

  // Get the date string (YYYY-MM-DD) in the target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(utcDate); // e.g., "2026-01-03"

  // Helper to calculate UTC offset for a specific date/time in the timezone
  const getTimezoneOffsetMs = (dateTimeStr: string): number => {
    // Parse as if it were UTC
    const asUtc = new Date(`${dateTimeStr}Z`);

    // Get the same instant formatted in the target timezone
    const tzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = tzFormatter.formatToParts(asUtc);
    const getPart = (type: string) =>
      parts.find((p) => p.type === type)?.value || '';

    const tzYear = parseInt(getPart('year'), 10);
    const tzMonth = parseInt(getPart('month'), 10);
    const tzDay = parseInt(getPart('day'), 10);
    const tzHour = parseInt(getPart('hour'), 10);
    const tzMinute = parseInt(getPart('minute'), 10);
    const tzSecond = parseInt(getPart('second'), 10);

    // Create a date from the timezone components (as if they were UTC)
    const tzAsUtc = Date.UTC(
      tzYear,
      tzMonth - 1,
      tzDay,
      tzHour,
      tzMinute,
      tzSecond
    );

    // The difference is the offset
    return tzAsUtc - asUtc.getTime();
  };

  // Calculate offset for start of day in target timezone
  const startOffset = getTimezoneOffsetMs(`${dateStr}T00:00:00`);

  // Start of day in target timezone = midnight in TZ converted to UTC
  // If TZ is UTC-8, midnight in TZ is 08:00 UTC (add 8 hours)
  const localeStart = new Date(`${dateStr}T00:00:00Z`);
  localeStart.setTime(localeStart.getTime() - startOffset);

  // End of day in target timezone = 23:59:59.999 in TZ converted to UTC
  const endOffset = getTimezoneOffsetMs(`${dateStr}T23:59:59`);
  const localeEnd = new Date(`${dateStr}T23:59:59.999Z`);
  localeEnd.setTime(localeEnd.getTime() - endOffset);

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
    day: '2-digit',
  });

  return formatter.format(date); // Returns YYYY-MM-DD format directly
}
