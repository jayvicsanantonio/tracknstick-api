/**
 * TypeScript definitions for D1 database tables
 * These types help provide better typing for database operations
 */

// Users table
export interface User {
  id: number;
  clerk_user_id: string;
  created_at: string;
  updated_at: string;
}

// Habits table
export interface Habit {
  id: number;
  user_id: string;
  name: string;
  icon: string | null;
  frequency_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  frequency_days: string | null;
  frequency_dates: string | null;
  start_date: string;
  end_date: string | null;
  streak: number;
  best_streak: number;
  created_at: string;
  updated_at: string;
}

// Trackers table
export interface Tracker {
  id: number;
  habit_id: number;
  user_id: string;
  timestamp: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Helper type for insert operations (omitting auto-generated fields)
export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'>;
export type HabitInsert = Omit<Habit, 'id' | 'created_at' | 'updated_at'>;
export type TrackerInsert = Omit<Tracker, 'id' | 'created_at' | 'updated_at'>;

// Helper type for update operations
export type UserUpdate = Partial<
  Omit<User, 'id' | 'clerk_user_id' | 'created_at' | 'updated_at'>
>;
export type HabitUpdate = Partial<
  Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;
export type TrackerUpdate = Partial<
  Omit<
    Tracker,
    'id' | 'habit_id' | 'user_id' | 'timestamp' | 'created_at' | 'updated_at'
  >
>;

// Query parameter types
export interface DateRangeParams {
  startDate: string;
  endDate: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Converted frequency types for API responses
export interface FrequencyData {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  days?: number[];
  dates?: number[];
}

// Helper functions to convert between DB and API formats
export const parseFrequencyDays = (
  days: string | null
): number[] | undefined => {
  if (!days) return undefined;
  return days.split(',').map(Number);
};

export const parseFrequencyDates = (
  dates: string | null
): number[] | undefined => {
  if (!dates) return undefined;
  return dates.split(',').map(Number);
};

export const stringifyFrequencyDays = (
  days: number[] | undefined
): string | null => {
  if (!days || days.length === 0) return null;
  return days.join(',');
};

export const stringifyFrequencyDates = (
  dates: number[] | undefined
): string | null => {
  if (!dates || dates.length === 0) return null;
  return dates.join(',');
};
