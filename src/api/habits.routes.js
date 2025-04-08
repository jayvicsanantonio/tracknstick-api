const express = require('express');
const authenticate = require('../middlewares/authenticate');
const habitController = require('../controllers/habit.controller');
const validate = require('../middlewares/validate'); // Import the validation middleware
const habitValidation = require('../validators/habit.validator'); // Import the validation rules

const router = express.Router();

// === Habit Routes ===

// GET /habits - Get habits for a specific date
router.get(
  '/',
  authenticate,
  validate(habitValidation.getHabitsByDate), // Apply validation
  habitController.getHabits
);

// POST /habits - Create a new habit
router.post(
  '/',
  authenticate,
  validate(habitValidation.createHabit), // Apply validation
  habitController.createHabit
);

// PUT /habits/:habitId - Update an existing habit
router.put(
  '/:habitId',
  authenticate,
  validate(habitValidation.updateHabit), // Apply validation
  habitController.updateHabit
);

// DELETE /habits/:habitId - Delete a habit
router.delete(
  '/:habitId',
  authenticate,
  validate(habitValidation.deleteHabit), // Apply validation
  habitController.deleteHabit
);

// === Tracker Routes (Nested under Habits) ===

// GET /habits/:habitId/trackers - Get trackers for a habit (optional date range)
router.get(
  '/:habitId/trackers',
  authenticate,
  validate(habitValidation.getTrackers), // Apply validation
  habitController.getTrackers
);

// POST /habits/:habitId/trackers - Add or remove a tracker for a specific date
router.post(
  '/:habitId/trackers',
  authenticate,
  validate(habitValidation.manageTracker), // Apply validation
  habitController.manageTracker
);

// === Stats Route ===

// GET /habits/:habitId/stats - Get stats for a habit
router.get(
  '/:habitId/stats',
  authenticate,
  validate(habitValidation.getHabitStats), // Apply validation
  habitController.getHabitStats
);

module.exports = router;
