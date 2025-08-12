// Repository for achievement data operations
// Handles database interactions for achievements and user achievements

import type { D1Database } from '@cloudflare/workers-types';
import { Achievement, UserAchievement } from '../types/index.js';

export class AchievementRepository {
  constructor(private db: D1Database) {}

  async getAllAchievements(): Promise<Achievement[]> {
    const results = await this.db
      .prepare(`
        SELECT 
          id, key, name, description, icon, type, category,
          requirement_type as requirementType,
          requirement_value as requirementValue,
          requirement_data as requirementData,
          is_active as isActive,
          created_at as createdAt
        FROM achievements 
        WHERE is_active = 1
        ORDER BY category, type, requirement_value
      `)
      .all();
    
    return results.results.map((row: any) => ({
      id: row.id as number,
      key: row.key as string,
      name: row.name as string,
      description: row.description as string,
      icon: row.icon as string,
      type: row.type as Achievement['type'],
      category: row.category as Achievement['category'],
      requirementType: row.requirementType as Achievement['requirementType'],
      requirementValue: row.requirementValue as number,
      requirementData: row.requirementData as string,
      isActive: Boolean(row.isActive),
      createdAt: row.createdAt as string,
    }));
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const results = await this.db
      .prepare(`
        SELECT 
          ua.id, ua.user_id as userId, ua.achievement_id as achievementId,
          ua.earned_at as earnedAt, ua.progress_data as progressData,
          a.key, a.name, a.description, a.icon, a.type, a.category,
          a.requirement_type as requirementType,
          a.requirement_value as requirementValue,
          a.requirement_data as requirementData,
          a.is_active as isActive,
          a.created_at as createdAt
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = ? AND a.is_active = 1
        ORDER BY ua.earned_at DESC
      `)
      .bind(userId)
      .all();
    
    return results.results.map(row => ({
      id: row.id as number,
      userId: row.userId as string,
      achievementId: row.achievementId as number,
      earnedAt: row.earnedAt as string,
      progressData: row.progressData as string,
      achievement: {
        id: row.achievementId as number,
        key: row.key as string,
        name: row.name as string,
        description: row.description as string,
        icon: row.icon as string,
        type: row.type as Achievement['type'],
        category: row.category as Achievement['category'],
        requirementType: row.requirementType as Achievement['requirementType'],
        requirementValue: row.requirementValue as number,
        requirementData: row.requirementData as string,
        isActive: Boolean(row.isActive),
        createdAt: row.createdAt as string,
      }
    }));
  }

