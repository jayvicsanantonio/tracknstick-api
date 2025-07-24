import { Hono } from 'hono';
import { clerkMiddleware } from '../middlewares/clerkMiddleware.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { authRateLimit } from '../middlewares/rateLimit.js';
import * as habitValidator from '../validators/habit.validator.js';
import * as habitController from '../controllers/habit.controller.js';

// Create a sub-application for habits
const app = new Hono();

// Apply authentication rate limiting to all routes (since all require auth)
app.use('*', authRateLimit);

// Apply Clerk auth middleware to all routes
app.use('*', clerkMiddleware());

// GET /api/v1/habits
app.get(
  '/',
  validateRequest(habitValidator.getHabitsByDateSchema, 'query'),
  habitController.getHabits
);

// POST /api/v1/habits
app.post(
  '/',
  validateRequest(habitValidator.createHabitSchema, 'json'),
  habitController.createHabit
);

// PUT /api/v1/habits/:habitId
app.put(
  '/:habitId',
  validateRequest(habitValidator.habitIdParamSchema, 'param'),
  validateRequest(habitValidator.updateHabitSchema, 'json'),
  habitController.updateHabit
);

// DELETE /api/v1/habits/:habitId
app.delete(
  '/:habitId',
  validateRequest(habitValidator.habitIdParamSchema, 'param'),
  habitController.deleteHabit
);

// GET /api/v1/habits/:habitId/trackers
app.get(
  '/:habitId/trackers',
  validateRequest(habitValidator.habitIdParamSchema, 'param'),
  validateRequest(habitValidator.getTrackersSchema, 'query'),
  habitController.getTrackers
);

// POST /api/v1/habits/:habitId/trackers
app.post(
  '/:habitId/trackers',
  validateRequest(habitValidator.habitIdParamSchema, 'param'),
  validateRequest(habitValidator.manageTrackerSchema, 'json'),
  habitController.manageTracker
);

// GET /api/v1/habits/:habitId/stats
app.get(
  '/:habitId/stats',
  validateRequest(habitValidator.habitIdParamSchema, 'param'),
  validateRequest(habitValidator.getHabitStatsSchema, 'query'),
  habitController.getHabitStats
);

// GET /api/v1/habits/progress/overview
app.get(
  '/progress/overview',
  validateRequest(habitValidator.getProgressOverviewSchema, 'query'),
  habitController.getProgressOverview
);

export { app as habitRoutes };
