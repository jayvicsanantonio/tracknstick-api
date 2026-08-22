// Progress date params normalise to one calendar-date representation

import { describe, it, expect } from 'vitest';
import { progressHistorySchema } from '../progress.validator.js';

describe('progressHistorySchema', () => {
  it('accepts the documented YYYY-MM-DD form', () => {
    const result = progressHistorySchema.parse({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });

    expect(result.startDate).toBe('2026-01-01');
    expect(result.endDate).toBe('2026-01-31');
  });

  it('resolves a western month-end instant to the local date', () => {
    // 2026-02-01T07:59:59.999Z is 2026-01-31 23:59:59 in Los Angeles.
    // Truncating in UTC would have leaked February into a January range.
    const result = progressHistorySchema.parse({
      endDate: '2026-02-01T07:59:59.999Z',
      timeZone: 'America/Los_Angeles',
    });

    expect(result.endDate).toBe('2026-01-31');
  });

  it('resolves an eastern month-start instant to the local date', () => {
    // 2025-12-31T15:00:00Z is 2026-01-01 in Tokyo.
    const result = progressHistorySchema.parse({
      startDate: '2025-12-31T15:00:00Z',
      timeZone: 'Asia/Tokyo',
    });

    expect(result.startDate).toBe('2026-01-01');
  });

  it('defaults timeZone to UTC', () => {
    expect(progressHistorySchema.parse({}).timeZone).toBe('UTC');
  });

  it('leaves omitted dates undefined', () => {
    const result = progressHistorySchema.parse({ timeZone: 'UTC' });
    expect(result.startDate).toBeUndefined();
    expect(result.endDate).toBeUndefined();
  });

  it('rejects a value that is neither a date key nor an instant', () => {
    expect(() => progressHistorySchema.parse({ startDate: 'soon' })).toThrow();
  });

  it('falls back to UTC for an unknown timezone rather than throwing', () => {
    const result = progressHistorySchema.parse({
      startDate: '2026-06-15T12:00:00Z',
      timeZone: 'Not/AZone',
    });

    expect(result.startDate).toBe('2026-06-15');
  });
});
