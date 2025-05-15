import { z } from 'zod';

const validDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Helper to validate timezone
const isValidTimeZone = (value) => {
  if (!value) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch (ex) {
    return false;
  }
};

// Common schema components
const timeZoneSchema = z.string().refine(isValidTimeZone, {
  message: 'Invalid IANA TimeZone format provided.',
});

const frequencySchema = z
  .array(z.string())
  .min(1, 'Frequency is required and must be a non-empty array.')
  .refine((days) => days.every((day) => validDays.includes(day)), {
    message: `Frequency array must only contain valid days: ${validDays.join(', ')}`,
  })
  .refine((days) => new Set(days).size === days.length, {
    message: 'Frequency array cannot contain duplicate days.',
  });

// Validation schemas
const createHabitSchema = z.object({
  name: z.string().trim().min(1, 'Habit name is required.'),
  icon: z.string().trim().optional(),
  frequency: frequencySchema,
  startDate: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
    message: 'startDate must be in YYYY-MM-DD format.',
  }),
  endDate: z
    .string()
    .refine((date) => !isNaN(new Date(date).getTime()), {
      message: 'endDate must be in YYYY-MM-DD format.',
    })
    .optional()
    .refine(
      (endDate, ctx) => {
        if (!endDate) return true;

        const startTs = new Date(ctx.data.startDate).getTime();
        const endTs = new Date(endDate).getTime();

        return endTs >= startTs;
      },
      {
        message: 'endDate cannot be earlier than startDate.',
      }
    ),
});

const getHabitsByDateSchema = z.object({
  date: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
    message: 'Date must be in YYYY-MM-DD format.',
  }),
  timeZone: timeZoneSchema,
});

const updateHabitSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Habit name cannot be empty if provided.')
      .optional(),
    icon: z.string().trim().optional(),
    frequency: frequencySchema.optional(),
    startDate: z
      .string()
      .refine((date) => !isNaN(new Date(date).getTime()), {
        message: 'startDate must be in YYYY-MM-DD format.',
      })
      .optional(),
    endDate: z
      .string()
      .refine((date) => !isNaN(new Date(date).getTime()), {
        message: 'endDate must be in YYYY-MM-DD format.',
      })
      .optional()
      .refine(
        (endDate, ctx) =>
          !endDate || !ctx.data.startDate || endDate >= ctx.data.startDate,
        { message: 'endDate cannot be earlier than startDate.' }
      ),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message:
      'Request body must contain at least one field to update (name, icon, frequency, startDate, endDate).',
    path: ['body'],
  });

const habitIdParamSchema = z.object({
  habitId: z
    .string()
    .refine(
      (id) => {
        const n = parseInt(id, 10);
        return !isNaN(n) && n > 0;
      },
      {
        message: 'Habit ID must be a positive integer.',
      }
    )
    .transform((id) => parseInt(id, 10)),
});

const getHabitStatsSchema = z.object({
  timeZone: timeZoneSchema,
});

const manageTrackerSchema = z.object({
  timestamp: z
    .string()
    .refine((timestamp) => !isNaN(new Date(timestamp).getTime()), {
      message: 'Timestamp must be a valid ISO 8601 date string.',
    }),
  timeZone: timeZoneSchema,
  notes: z.string().optional().nullable(),
});

const getTrackersSchema = z
  .object({
    startDate: z
      .string()
      .refine((date) => !isNaN(new Date(date).getTime()), {
        message: 'startDate must be in YYYY-MM-DD format.',
      })
      .optional()
      .transform((date) => (date ? new Date(date) : undefined)),
    endDate: z
      .string()
      .refine((date) => !isNaN(new Date(date).getTime()), {
        message: 'endDate must be in YYYY-MM-DD format.',
      })
      .optional()
      .transform((date) => (date ? new Date(date) : undefined)),
  })
  .refine(
    (data) =>
      !data.startDate || !data.endDate || data.endDate >= data.startDate,
    {
      message: 'endDate cannot be earlier than startDate.',
      path: ['endDate'],
    }
  );

const getProgressOverviewSchema = z.object({
  month: z
    .string()
    .refine((date) => !isNaN(new Date(date).getTime()), {
      message: 'Month must be in YYYY-MM format.',
    })
    .transform((date) => new Date(date)),
  timeZone: timeZoneSchema,
});

export default {
  createHabitSchema,
  getHabitsByDateSchema,
  updateHabitSchema,
  habitIdParamSchema,
  getHabitStatsSchema,
  manageTrackerSchema,
  getTrackersSchema,
  getProgressOverviewSchema,
};
