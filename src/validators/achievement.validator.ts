// Validation schemas for achievement endpoints
// Defines input validation rules for achievement-related requests

import { z } from 'zod';

// No specific validation needed for GET /achievements (uses auth only)
export const getAllAchievementsSchema = z.object({});

// No specific validation needed for GET /achievements/earned (uses auth only)
export const getUserEarnedAchievementsSchema = z.object({});

// No specific validation needed for POST /achievements/check (uses auth only)
export const checkAchievementsSchema = z.object({});

// No specific validation needed for GET /achievements/stats (uses auth only)
export const getAchievementStatsSchema = z.object({});

// Schema for initializing achievements (admin endpoint)
export const initializeAchievementsSchema = z.object({});