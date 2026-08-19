/**
 * TypeScript definitions for D1 database tables
 * These types help provide better typing for database operations
 *
 * Only shapes that match a real SELECT list live here. Habit rows are
 * described by HabitRow in habit.repository.ts, next to the queries that
 * produce them.
 */

// Users table
export interface User {
  id: number;
  clerk_user_id: string;
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
export type TrackerInsert = Omit<Tracker, 'id' | 'created_at' | 'updated_at'>;
