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
