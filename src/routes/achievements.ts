// Routes for achievement endpoints
// Defines HTTP routes for achievement-related operations

import { Hono } from 'hono';
import { clerkMiddleware } from '../middlewares/clerkMiddleware.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import * as achievementValidator from '../validators/achievement.validator.js';
import * as achievementController from '../controllers/achievement.controller.js';

// Create a sub-application for achievements
const app = new Hono();

// Apply Clerk auth middleware to all routes except initialize
app.use('*', async (c, next) => {
  // Skip authentication for the initialize endpoint
  if (c.req.path.endsWith('/initialize')) {
    return await next();
  }
  return await clerkMiddleware()(c, next);
});

// GET /api/v1/achievements - Get all achievements with progress for user
app.get(
  '/',
  achievementController.getAllAchievements
);

// GET /api/v1/achievements/earned - Get only earned achievements for user
app.get(
  '/earned',
  achievementController.getUserEarnedAchievements
);

// GET /api/v1/achievements/stats - Get achievement statistics for user
app.get(
  '/stats',
  achievementController.getAchievementStats
);

// POST /api/v1/achievements/check - Check and award new achievements
app.post(
  '/check',
  achievementController.checkAchievements
);

// POST /api/v1/achievements/initialize - Initialize achievements (admin/setup)
app.post(
  '/initialize',
  achievementController.initializeAchievements
);

export { app as achievementRoutes };