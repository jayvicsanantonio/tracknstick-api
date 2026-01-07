import { z } from 'zod';

export const progressHistorySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timeZone: z.string().optional(),
});

export const progressOverviewSchema = progressHistorySchema;

export const progressStreaksSchema = z.object({
  timeZone: z.string().optional(),
});
