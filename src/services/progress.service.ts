import { D1Database } from '@cloudflare/workers-types';
import * as trackerRepository from '../repositories/tracker.repository.js';
import logger from '../utils/logger.js';

/**
 * Gets user progress history showing completion rate for each day
 * The calculation is always done for a full year's worth of data to ensure accuracy,
 * but results can be filtered by date range for display purposes.
 * @param db D1Database instance
 * @param userId User's Clerk ID
 * @param startDate Optional start date to filter displayed results (YYYY-MM-DD)
 * @param endDate Optional end date to filter displayed results (YYYY-MM-DD)
 * @returns Array of daily progress with date and completion rate
 */
export async function getUserProgressHistory(
  db: D1Database,
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<Array<{ date: string; completionRate: number }>> {
  try {
    logger.info(`Fetching progress history for user ${userId}`);
    return await trackerRepository.getUserProgressHistory(
      db,
      userId,
      startDate,
      endDate
    );
  } catch (error) {
    logger.error(`Error fetching progress history for user ${userId}:`, {
      error,
    });
    throw error;
  }
}

/**
 * Gets user's current and longest streaks based on 100% completion days
 * This function always calculates streaks based on a full year of data
 * to ensure accuracy, regardless of any date filters for display.
 * @param db D1Database instance
 * @param userId User's Clerk ID
 * @returns Object containing current streak and longest streak
 */
export async function getUserStreaks(
  db: D1Database,
  userId: string
): Promise<{ currentStreak: number; longestStreak: number }> {
  try {
    logger.info(`Fetching streak information for user ${userId}`);
    return await trackerRepository.getUserStreaks(db, userId);
  } catch (error) {
    logger.error(`Error fetching streaks for user ${userId}:`, { error });
    throw error;
  }
}

/**
 * Gets complete progress data including history and streaks in a single call
 * Streaks are calculated using a full dataset for accuracy, while history
 * data may be filtered by date range for display purposes only.
 * @param db D1Database instance
 * @param userId User's Clerk ID
 * @param startDate Optional start date to filter displayed history (YYYY-MM-DD)
 * @param endDate Optional end date to filter displayed history (YYYY-MM-DD)
 * @returns Object containing history, current streak, and longest streak
 */
export async function getUserProgressOverview(
  db: D1Database,
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  history: Array<{ date: string; completionRate: number }>;
  currentStreak: number;
  longestStreak: number;
}> {
  try {
    logger.info(`Fetching progress overview for user ${userId}`);

    // Get both history and streaks in parallel for efficiency
    const [history, streaks] = await Promise.all([
      getUserProgressHistory(db, userId, startDate, endDate),
      getUserStreaks(db, userId),
    ]);

    return {
      history,
      currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak,
    };
  } catch (error) {
    logger.error(`Error fetching progress overview for user ${userId}:`, {
      error,
    });
    throw error;
  }
}
