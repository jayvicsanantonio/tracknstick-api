import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const progressHistorySchema = z.object({
  startDate: z
    .string()
    .regex(dateRegex, 'Date must be in YYYY-MM-DD format')
    .optional(),
  endDate: z
    .string()
    .regex(dateRegex, 'Date must be in YYYY-MM-DD format')
    .optional(),
  timeZone: z
    .string()
    .refine(
      (tz) => {
        try {
          // Check if runtime supports Intl.supportedValuesOf
          if (
            typeof Intl !== 'undefined' &&
            'supportedValuesOf' in Intl &&
            typeof Intl.supportedValuesOf === 'function'
          ) {
            return Intl.supportedValuesOf('timeZone').includes(tz);
          }
          // Fallback: Try to use the timezone in a formatter
          new Intl.DateTimeFormat(undefined, { timeZone: tz });
          return true;
        } catch (e) {
          return false;
        }
      },
      { message: 'Invalid IANA time zone identifier' }
    )
    .optional(),
});

export const progressOverviewSchema = progressHistorySchema;
export const progressStreaksSchema = progressHistorySchema;