  async earnAchievement(userId: string, achievementId: number, progressData?: any): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO user_achievements (user_id, achievement_id, progress_data)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, achievement_id) DO NOTHING
      `)
      .bind(userId, achievementId, progressData ? JSON.stringify(progressData) : null)
      .run();
  }

  async hasUserEarnedAchievement(userId: string, achievementId: number): Promise<boolean> {
    const result = await this.db
      .prepare(`
        SELECT 1 FROM user_achievements 
        WHERE user_id = ? AND achievement_id = ?
      `)
      .bind(userId, achievementId)
      .first();
    
    return !!result;
  }

  async initializeAchievements(): Promise<void> {
    const achievements = this.getDefaultAchievements();
    
    for (const achievement of achievements) {
      await this.db
        .prepare(`
          INSERT OR REPLACE INTO achievements 
          (key, name, description, icon, type, category, requirement_type, requirement_value, requirement_data, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          achievement.key,
          achievement.name,
          achievement.description,
          achievement.icon || null,
          achievement.type,
          achievement.category,
          achievement.requirementType,
          achievement.requirementValue,
          achievement.requirementData || null,
          achievement.isActive ? 1 : 0
        )
        .run();
    }
  }

  async getUserHabitStats(userId: string): Promise<{
    totalHabits: number;
    totalCompletions: number;
    longestStreak: number;
    currentStreaks: number[];
    activeDays: number;
    perfectDays: number;
  }> {
    // Get total habits created
    const habitCountResult = await this.db
      .prepare(`SELECT COUNT(*) as count FROM habits WHERE user_id = ? AND deleted_at IS NULL`)
      .bind(userId)
      .first();
    
    // Get total completions
    const completionsResult = await this.db
      .prepare(`SELECT COUNT(*) as count FROM trackers WHERE user_id = ? AND deleted_at IS NULL`)
      .bind(userId)
      .first();
    
    // Get longest streak across all habits
    const longestStreakResult = await this.db
      .prepare(`SELECT MAX(longest_streak) as maxStreak FROM habits WHERE user_id = ? AND deleted_at IS NULL`)
      .bind(userId)
      .first();
    
    // Get current streaks
    const currentStreaksResult = await this.db
      .prepare(`SELECT streak FROM habits WHERE user_id = ? AND deleted_at IS NULL AND streak > 0`)
      .bind(userId)
      .all();
    
    // Get active days (days with at least one completion)
    const activeDaysResult = await this.db
      .prepare(`
        SELECT COUNT(DISTINCT DATE(timestamp)) as count 
        FROM trackers 
        WHERE user_id = ? AND deleted_at IS NULL
      `)
      .bind(userId)
      .first();
    
    // Get perfect days (days where user completed all active habits)
    const perfectDaysQuery = await this.db
      .prepare(`
        WITH daily_stats AS (
          SELECT 
            DATE(t.timestamp) as date,
            COUNT(t.id) as completions,
            COUNT(DISTINCT h.id) as active_habits
          FROM trackers t
          JOIN habits h ON t.habit_id = h.id
          WHERE t.user_id = ? AND t.deleted_at IS NULL AND h.deleted_at IS NULL
            AND DATE(t.timestamp) >= DATE(h.start_date)
            AND (h.end_date IS NULL OR DATE(t.timestamp) <= DATE(h.end_date))
          GROUP BY DATE(t.timestamp)
        )
        SELECT COUNT(*) as count FROM daily_stats WHERE completions = active_habits
      `)
      .bind(userId)
      .first();

    return {
      totalHabits: (habitCountResult?.count as number) || 0,
      totalCompletions: (completionsResult?.count as number) || 0,
      longestStreak: (longestStreakResult?.maxStreak as number) || 0,
      currentStreaks: currentStreaksResult.results.map(row => row.streak as number),
      activeDays: (activeDaysResult?.count as number) || 0,
      perfectDays: (perfectDaysQuery?.count as number) || 0,
    };
  }

  private getDefaultAchievements(): Omit<Achievement, 'id' | 'createdAt'>[] {
    return [
      // Getting Started Category
      {
        key: 'first_habit',
        name: 'First Step',
        description: 'Create your very first habit',
        icon: 'Sprout',
        type: 'habit_creation',
        category: 'getting_started',
        requirementType: 'count',
        requirementValue: 1,
        isActive: true,
      },
      {
        key: 'first_completion',
        name: 'Getting Started',
        description: 'Complete your first habit',
        icon: 'CheckCircle',
        type: 'completion',
        category: 'getting_started',
        requirementType: 'count',
        requirementValue: 1,
        isActive: true,
      },
      {
        key: 'three_habits',
        name: 'Building Momentum',
        description: 'Create 3 habits',
        icon: 'Target',
        type: 'habit_creation',
        category: 'getting_started',
        requirementType: 'count',
        requirementValue: 3,
        isActive: true,
      },
      {
        key: 'five_habits',
        name: 'Habit Collector',
        description: 'Create 5 habits',
        icon: 'BookOpen',
        type: 'habit_creation',
        category: 'getting_started',
        requirementType: 'count',
        requirementValue: 5,
        isActive: true,
      },
      {
        key: 'first_week',
        name: 'Week Warrior',
        description: 'Complete habits for 7 days',
        icon: 'Calendar',
        type: 'special_achievement',
        category: 'getting_started',
        requirementType: 'days',
        requirementValue: 7,
        isActive: true,
      },

      // Consistency Category
      {
        key: 'streak_3',
        name: 'On a Roll',
        description: 'Maintain a 3-day streak',
        icon: 'Flame',
        type: 'streak',
        category: 'consistency',
        requirementType: 'streak',
        requirementValue: 3,
        isActive: true,
      },
      {
        key: 'streak_7',
        name: 'Week Streak',
        description: 'Maintain a 7-day streak',
        icon: 'Zap',
        type: 'streak',
        category: 'consistency',
        requirementType: 'streak',
        requirementValue: 7,
        isActive: true,
      },
      {
        key: 'streak_14',
        name: 'Two Weeks Strong',
        description: 'Maintain a 14-day streak',
        icon: 'Shield',
        type: 'streak',
        category: 'consistency',
        requirementType: 'streak',
        requirementValue: 14,
        isActive: true,
      },
      {
        key: 'streak_21',
        name: 'Habit Former',
        description: 'Maintain a 21-day streak',
        icon: 'Medal',
        type: 'streak',
        category: 'consistency',
        requirementType: 'streak',
        requirementValue: 21,
        isActive: true,
      },
      {
        key: 'streak_30',
        name: 'Month Master',
        description: 'Maintain a 30-day streak',
        icon: 'Crown',
        type: 'streak',
        category: 'consistency',
        requirementType: 'streak',
        requirementValue: 30,
        isActive: true,
      },
      {
        key: 'streak_50',
        name: 'Fifty Days',
        description: 'Maintain a 50-day streak',
        icon: 'Star',
        type: 'streak',
        category: 'consistency',
        requirementType: 'streak',
        requirementValue: 50,
        isActive: true,
      },
      {
        key: 'streak_66',
        name: 'Habit Scientist',
        description: 'Maintain a 66-day streak (average time to form a habit)',
        icon: 'Activity',
        type: 'streak',
        category: 'consistency',
        requirementType: 'streak',
        requirementValue: 66,
        isActive: true,
      },
      {
        key: 'streak_100',
        name: 'Centurion',
        description: 'Maintain a 100-day streak',
        icon: 'Building',
        type: 'streak',
        category: 'consistency',
        requirementType: 'streak',
        requirementValue: 100,
        isActive: true,
      },
      {
        key: 'perfect_week',
        name: 'Perfect Week',
        description: 'Complete all habits every day for a week',
        icon: 'Star',
        type: 'special_achievement',
        category: 'consistency',
        requirementType: 'days',
        requirementValue: 7,
        requirementData: '{"type": "perfect_days"}',
        isActive: true,
      },
      {
        key: 'perfect_month',
        name: 'Perfect Month',
        description: 'Complete all habits every day for 30 days',
        icon: 'Moon',
        type: 'special_achievement',
        category: 'consistency',
        requirementType: 'days',
        requirementValue: 30,
        requirementData: '{"type": "perfect_days"}',
        isActive: true,
      },

      // Dedication Category
      {
        key: 'completions_10',
        name: 'Getting Active',
        description: 'Complete habits 10 times',
        icon: 'Activity',
        type: 'completion',
        category: 'dedication',
        requirementType: 'count',
        requirementValue: 10,
        isActive: true,
      },
      {
        key: 'completions_25',
        name: 'Quarter Century',
        description: 'Complete habits 25 times',
        icon: 'Star',
        type: 'completion',
        category: 'dedication',
        requirementType: 'count',
        requirementValue: 25,
        isActive: true,
      },
      {
        key: 'completions_50',
        name: 'Half Century',
        description: 'Complete habits 50 times',
        icon: 'Target',
        type: 'completion',
        category: 'dedication',
        requirementType: 'count',
        requirementValue: 50,
        isActive: true,
      },
      {
        key: 'completions_100',
        name: 'Century Club',
        description: 'Complete habits 100 times',
        icon: 'Trophy',
        type: 'completion',
        category: 'dedication',
        requirementType: 'count',
        requirementValue: 100,
        isActive: true,
      },
      {
        key: 'completions_250',
        name: 'Dedicated',
        description: 'Complete habits 250 times',
        icon: 'Award',
        type: 'completion',
        category: 'dedication',
        requirementType: 'count',
        requirementValue: 250,
        isActive: true,
      },
      {
        key: 'completions_500',
        name: 'Habit Master',
        description: 'Complete habits 500 times',
        icon: 'Medal',
        type: 'completion',
        category: 'dedication',
        requirementType: 'count',
        requirementValue: 500,
        isActive: true,
      },
      {
        key: 'completions_1000',
        name: 'Legendary',
        description: 'Complete habits 1000 times',
        icon: 'Crown',
        type: 'completion',
        category: 'dedication',
        requirementType: 'count',
        requirementValue: 1000,
        isActive: true,
      },
      {
        key: 'active_30_days',
        name: 'Monthly Active',
        description: 'Be active for 30 days',
        icon: 'TrendingUp',
        type: 'special_achievement',
        category: 'dedication',
        requirementType: 'days',
        requirementValue: 30,
        isActive: true,
      },
      {
        key: 'active_60_days',
        name: 'Bi-Monthly Active',
        description: 'Be active for 60 days',
        icon: 'TrendingUp',
        type: 'special_achievement',
        category: 'dedication',
        requirementType: 'days',
        requirementValue: 60,
        isActive: true,
      },
      {
        key: 'active_100_days',
        name: 'Hundred Day Hero',
        description: 'Be active for 100 days',
        icon: 'Shield',
        type: 'special_achievement',
        category: 'dedication',
        requirementType: 'days',
        requirementValue: 100,
        isActive: true,
      },

      // Milestones Category  
      {
        key: 'ten_habits',
        name: 'Habit Enthusiast',
        description: 'Create 10 habits',
        icon: 'Target',
        type: 'habit_creation',
        category: 'milestones',
        requirementType: 'count',
        requirementValue: 10,
        isActive: true,
      },
      {
        key: 'twenty_habits',
        name: 'Habit Architect',
        description: 'Create 20 habits',
        icon: 'Building',
        type: 'habit_creation',
        category: 'milestones',
        requirementType: 'count',
        requirementValue: 20,
        isActive: true,
      },
      {
        key: 'streak_365',
        name: 'Year Long',
        description: 'Maintain a 365-day streak',
        icon: 'Star',
        type: 'streak',
        category: 'milestones',
        requirementType: 'streak',
        requirementValue: 365,
        isActive: true,
      },
      {
        key: 'streak_500',
        name: 'Unstoppable',
        description: 'Maintain a 500-day streak',
        icon: 'Rocket',
        type: 'streak',
        category: 'milestones',
        requirementType: 'streak',
        requirementValue: 500,
        isActive: true,
      },
      {
        key: 'streak_1000',
        name: 'Millennium',
        description: 'Maintain a 1000-day streak',
        icon: 'Zap',
        type: 'streak',
        category: 'milestones',
        requirementType: 'streak',
        requirementValue: 1000,
        isActive: true,
      },
      {
        key: 'early_bird',
        name: 'Early Bird',
        description: 'Complete a habit before 8 AM for 7 days',
        icon: 'Sun',
        type: 'special_achievement',
        category: 'milestones',
        requirementType: 'days',
        requirementValue: 7,
        requirementData: '{"type": "early_morning", "hour": 8}',
        isActive: true,
      },
      {
        key: 'night_owl',
        name: 'Night Owl',
        description: 'Complete a habit after 10 PM for 7 days',
        icon: 'Moon',
        type: 'special_achievement',
        category: 'milestones',
        requirementType: 'days',
        requirementValue: 7,
        requirementData: '{"type": "late_night", "hour": 22}',
        isActive: true,
      },
      {
        key: 'weekend_warrior',
        name: 'Weekend Warrior',
        description: 'Complete habits on weekends for 4 weeks',
        icon: 'Shield',
        type: 'special_achievement',
        category: 'milestones',
        requirementType: 'days',
        requirementValue: 8,
        requirementData: '{"type": "weekend_only"}',
        isActive: true,
      },
      {
        key: 'comeback_kid',
        name: 'Comeback Kid',
        description: 'Restart a habit after a 7-day break',
        icon: 'RefreshCw',
        type: 'special_achievement',
        category: 'milestones',
        requirementType: 'count',
        requirementValue: 1,
        requirementData: '{"type": "habit_restart"}',
        isActive: true,
      },
      {
        key: 'habit_variety',
        name: 'Variety Seeker',
        description: 'Have 5 different types of habits active',
        icon: 'Heart',
        type: 'special_achievement',
        category: 'milestones',
        requirementType: 'count',
        requirementValue: 5,
        requirementData: '{"type": "habit_variety"}',
        isActive: true,
      },
      {
        key: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Add notes to habit completions 20 times',
        icon: 'MessageSquare',
        type: 'special_achievement',
        category: 'milestones',
        requirementType: 'count',
        requirementValue: 20,
        requirementData: '{"type": "notes_added"}',
        isActive: true,
      },
      {
        key: 'minimalist',
        name: 'Minimalist',
        description: 'Maintain just 1 habit for 30 days',
        icon: 'Activity',
        type: 'special_achievement',
        category: 'milestones',
        requirementType: 'days',
        requirementValue: 30,
        requirementData: '{"type": "single_habit"}',
        isActive: true,
      },
      {
        key: 'maximalist',
        name: 'Maximalist',
        description: 'Complete 10+ habits in a single day',
        icon: 'Star',
        type: 'special_achievement',
        category: 'milestones',
        requirementType: 'count',
        requirementValue: 10,
        requirementData: '{"type": "single_day_completions"}',
        isActive: true,
      },
      {
        key: 'habit_architect_advanced',
        name: 'Habit Architect',
        description: 'Create, complete, and maintain habits across all frequency types',
        icon: 'Building',
        type: 'special_achievement',
        category: 'milestones',
        requirementType: 'count',
        requirementValue: 1,
        requirementData: '{"type": "all_frequencies"}',
        isActive: true,
      },
      {
        key: 'time_traveler',
        name: 'Time Traveler',
        description: 'Use TrackNStick for 6 months consistently',
        icon: 'Timer',
        type: 'special_achievement',
        category: 'milestones',
        requirementType: 'days',
        requirementValue: 180,
        isActive: true,
      },
      {
        key: 'habit_guru',
        name: 'Habit Guru',
        description: 'Achieve 90% completion rate across all habits for 30 days',
        icon: 'User',
        type: 'special_achievement',
        category: 'milestones',
        requirementType: 'percentage',
        requirementValue: 90,
        requirementData: '{"type": "completion_rate", "days": 30}',
        isActive: true,
      },
      {
        key: 'phoenix',
        name: 'Phoenix',
        description: 'Restart tracking after a 30-day absence',
        icon: 'Flame',
        type: 'special_achievement',
        category: 'milestones',
        requirementType: 'count',
        requirementValue: 1,
        requirementData: '{"type": "long_comeback", "days": 30}',
        isActive: true,
      },
      {
        key: 'perfectionist',
        name: 'Perfectionist',
        description: 'Achieve 100% completion rate for 14 consecutive days',
        icon: 'Star',
        type: 'special_achievement',
        category: 'milestones',
        requirementType: 'percentage',
        requirementValue: 100,
        requirementData: '{"type": "perfect_rate", "days": 14}',
        isActive: true,
      },
      {
        key: 'habit_legend',
        name: 'Habit Legend',
        description: 'Complete 50 different achievements',
        icon: 'Crown',
        type: 'special_achievement',
        category: 'milestones',
        requirementType: 'count',
        requirementValue: 40, // Less than total since this is one of them
        requirementData: '{"type": "achievement_count"}',
        isActive: true,
      }
    ];
  }
}