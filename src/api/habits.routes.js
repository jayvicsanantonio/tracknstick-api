import express from 'express';
import { clerkMiddleware } from '@clerk/express';
import * as habitController from '../controllers/habit.controller.js';
import validate from '../middlewares/validate.js';
import habitValidation from '../validators/habit.validator.js';

const router = express.Router();

router.get(
  '/',
  clerkMiddleware(),
  validate(habitValidation.getHabitsByDate),
  habitController.getHabits
);

router.post(
  '/',
  clerkMiddleware(),
  validate(habitValidation.createHabit),
  habitController.createHabit
);

router.put(
  '/:habitId',
  clerkMiddleware(),
  validate(habitValidation.updateHabit),
  habitController.updateHabit
);

router.delete(
  '/:habitId',
  clerkMiddleware(),
  validate(habitValidation.deleteHabit),
  habitController.deleteHabit
);

router.get(
  '/:habitId/trackers',
  clerkMiddleware(),
  validate(habitValidation.getTrackers),
  habitController.getTrackers
);

router.post(
  '/:habitId/trackers',
  clerkMiddleware(),
  validate(habitValidation.manageTracker),
  habitController.manageTracker
);

router.get(
  '/:habitId/stats',
  clerkMiddleware(),
  validate(habitValidation.getHabitStats),
  habitController.getHabitStats
);

router.get(
  '/progress/overview',
  clerkMiddleware(),
  validate(habitValidation.getProgressOverview),
  habitController.getProgressOverview
);

export default router;
