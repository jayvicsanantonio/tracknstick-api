// Service for achievement business logic
// Handles achievement processing, evaluation, and progress tracking

import type { D1Database } from '@cloudflare/workers-types';
import { AchievementRepository } from '../repositories/achievement.repository.js';
import { getCompletionSummary } from '../repositories/tracker.repository.js';
import { peakHabitsInADay } from '../utils/completionRates.js';
import { computeStreaks } from '../utils/streakUtils.js';
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
    userId: string,
    timeZone = 'UTC'
  ): Promise<AchievementResponse[]> {
    const [allAchievements, userAchievements, snapshot] = await Promise.all([
      this.repository.getAllAchievements(),
      this.repository.getUserAchievements(userId),
      this.buildSnapshot(userId, timeZone),
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

  async checkAndAwardAchievements(
    userId: string,
    timeZone = 'UTC'
  ): Promise<Achievement[]> {
    const allAchievements = await this.repository.getAllAchievements();
    const userAchievements = await this.repository.getUserAchievements(userId);
    const earnedAchievementIds = new Set(
      userAchievements.map((ua) => ua.achievementId)
    );

    // One snapshot for the whole pass: nothing in the evaluation path reads
    // user_achievements, so awarding cannot change what the rules measure.
    const snapshot = await this.buildSnapshot(userId, timeZone);

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
   *
   * The per-day figures come from getCompletionSummary -- the same scorer
   * behind /progress/history and /progress/streaks -- rather than from
   * SQLite DATE(), which buckets by UTC. A Los Angeles user finishing at
   * 6pm previously had that completion counted on the following day, so
   * their perfect-day and active-day badges disagreed with the calendar
   * they were looking at.
   *
   * Unlike the history endpoint this covers the user's whole record, not
   * the trailing year, because the badges count lifetime totals.
   */
  private async buildSnapshot(
    userId: string,
    timeZone: string
  ): Promise<UserStatsSnapshot> {
    const [stats, summary] = await Promise.all([
      this.repository.getUserHabitStats(userId),
      getCompletionSummary(this.db, userId, timeZone),
    ]);

    const streaks = computeStreaks(summary.days, summary.today);

    return {
      totalHabits: stats.totalHabits,
      totalCompletions: stats.totalCompletions,
      notedCompletions: stats.notedCompletions,
      activeDays: summary.habitsByDay.size,
      perfectDays: summary.days.filter((day) => day.completionRate === 100)
        .length,
      maxHabitsInOneDay: peakHabitsInADay(summary.habitsByDay),
      currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak,
    };
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
  db: D1Database,
  timeZone = 'UTC'
): Promise<AchievementResponse[]> => {
  const service = createAchievementService(db);
  return service.getAllAchievementsForUser(userId, timeZone);
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
  db: D1Database,
  timeZone = 'UTC'
): Promise<Achievement[]> => {
  const service = createAchievementService(db);
  return service.checkAndAwardAchievements(userId, timeZone);
};

export const initializeAchievements = async (db: D1Database): Promise<void> => {
  const service = createAchievementService(db);
  return service.initializeAchievements();
};
