import { Hono } from 'hono';
import { clerkMiddleware } from '../middlewares/clerkMiddleware.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import * as habitValidator from '../validators/habit.validator.js';
import * as habitController from '../controllers/habit.controller.js';

// Create a sub-application for habits
const app = new Hono();

// Apply Clerk auth middleware to all routes
app.use('*', clerkMiddleware());

// GET /api/v1/habits
app.get(
  '/',
  validateRequest(habitValidator.getHabitsByDateSchema, 'query'),
  habitController.getHabits
);

// GET /api/v1/habits/progress/overview (MUST be before :habitId routes)
app.get(
  '/progress/overview',
  validateRequest(habitValidator.getProgressOverviewSchema, 'query'),
  habitController.getProgressOverview
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

// POST /api/v1/habits/:habitId/restore (for soft delete recovery)
app.post(
  '/:habitId/restore',
  validateRequest(habitValidator.habitIdParamSchema, 'param'),
  habitController.restoreHabit
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

export { app as habitRoutes };
