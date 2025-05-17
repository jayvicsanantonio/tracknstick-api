import { Context } from 'hono';
import * as progressService from '../services/progress.service.js';
import logger from '../utils/logger.js';

/**
 * Get user's progress history showing completion rates by day
 * Date parameters only filter what data is returned to the client,
 * not what data is used for streak calculations
 */
export async function getProgressHistory(c: Context): Promise<Response> {
  try {
    const auth = c.get('auth');
    if (!auth || !auth.userId) {
      return c.json({ error: 'User not authenticated' }, 401);
    }
    const userId = auth.userId;
    const { startDate, endDate } = c.get('validated_query') || {};

    const history = await progressService.getUserProgressHistory(
      c.env.DB,
      userId,
      startDate,
      endDate
    );

    return c.json({ history });
  } catch (error: any) {
    logger.error('Error fetching progress history:', error);
    return handleError(c, error);
  }
}

/**
 * Get user's current and longest streaks
 * This endpoint always calculates based on a full year of data for accuracy
 * regardless of any date filters
 */
export async function getStreaks(c: Context): Promise<Response> {
  try {
    const auth = c.get('auth');
    if (!auth || !auth.userId) {
      return c.json({ error: 'User not authenticated' }, 401);
    }
    const userId = auth.userId;

    const streaks = await progressService.getUserStreaks(c.env.DB, userId);

    return c.json(streaks);
  } catch (error: any) {
    logger.error('Error fetching streaks:', error);
    return handleError(c, error);
  }
}

/**
 * Get user's complete progress overview (history and streaks)
 * Date parameters only filter what history data is returned, while
 * streak calculations always use a full year of data for accuracy
 */
export async function getProgressOverview(c: Context): Promise<Response> {
  try {
    const auth = c.get('auth');
    if (!auth || !auth.userId) {
      return c.json({ error: 'User not authenticated' }, 401);
    }
    const userId = auth.userId;
    const { startDate, endDate } = c.get('validated_query') || {};

    const overview = await progressService.getUserProgressOverview(
      c.env.DB,
      userId,
      startDate,
      endDate
    );

    return c.json(overview);
  } catch (error: any) {
    logger.error('Error fetching progress overview:', error);
    return handleError(c, error);
  }
}

/**
 * Helper function to handle errors
 */
function handleError(c: Context, error: any): Response {
  const message = error.message || 'An unexpected error occurred';
  const status = error.status || 500;

  return c.json({ error: message }, status);
}
