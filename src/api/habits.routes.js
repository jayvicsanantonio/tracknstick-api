import { Hono } from 'hono';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import validate from '../middlewares/validate.js';
import habitValidation from '../validators/habit.validator.js';
import * as habitController from '../controllers/habit.controller.js';

const app = new Hono();

// Apply clerk authentication middleware to all routes
app.use('*', clerkMiddleware());

// GET /api/v1/habits
app.get(
  '/',
  validate(habitValidation.getHabitsByDateSchema, 'query'),
  habitController.getHabits
);

// POST /api/v1/habits
app.post(
  '/',
  validate(habitValidation.createHabitSchema, 'json'),
  habitController.createHabit
);

// PUT /api/v1/habits/:habitId
app.put(
  '/:habitId',
  validate(habitValidation.habitIdParamSchema, 'params'),
  validate(habitValidation.updateHabitSchema, 'json'),
  habitController.updateHabit
);

// DELETE /api/v1/habits/:habitId
app.delete(
  '/:habitId',
  validate(habitValidation.habitIdParamSchema, 'params'),
  habitController.deleteHabit
);

// GET /api/v1/habits/:habitId/trackers
app.get(
  '/:habitId/trackers',
  validate(habitValidation.habitIdParamSchema, 'params'),
  validate(habitValidation.getTrackersSchema, 'query'),
  habitController.getTrackers
);

// POST /api/v1/habits/:habitId/trackers
app.post(
  '/:habitId/trackers',
  validate(habitValidation.habitIdParamSchema, 'params'),
  validate(habitValidation.manageTrackerSchema, 'json'),
  habitController.manageTracker
);

// GET /api/v1/habits/:habitId/stats
app.get(
  '/:habitId/stats',
  validate(habitValidation.habitIdParamSchema, 'params'),
  validate(habitValidation.getHabitStatsSchema, 'query'),
  habitController.getHabitStats
);

// GET /api/v1/habits/progress/overview
app.get(
  '/progress/overview',
  validate(habitValidation.getProgressOverviewSchema, 'query'),
  habitController.getProgressOverview
);

export default app;
