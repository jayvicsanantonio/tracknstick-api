const express = require('express');
const authenticate = require('../middlewares/authenticate');
const habitController = require('../controllers/habit.controller');
const validate = require('../middlewares/validate');
const habitValidation = require('../validators/habit.validator');

const router = express.Router();

router.get(
  '/',
  authenticate,
  validate(habitValidation.getHabitsByDate),
  habitController.getHabits
);

router.post(
  '/',
  authenticate,
  validate(habitValidation.createHabit),
  habitController.createHabit
);

router.put(
  '/:habitId',
  authenticate,
  validate(habitValidation.updateHabit),
  habitController.updateHabit
);

router.delete(
  '/:habitId',
  authenticate,
  validate(habitValidation.deleteHabit),
  habitController.deleteHabit
);

router.get(
  '/:habitId/trackers',
  authenticate,
  validate(habitValidation.getTrackers),
  habitController.getTrackers
);

router.post(
  '/:habitId/trackers',
  authenticate,
  validate(habitValidation.manageTracker),
  habitController.manageTracker
);

router.get(
  '/:habitId/stats',
  authenticate,
  validate(habitValidation.getHabitStats),
  habitController.getHabitStats
);

module.exports = router;
