import { HabitData } from '../controllers/habit.controller.js';

// Extend Hono's context variable map for middleware use
declare module 'hono' {
  interface ContextVariableMap {
    auth: {
      userId: string;
      sessionId: string;
    };
    validated_json: any;
    validated_query: any;
    validated_param: any;
  }
}

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface HabitResponse {
  id: string;
  name: string;
  icon?: string;
  frequency: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    days?: number[];
    dates?: number[];
  };
  startDate: string;
  endDate?: string;
  isCompleted: boolean;
}

export interface TrackerResponse {
  id: string;
  habitId: string;
  timestamp: string;
  notes?: string;
}

export interface HabitStatsResponse {
  total: number;
  completed: number;
  streak: number;
  bestStreak: number;
  completionRate: number;
}

export interface ProgressOverviewResponse {
  totalHabits: number;
  completionRate: number;
  habitStats: Array<{
    habitId: string;
    name: string;
    completed: number;
    total: number;
    rate: number;
  }>;
}

export interface Achievement {
  id: number;
  key: string;
  name: string;
  description: string;
  icon?: string;
  type:
    | 'habit_creation'
    | 'streak'
    | 'completion'
    | 'special_achievement'
    | 'perfect_completion'
    | 'activity_tracking'
    | 'milestone';
  category: 'getting_started' | 'consistency' | 'dedication' | 'milestones';
  requirementType: 'count' | 'streak' | 'days' | 'percentage';
  requirementValue: number;
  requirementData?: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserAchievement {
  id: number;
  userId: string;
  achievementId: number;
  earnedAt: string;
  progressData?: string;
  achievement?: Achievement;
}

export interface AchievementProgress {
  achievementId: number;
  currentValue: number;
  targetValue: number;
  isEarned: boolean;
  progressPercentage: number;
}

export interface AchievementResponse {
  id: string;
  key: string;
  name: string;
  description: string;
  icon?: string;
  type: string;
  category: string;
  requirementType: string;
  requirementValue: number;
  requirementData?: any;
  isEarned: boolean;
  earnedAt?: string;
  progress?: AchievementProgress;
}
