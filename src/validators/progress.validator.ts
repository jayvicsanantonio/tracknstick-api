import { z } from 'zod';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Accepts either a calendar date (YYYY-MM-DD, as the API docs and the route
 * JSDoc describe) or a full ISO instant (what the web client actually sends),
 * and normalises both to a calendar date in the request's timezone.
 *
 * The repository consumes these by taking `value.split('T')[0]`, which
 * truncates in UTC. An instant encoding a local day boundary therefore
 * truncated to the wrong day for every non-UTC user: a Los Angeles month-end
 * leaked the 1st of the next month into the range, and a Tokyo month-start
 * leaked the previous 31st. Resolving the date here, once, removes that.
 */
const dateInput = z
  .string()
  .refine(
    (v) => DATE_KEY.test(v) || !Number.isNaN(Date.parse(v)),
    'Expected YYYY-MM-DD or an ISO 8601 datetime'
  );

const normalizeDate = (value: string | undefined, timeZone: string) => {
  if (value === undefined) return undefined;
  if (DATE_KEY.test(value)) return value;

  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(
      new Date(value)
    );
  } catch {
    // Matches the repository's long-standing lenient fallback for a bad zone
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(
      new Date(value)
    );
  }
};

export const progressHistorySchema = z
  .object({
    startDate: dateInput.optional(),
    endDate: dateInput.optional(),
    timeZone: z.string().default('UTC'),
  })
  .transform((data) => ({
    ...data,
    startDate: normalizeDate(data.startDate, data.timeZone),
    endDate: normalizeDate(data.endDate, data.timeZone),
  }));

export const progressOverviewSchema = progressHistorySchema;

export const progressStreaksSchema = z.object({
  timeZone: z.string().default('UTC'),
});
