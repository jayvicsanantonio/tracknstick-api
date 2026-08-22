// Equivalence + DST tests for the shared day-boundary math
// The reference implementation below is the pre-consolidation private copy
// that lived in tracker.repository.ts

import { describe, it, expect } from 'vitest';
import {
  getLocaleStartEndForDateKey,
  getLocaleStartEnd,
  toLocalDateKey,
} from '../dateUtils.js';

/** Verbatim behaviour of the old tracker.repository private helpers. */
function referenceBounds(dateStr: string, timeZone: string) {
  const offsetMs = (dateTimeStr: string): number => {
    const asUtc = new Date(`${dateTimeStr}Z`);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(asUtc);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
    return (
      Date.UTC(
        parseInt(get('year'), 10),
        parseInt(get('month'), 10) - 1,
        parseInt(get('day'), 10),
        parseInt(get('hour'), 10),
        parseInt(get('minute'), 10),
        parseInt(get('second'), 10)
      ) - asUtc.getTime()
    );
  };

  const start = new Date(`${dateStr}T00:00:00Z`);
  start.setTime(start.getTime() - offsetMs(`${dateStr}T00:00:00`));
  const end = new Date(`${dateStr}T23:59:59.999Z`);
  end.setTime(end.getTime() - offsetMs(`${dateStr}T23:59:59`));

  return {
    localeStartISO: start.toISOString(),
    localeEndISO: end.toISOString(),
  };
}

const ZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Asia/Kolkata', // +05:30
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Kiritimati', // +14:00
  'Pacific/Apia', // +13:00
  'America/Santiago', // DST transition at midnight
];

const DATES = [
  '2026-01-15',
  '2026-06-15',
  '2026-03-08', // US spring forward
  '2026-11-01', // US fall back
  '2026-02-28',
  '2024-02-29', // leap day
];

describe('getLocaleStartEndForDateKey', () => {
  it.each(ZONES)('matches the reference implementation in %s', (zone) => {
    for (const date of DATES) {
      expect(getLocaleStartEndForDateKey(date, zone), `${zone} ${date}`).toEqual(
        referenceBounds(date, zone)
      );
    }
  });

  it('brackets the day: start < end, and both are real instants', () => {
    for (const zone of ZONES) {
      const { localeStartISO, localeEndISO } = getLocaleStartEndForDateKey(
        '2026-06-15',
        zone
      );
      expect(new Date(localeStartISO).getTime(), zone).toBeLessThan(
        new Date(localeEndISO).getTime()
      );
    }
  });

  it('round-trips the date key it was given', () => {
    // The hazard the date-key entry point exists to avoid: deriving the key
    // from noon UTC lands on the next local day in UTC+13/+14.
    for (const zone of ['Pacific/Kiritimati', 'Pacific/Apia']) {
      const { localeStartISO } = getLocaleStartEndForDateKey('2026-06-15', zone);
      expect(toLocalDateKey(new Date(localeStartISO), zone), zone).toBe(
        '2026-06-15'
      );
    }
  });

  it('rejects an invalid timezone', () => {
    expect(() =>
      getLocaleStartEndForDateKey('2026-06-15', 'Not/AZone')
    ).toThrow();
  });
});

describe('getLocaleStartEnd delegates without changing behaviour', () => {
  it.each(ZONES)('agrees with the date-key form in %s', (zone) => {
    const instant = new Date('2026-06-15T09:30:00Z');
    expect(getLocaleStartEnd(instant, zone)).toEqual(
      getLocaleStartEndForDateKey(toLocalDateKey(instant, zone), zone)
    );
  });
});
