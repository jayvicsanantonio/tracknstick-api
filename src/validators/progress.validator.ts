import { z } from 'zod';

export const progressHistorySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const progressOverviewSchema = progressHistorySchema;
