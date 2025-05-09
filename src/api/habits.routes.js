const express = require('express');
const { clerkMiddleware } = require('@clerk/express');
const habitController = require('../controllers/habit.controller');
const validate = require('../middlewares/validate');
const habitValidation = require('../validators/habit.validator');

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

module.exports = router;
