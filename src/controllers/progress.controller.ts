import { Context } from 'hono';
import * as progressService from '../services/progress.service.js';

/**
 * Get user's progress history showing completion rates by day
 * Date parameters only filter what data is returned to the client,
 * not what data is used for streak calculations
 */
export async function getProgressHistory(c: Context): Promise<Response> {
  const { userId } = c.get('auth');
  const { startDate, endDate, timeZone } = c.get('validated_query');

  const history = await progressService.getUserProgressHistory(
    c.env.DB,
    userId,
    startDate,
    endDate,
    timeZone
  );

  return c.json({ history });
}

/**
 * Get user's current and longest streaks
 * This endpoint always calculates based on a full year of data for accuracy
 * regardless of any date filters
 */
export async function getStreaks(c: Context): Promise<Response> {
  const { userId } = c.get('auth');
  const { timeZone } = c.get('validated_query');

  const streaks = await progressService.getUserStreaks(
    c.env.DB,
    userId,
    timeZone
  );

  return c.json(streaks);
}

/**
 * Get user's complete progress overview (history and streaks)
 * Date parameters only filter what history data is returned, while
 * streak calculations always use a full year of data for accuracy
 */
export async function getProgressOverview(c: Context): Promise<Response> {
  const { userId } = c.get('auth');
  const { startDate, endDate, timeZone } = c.get('validated_query');

  const overview = await progressService.getUserProgressOverview(
    c.env.DB,
    userId,
    startDate,
    endDate,
    timeZone
  );

  return c.json(overview);
}
