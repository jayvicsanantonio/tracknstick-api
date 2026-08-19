/**
 * Calculates the UTC instants bounding a calendar day in a timezone.
 *
 * Takes the date *key* directly (YYYY-MM-DD as it reads in that timezone)
 * rather than an instant. That matters: deriving the key from an arbitrary
 * instant such as noon UTC shifts the day for zones past UTC+12, where noon
 * UTC already falls on the following local date.
 *
 * @param dateKey - Calendar date in the target timezone, YYYY-MM-DD.
 * @param timeZone - The IANA timezone name.
 * @returns Object containing start and end ISO strings representing UTC times.
 * @throws If the timeZone is invalid.
 */
export function getLocaleStartEndForDateKey(
  dateKey: string,
  timeZone: string
): { localeStartISO: string; localeEndISO: string } {
  if (!isValidTimeZone(timeZone)) {
    throw new Error(
      `Invalid timeZone provided to getLocaleStartEndForDateKey: ${timeZone}`
    );
  }

  // Offset between the timezone and UTC at a given wall-clock moment.
  // Computed per boundary because it can differ across a DST transition.
  const getTimezoneOffsetMs = (dateTimeStr: string): number => {
    const asUtc = new Date(`${dateTimeStr}Z`);

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

    const tzAsUtc = Date.UTC(
      parseInt(getPart('year'), 10),
      parseInt(getPart('month'), 10) - 1,
      parseInt(getPart('day'), 10),
      parseInt(getPart('hour'), 10),
      parseInt(getPart('minute'), 10),
      parseInt(getPart('second'), 10)
    );

    return tzAsUtc - asUtc.getTime();
  };

  // Note the asymmetry, which is deliberate and must be preserved: the offset
  // is probed at 23:59:59 while the instant is built from 23:59:59.999.
  const localeStart = new Date(`${dateKey}T00:00:00Z`);
  localeStart.setTime(
    localeStart.getTime() - getTimezoneOffsetMs(`${dateKey}T00:00:00`)
  );

  const localeEnd = new Date(`${dateKey}T23:59:59.999Z`);
  localeEnd.setTime(
    localeEnd.getTime() - getTimezoneOffsetMs(`${dateKey}T23:59:59`)
  );

  return {
    localeStartISO: localeStart.toISOString(),
    localeEndISO: localeEnd.toISOString(),
  };
}

/**
 * Formats an instant as its calendar date key (YYYY-MM-DD) in a timezone.
 */
export function toLocalDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

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
  if (!isValidTimeZone(timeZone)) {
    throw new Error(
      `Invalid timeZone provided to getLocaleStartEnd: ${timeZone}`
    );
  }

  return getLocaleStartEndForDateKey(toLocalDateKey(utcDate, timeZone), timeZone);
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
