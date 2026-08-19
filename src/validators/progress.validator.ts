import { z } from 'zod';

// timeZone is defaulted here so the controller and service do not each
// re-apply their own fallback.
export const progressHistorySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timeZone: z.string().default('UTC'),
});

export const progressOverviewSchema = progressHistorySchema;

export const progressStreaksSchema = z.object({
  timeZone: z.string().default('UTC'),
});
