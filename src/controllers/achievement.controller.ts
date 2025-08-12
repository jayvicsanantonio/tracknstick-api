// Controller for achievement endpoints
// Handles HTTP requests for achievement-related operations

import { Context } from 'hono';
import * as achievementService from '../services/achievement.service.js';

/**
 * Get all achievements for the authenticated user with progress
 */
export const getAllAchievements = async (c: Context) => {
  const { userId } = c.get('auth');

  try {
    const achievements = await achievementService.getAllAchievementsForUser(userId, c.env.DB);
    return c.json({ achievements });
  } catch (error) {
    console.error(`Error in getAllAchievements controller for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get only the achievements that the user has earned
 */
export const getUserEarnedAchievements = async (c: Context) => {
  const { userId } = c.get('auth');

  try {
    const userAchievements = await achievementService.getUserAchievements(userId, c.env.DB);
    
    const response = userAchievements.map(ua => ({
      id: ua.achievement?.id.toString(),
      key: ua.achievement?.key,
      name: ua.achievement?.name,
      description: ua.achievement?.description,
      icon: ua.achievement?.icon,
      type: ua.achievement?.type,
      category: ua.achievement?.category,
      earnedAt: ua.earnedAt,
      progressData: ua.progressData ? JSON.parse(ua.progressData) : undefined,
    }));

    return c.json({ achievements: response });
  } catch (error) {
    console.error(`Error in getUserEarnedAchievements controller for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Check for new achievements and award them to the user
 */
export const checkAchievements = async (c: Context) => {
  const { userId } = c.get('auth');

  try {
    const newlyEarned = await achievementService.checkAndAwardAchievements(userId, c.env.DB);
    
    const response = newlyEarned.map(achievement => ({
      id: achievement.id.toString(),
      key: achievement.key,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      type: achievement.type,
      category: achievement.category,
    }));

    return c.json({
      message: `Awarded ${newlyEarned.length} new achievement(s)`,
      newAchievements: response,
      count: newlyEarned.length,
    });
  } catch (error) {
    console.error(`Error in checkAchievements controller for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Initialize achievements in the database (admin/setup endpoint)
 */
export const initializeAchievements = async (c: Context) => {
  try {
    await achievementService.initializeAchievements(c.env.DB);
    return c.json({ message: 'Achievements initialized successfully' });
  } catch (error) {
    console.error('Error in initializeAchievements controller:', error);
    throw error;
  }
};

/**
 * Get achievement statistics for the user
 */
export const getAchievementStats = async (c: Context) => {
  const { userId } = c.get('auth');

  try {
    const [allAchievements, userAchievements] = await Promise.all([
      achievementService.getAllAchievementsForUser(userId, c.env.DB),
      achievementService.getUserAchievements(userId, c.env.DB),
    ]);

    const totalAchievements = allAchievements.length;
    const earnedAchievements = userAchievements.length;
    const completionPercentage = totalAchievements > 0 
      ? Math.round((earnedAchievements / totalAchievements) * 100) 
      : 0;

    // Group by category
    const categoryStats = allAchievements.reduce((acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = { total: 0, earned: 0 };
      }
      acc[achievement.category].total++;
      if (achievement.isEarned) {
        acc[achievement.category].earned++;
      }
      return acc;
    }, {} as Record<string, { total: number; earned: number }>);

    // Recent achievements (last 10)
    const recentAchievements = userAchievements
      .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
      .slice(0, 10)
      .map(ua => ({
        id: ua.achievement?.id.toString(),
        key: ua.achievement?.key,
        name: ua.achievement?.name,
        description: ua.achievement?.description,
        icon: ua.achievement?.icon,
        category: ua.achievement?.category,
        earnedAt: ua.earnedAt,
      }));

    return c.json({
      totalAchievements,
      earnedAchievements,
      completionPercentage,
      categoryStats,
      recentAchievements,
    });
  } catch (error) {
    console.error(`Error in getAchievementStats controller for user ${userId}:`, error);
    throw error;
  }
};