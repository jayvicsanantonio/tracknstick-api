// Tests for habit request validation schemas
// Pins the timezone default and the date-range invariant

import { describe, it, expect } from 'vitest';
import {
  createHabitSchema,
  getHabitsByDateSchema,
  getHabitStatsSchema,
  manageTrackerSchema,
  updateHabitSchema,
} from '../habit.validator.js';

describe('habit.validator', () => {
  describe('getHabitsByDateSchema', () => {
    it('applies the UTC default when timeZone is omitted', () => {
      const result = getHabitsByDateSchema.parse({
        date: '2026-01-05T00:00:00Z',
      });
      expect(result.timeZone).toBe('UTC');
    });

    it('preserves an explicit timeZone', () => {
      const result = getHabitsByDateSchema.parse({
        date: '2026-01-05T00:00:00Z',
        timeZone: 'America/New_York',
      });
      expect(result.timeZone).toBe('America/New_York');
    });

    it('still accepts a request with neither field', () => {
      const result = getHabitsByDateSchema.parse({});
      expect(result.timeZone).toBe('UTC');
      expect(result.date).toBeUndefined();
    });
  });

  describe('sibling schemas already default correctly', () => {
    it('getHabitStatsSchema defaults timeZone', () => {
      expect(getHabitStatsSchema.parse({}).timeZone).toBe('UTC');
    });

    it('manageTrackerSchema defaults timeZone', () => {
      const parsed = manageTrackerSchema.parse({
        timestamp: '2026-01-05T10:00:00Z',
      });
      expect(parsed.timeZone).toBe('UTC');
    });
  });
});

describe('date-range invariant (shared by create and update)', () => {
  const base = {
    name: 'Read',
    frequency: ['Mon'],
    startDate: '2026-01-10T00:00:00Z',
  };

  it.each([
    ['createHabitSchema', createHabitSchema],
    ['updateHabitSchema', updateHabitSchema],
  ])('%s rejects endDate before startDate', (_name, schema) => {
    const result = schema.safeParse({
      ...base,
      endDate: '2026-01-01T00:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it.each([
    ['createHabitSchema', createHabitSchema],
    ['updateHabitSchema', updateHabitSchema],
  ])('%s accepts endDate equal to startDate', (_name, schema) => {
    const result = schema.safeParse({
      ...base,
      endDate: '2026-01-10T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it.each([
    ['createHabitSchema', createHabitSchema],
    ['updateHabitSchema', updateHabitSchema],
  ])('%s accepts a null endDate', (_name, schema) => {
    expect(schema.safeParse({ ...base, endDate: null }).success).toBe(true);
  });

  it.each([
    ['createHabitSchema', createHabitSchema],
    ['updateHabitSchema', updateHabitSchema],
  ])('%s accepts an omitted endDate', (_name, schema) => {
    expect(schema.safeParse(base).success).toBe(true);
  });
});
