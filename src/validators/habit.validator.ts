import { z } from 'zod';

const validDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Common frequency schema
const frequencySchema = z
  .array(z.string())
  .min(1, 'Frequency is required and must be a non-empty array.')
  .refine((days) => days.every((day) => validDays.includes(day)), {
    message: `Frequency array must only contain valid days: ${validDays.join(', ')}`,
  })
  .refine((days) => new Set(days).size === days.length, {
    message: 'Frequency array cannot contain duplicate days.',
  });

// Request validation schemas
export const createHabitSchema = z
  .object({
    name: z.string().min(1).max(100),
    icon: z.string().optional(),
    frequency: frequencySchema,
    startDate: z.string().datetime(),
    endDate: z.union([z.string().datetime(), z.null()]).optional(),
  })
  .refine(
    (data) => {
      if (!data.endDate || data.endDate === null) return true;

      const startTs = new Date(data.startDate).getTime();
      const endTs = new Date(data.endDate).getTime();

      return endTs >= startTs;
    },
    {
      message: 'endDate cannot be earlier than startDate.',
    }
  );

export const updateHabitSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    icon: z.string().optional(),
    frequency: frequencySchema.optional(),
    startDate: z.string().datetime(),
    endDate: z.union([z.string().datetime(), z.null()]).optional(),
  })
  .refine(
    (data) => {
      if (!data.endDate || data.endDate === null) return true;

      const startTs = new Date(data.startDate).getTime();
      const endTs = new Date(data.endDate).getTime();

      return endTs >= startTs;
    },
    {
      message: 'endDate cannot be earlier than startDate.',
    }
  );

export const habitIdParamSchema = z.object({
  habitId: z.string(),
});

export const getHabitsByDateSchema = z.object({
  date: z.string().datetime().optional(),
  timeZone: z.string().default('UTC').optional(),
});

export const getTrackersSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const manageTrackerSchema = z.object({
  timestamp: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/),
  timeZone: z.string().default('UTC'),
  notes: z.string().max(500).optional(),
});

export const getHabitStatsSchema = z.object({
  timeZone: z.string().default('UTC'),
});

export const getProgressOverviewSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  timeZone: z.string().default('UTC'),
});
