// Authentication context set by clerkMiddleware.
// Only the fields something reads live here: every consumer uses userId,
// and the error/security handlers use requestId for correlation.
export interface AuthContext {
  userId: string;
  requestId: string;
}

// Authentication context designed for performance with minimal data fetching
// Contains essential JWT claims and security metadata without additional API calls

// Extend Hono's context variable map for middleware use
declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
    validated_json: any;
    validated_query: any;
    validated_param: any;
  }
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
    | 'activity_tracking';
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
