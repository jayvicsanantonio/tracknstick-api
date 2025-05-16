import { describe, it, expect } from 'vitest';
import { getLocaleStartEnd } from '../dateUtils.js';

describe('dateUtils', () => {
  describe('getLocaleStartEnd', () => {
    it('should calculate start and end timestamps for a given date and timezone', () => {
      // 2023-06-15 10:30:00 UTC
      const utcDate = new Date('2023-06-15T10:30:00Z');
      const timeZone = 'America/New_York'; // EDT (UTC-4)

      const result = getLocaleStartEnd(utcDate, timeZone);

      // The date in New York would be 2023-06-15
      // Start should be 2023-06-15T00:00:00 in the America/New_York timezone
      // End should be 2023-06-15T23:59:59.999 in the America/New_York timezone

      // Convert to Date objects for easier comparison
      const startDate = new Date(result.localeStartISO);
      const endDate = new Date(result.localeEndISO);

      // Check that the dates are correct
      expect(startDate.getUTCDate()).toBe(15);
      expect(startDate.getUTCMonth()).toBe(5); // June (0-based)
      expect(startDate.getUTCFullYear()).toBe(2023);
      expect(startDate.getUTCHours()).toBe(4); // UTC time is 4 hours ahead

      expect(endDate.getUTCDate()).toBe(16); // Will be the next day in UTC
      expect(endDate.getUTCMonth()).toBe(5); // June (0-based)
      expect(endDate.getUTCFullYear()).toBe(2023);
      expect(endDate.getUTCHours()).toBe(3); // 23:59:59 EDT is 03:59:59 UTC
      expect(endDate.getUTCMinutes()).toBe(59);
      expect(endDate.getUTCSeconds()).toBe(59);
    });

    it('should throw an error for invalid timezone', () => {
      const utcDate = new Date();
      const invalidTimeZone = 'InvalidTimeZone';

      expect(() => {
        getLocaleStartEnd(utcDate, invalidTimeZone);
      }).toThrow('Invalid timeZone');
    });
  });
});
