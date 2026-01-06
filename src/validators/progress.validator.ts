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
  timeZone: z.string().optional(),
});

export const progressOverviewSchema = progressHistorySchema;
