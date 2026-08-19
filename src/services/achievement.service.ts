// Service for achievement business logic
// Handles achievement processing, evaluation, and progress tracking

import type { D1Database } from '@cloudflare/workers-types';
import {
  AchievementRepository,
  type UserHabitStats,
} from '../repositories/achievement.repository.js';
import { getUserStreaks } from '../repositories/tracker.repository.js';
import { measure, type UserStatsSnapshot } from './achievementMetrics.js';
import {
  Achievement,
  UserAchievement,
  AchievementResponse,
  AchievementProgress,
} from '../types/index.js';

export class AchievementService {
  private repository: AchievementRepository;
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
    this.repository = new AchievementRepository(db);
  }

  async getAllAchievementsForUser(
    userId: string
  ): Promise<AchievementResponse[]> {
    const [allAchievements, userAchievements, snapshot] = await Promise.all([
      this.repository.getAllAchievements(),
      this.repository.getUserAchievements(userId),
      this.buildSnapshot(userId),
    ]);

    const userAchievementMap = new Map(
      userAchievements.map((ua) => [ua.achievementId, ua])
    );

    return allAchievements.map((achievement) => {
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
          requirementData: achievement.requirementData
            ? JSON.parse(achievement.requirementData)
            : undefined,
          isEarned,
          earnedAt: userAchievement?.earnedAt,
        progress: isEarned
          ? undefined
          : this.calculateProgress(achievement, snapshot),
      };
    });
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return await this.repository.getUserAchievements(userId);
  }

  async checkAndAwardAchievements(userId: string): Promise<Achievement[]> {
    const allAchievements = await this.repository.getAllAchievements();
    const userAchievements = await this.repository.getUserAchievements(userId);
    const earnedAchievementIds = new Set(
      userAchievements.map((ua) => ua.achievementId)
    );

    // One snapshot for the whole pass: nothing in the evaluation path reads
    // user_achievements, so awarding cannot change what the rules measure.
    const snapshot = await this.buildSnapshot(userId);

    const newlyEarned: Achievement[] = [];

    for (const achievement of allAchievements) {
      if (earnedAchievementIds.has(achievement.id)) continue;

      if (this.evaluateAchievement(achievement, snapshot)) {
        await this.repository.earnAchievement(userId, achievement.id);
        newlyEarned.push(achievement);
      }
    }

    return newlyEarned;
  }

  async initializeAchievements(): Promise<void> {
    await this.repository.initializeAchievements();
  }

  /**
   * Builds the one consistent read of user state that every rule measures.
   * Required rather than optional: an absent snapshot previously meant two
   * consumers refetched under different conditions, so "zero" and "unknown"
   * were indistinguishable.
   */
  private async buildSnapshot(userId: string): Promise<UserStatsSnapshot> {
    const [stats, streaks] = await Promise.all([
      this.repository.getUserHabitStats(userId),
      getUserStreaks(this.db, userId),
    ]);

    return { ...stats, currentStreak: streaks.currentStreak };
  }

  private calculateProgress(
    achievement: Achievement,
    snapshot: UserStatsSnapshot
  ): AchievementProgress | undefined {
    const currentValue = measure(achievement, snapshot);

    // null means this achievement has no registered metric, so there is no
    // honest progress to report -- better than a well-formed false zero.
    if (currentValue === null) return undefined;

    const progressPercentage = Math.min(
      100,
      (currentValue / achievement.requirementValue) * 100
    );

    return {
      achievementId: achievement.id,
      currentValue,
      targetValue: achievement.requirementValue,
      isEarned: false,
      progressPercentage: Math.round(progressPercentage * 100) / 100,
    };
  }

  private evaluateAchievement(
    achievement: Achievement,
    snapshot: UserStatsSnapshot
  ): boolean {
    const currentValue = measure(achievement, snapshot);
    if (currentValue === null) return false;
    return currentValue >= achievement.requirementValue;
  }
}

// Factory function to create service instance
export const createAchievementService = (db: D1Database) => {
  return new AchievementService(db);
};

// Convenience functions for controllers
export const getAllAchievementsForUser = async (
  userId: string,
  db: D1Database
): Promise<AchievementResponse[]> => {
  const service = createAchievementService(db);
  return service.getAllAchievementsForUser(userId);
};

export const getUserAchievements = async (
  userId: string,
  db: D1Database
): Promise<UserAchievement[]> => {
  const service = createAchievementService(db);
  return service.getUserAchievements(userId);
};

export const checkAndAwardAchievements = async (
  userId: string,
  db: D1Database
): Promise<Achievement[]> => {
  const service = createAchievementService(db);
  return service.checkAndAwardAchievements(userId);
};

export const initializeAchievements = async (db: D1Database): Promise<void> => {
  const service = createAchievementService(db);
  return service.initializeAchievements();
};
