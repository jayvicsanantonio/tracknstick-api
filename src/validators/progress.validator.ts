import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const dateValidation = z
  .string()
  .regex(dateRegex, 'Date must be in YYYY-MM-DD format')
  .refine(
    (dateParam) => {
      const [year, month, day] = dateParam.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      );
    },
    { message: 'Invalid date: Date components do not match calendar validity' }
  )
  .optional();

export const progressHistorySchema = z.object({
  startDate: dateValidation,
  endDate: dateValidation,
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
