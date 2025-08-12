// Service for achievement business logic
// Handles achievement processing, evaluation, and progress tracking

import type { D1Database } from '@cloudflare/workers-types';
import { AchievementRepository } from '../repositories/achievement.repository.js';
import { Achievement, UserAchievement, AchievementResponse, AchievementProgress } from '../types/index.js';

export class AchievementService {
  private repository: AchievementRepository;

  constructor(db: D1Database) {
    this.repository = new AchievementRepository(db);
  }

  async getAllAchievementsForUser(userId: string): Promise<AchievementResponse[]> {
    const [allAchievements, userAchievements] = await Promise.all([
      this.repository.getAllAchievements(),
      this.repository.getUserAchievements(userId),
    ]);

    const userAchievementMap = new Map(
      userAchievements.map(ua => [ua.achievementId, ua])
    );

    return Promise.all(allAchievements.map(async achievement => {
      const userAchievement = userAchievementMap.get(achievement.id);
      const isEarned = !!userAchievement;
      
      return {
        id: achievement.id.toString(),
        key: achievement.key,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        type: achievement.type,
        category: achievement.category,
        requirementType: achievement.requirementType,
        requirementValue: achievement.requirementValue,
        requirementData: achievement.requirementData ? JSON.parse(achievement.requirementData) : undefined,
        isEarned,
        earnedAt: userAchievement?.earnedAt,
        progress: isEarned ? undefined : await this.calculateProgress(userId, achievement),
      };
    }));
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return await this.repository.getUserAchievements(userId);
  }

  async checkAndAwardAchievements(userId: string): Promise<Achievement[]> {
    const allAchievements = await this.repository.getAllAchievements();
    const userAchievements = await this.repository.getUserAchievements(userId);
    const earnedAchievementIds = new Set(userAchievements.map(ua => ua.achievementId));
    
    const newlyEarned: Achievement[] = [];

    for (const achievement of allAchievements) {
      if (earnedAchievementIds.has(achievement.id)) continue;

      const hasEarned = await this.evaluateAchievement(userId, achievement);
      if (hasEarned) {
        await this.repository.earnAchievement(userId, achievement.id);
        newlyEarned.push(achievement);
      }
    }

    return newlyEarned;
  }

  async initializeAchievements(): Promise<void> {
    await this.repository.initializeAchievements();
  }

  private async calculateProgress(userId: string, achievement: Achievement): Promise<AchievementProgress> {
    const stats = await this.repository.getUserHabitStats(userId);
    let currentValue = 0;

    switch (achievement.type) {
      case 'habit_creation':
        currentValue = stats.totalHabits;
        break;
      
      case 'completion':
        currentValue = stats.totalCompletions;
        break;
      
      case 'streak':
        currentValue = stats.longestStreak;
        break;
      
      case 'milestone':
        currentValue = await this.calculateMilestoneProgress(userId, achievement, stats);
        break;
    }

    const progressPercentage = Math.min(100, (currentValue / achievement.requirementValue) * 100);

    return {
      achievementId: achievement.id,
      currentValue,
      targetValue: achievement.requirementValue,
      isEarned: false,
      progressPercentage: Math.round(progressPercentage * 100) / 100,
    };
  }

  private async evaluateAchievement(userId: string, achievement: Achievement): Promise<boolean> {
    const stats = await this.repository.getUserHabitStats(userId);

    switch (achievement.type) {
      case 'habit_creation':
        return stats.totalHabits >= achievement.requirementValue;
      
      case 'completion':
        return stats.totalCompletions >= achievement.requirementValue;
      
      case 'streak':
        return stats.longestStreak >= achievement.requirementValue;
      
      case 'milestone':
        return await this.evaluateMilestone(userId, achievement, stats);
    }

    return false;
  }

  private async calculateMilestoneProgress(userId: string, achievement: Achievement, stats: any): Promise<number> {
    const requirementData = achievement.requirementData ? JSON.parse(achievement.requirementData) : {};

    switch (achievement.requirementType) {
      case 'days':
        if (requirementData.type === 'perfect_days') {
          return stats.perfectDays;
        }
        return stats.activeDays;
      
      case 'count':
        if (requirementData.type === 'single_day_completions') {
          // Would need additional query to check max completions in single day
          return 0; // Placeholder
        }
        if (requirementData.type === 'notes_added') {
          // Would need additional query to count tracker entries with notes
          return 0; // Placeholder
        }
        return 0;
      
      case 'percentage':
        if (requirementData.type === 'completion_rate') {
          // Would need additional calculation for completion rate
          return 0; // Placeholder
        }
        return 0;
    }

    return 0;
  }

  private async evaluateMilestone(userId: string, achievement: Achievement, stats: any): Promise<boolean> {
    const requirementData = achievement.requirementData ? JSON.parse(achievement.requirementData) : {};

    switch (achievement.requirementType) {
      case 'days':
        if (requirementData.type === 'perfect_days') {
          return stats.perfectDays >= achievement.requirementValue;
        }
        return stats.activeDays >= achievement.requirementValue;
      
      case 'count':
        // Handle complex milestone requirements
        return await this.evaluateComplexMilestone(userId, achievement, requirementData, stats);
      
      case 'percentage':
        // Handle percentage-based milestones
        return await this.evaluatePercentageMilestone(userId, achievement, requirementData);
    }

    return false;
  }

  private async evaluateComplexMilestone(userId: string, achievement: Achievement, requirementData: any, stats: any): Promise<boolean> {
    // Placeholder for complex milestone evaluation
    // This would include logic for achievements like:
    // - single_day_completions
    // - notes_added
    // - habit_restart
    // - habit_variety
    // - achievement_count
    // etc.
    
    return false; // For now, these achievements won't be automatically awarded
  }

  private async evaluatePercentageMilestone(userId: string, achievement: Achievement, requirementData: any): Promise<boolean> {
    // Placeholder for percentage-based milestone evaluation
    // This would include logic for completion rates over time periods
    
    return false; // For now, these achievements won't be automatically awarded
  }
}

// Factory function to create service instance
export const createAchievementService = (db: D1Database) => {
  return new AchievementService(db);
};

// Convenience functions for controllers
export const getAllAchievementsForUser = async (userId: string, db: D1Database): Promise<AchievementResponse[]> => {
  const service = createAchievementService(db);
  return service.getAllAchievementsForUser(userId);
};

export const getUserAchievements = async (userId: string, db: D1Database): Promise<UserAchievement[]> => {
  const service = createAchievementService(db);
  return service.getUserAchievements(userId);
};

export const checkAndAwardAchievements = async (userId: string, db: D1Database): Promise<Achievement[]> => {
  const service = createAchievementService(db);
  return service.checkAndAwardAchievements(userId);
};

export const initializeAchievements = async (db: D1Database): Promise<void> => {
  const service = createAchievementService(db);
  return service.initializeAchievements();
};