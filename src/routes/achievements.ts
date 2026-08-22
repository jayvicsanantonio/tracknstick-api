// Routes for achievement endpoints
// Defines HTTP routes for achievement-related operations

import { Hono } from 'hono';
import { clerkMiddleware } from '../middlewares/clerkMiddleware.js';
import { withClerkFailureHandling } from '../middlewares/middlewareFailureHandler.js';
import * as achievementController from '../controllers/achievement.controller.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { achievementQuerySchema } from '../validators/achievement.validator.js';

// Create a sub-application for achievements
const app = new Hono();

// Auth is attached per route rather than by a path predicate, so each
// route's posture is readable at its own declaration and a future path
// cannot fall through an exemption by accident.
const requireAuth = withClerkFailureHandling(clerkMiddleware());

// Day-counting rules need the caller's calendar; see achievementQuerySchema.
const withTimeZone = validateRequest(achievementQuerySchema, 'query');

// GET /api/v1/achievements - Get all achievements with progress for user
app.get(
  '/',
  requireAuth,
  withTimeZone,
  achievementController.getAllAchievements
);

// GET /api/v1/achievements/earned - Get only earned achievements for user
app.get(
  '/earned',
  requireAuth,
  achievementController.getUserEarnedAchievements
);

// GET /api/v1/achievements/stats - Get achievement statistics for user
app.get(
  '/stats',
  requireAuth,
  withTimeZone,
  achievementController.getAchievementStats
);

// POST /api/v1/achievements/check - Check and award new achievements
app.post(
  '/check',
  requireAuth,
  withTimeZone,
  achievementController.checkAchievements
);

// POST /api/v1/achievements/initialize - seeds the achievement catalogue.
// Authenticated: it takes no user id, but it is still a write to shared
// state, and nothing in either client calls it without a session.
app.post(
  '/initialize',
  requireAuth,
  achievementController.initializeAchievements
);

export { app as achievementRoutes };
