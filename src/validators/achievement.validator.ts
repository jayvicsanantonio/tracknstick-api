// Validation schemas for achievement endpoints
// Defines input validation rules for achievement-related requests

import { z } from 'zod';

/**
 * The zone the day-counting rules are measured in.
 *
 * Active days, perfect days and streaks are all counts of the user's own
 * calendar days, so they are only correct if the request says which calendar
 * that is. Optional, defaulting to UTC, so an older client keeps working.
 */
export const achievementQuerySchema = z.object({
  timeZone: z.string().default('UTC'),
});
