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
