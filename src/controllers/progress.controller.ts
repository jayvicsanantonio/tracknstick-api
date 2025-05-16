import { Context } from 'hono';
import * as progressService from '../services/progress.service.js';
import { validateDateParam } from '../validators/common.js';
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
    const { startDate, endDate } = validateDateParams(c);

    const history = await progressService.getUserProgressHistory(
      c.env.DB,
      userId,
      startDate,
      endDate
    );

    console.log('History data from API:', history);
    console.log('History data length:', history.length);

    // Wrap the history in an object as expected by frontend
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

    console.log('Streaks data from API:', streaks);

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
    const { startDate, endDate } = validateDateParams(c);

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
 * Helper function to validate date parameters
 * These parameters only affect what data is displayed to the user,
 * not the accuracy of streak calculations
 */
function validateDateParams(c: Context): {
  startDate?: string;
  endDate?: string;
} {
  // Get query parameters
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  // Validate dates if provided
  if (startDate && !validateDateParam(startDate)) {
    throw new Error('Invalid startDate format. Use YYYY-MM-DD');
  }

  if (endDate && !validateDateParam(endDate)) {
    throw new Error('Invalid endDate format. Use YYYY-MM-DD');
  }

  return { startDate, endDate };
}

/**
 * Helper function to handle errors
 */
function handleError(c: Context, error: any): Response {
  const message = error.message || 'An unexpected error occurred';
  const status = error.status || 500;

  return c.json({ error: message }, status);
}
