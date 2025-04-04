const express = require('express');
const authenticate = require('../middlewares/authenticate'); // Updated path
// Placeholder for controller functions (to be created later)
const habitController = require('../controllers/habit.controller');

const router = express.Router();

// === Habit Routes ===

// GET /habits - Get habits for a specific date
router.get('/', authenticate, habitController.getHabits);

// POST /habits - Create a new habit
router.post('/', authenticate, habitController.createHabit);

// PUT /habits/:habitId - Update an existing habit
router.put('/:habitId', authenticate, habitController.updateHabit);

// DELETE /habits/:habitId - Delete a habit
router.delete('/:habitId', authenticate, habitController.deleteHabit);

// === Tracker Routes (Nested under Habits) ===

// GET /habits/:habitId/trackers - Get trackers for a habit (optional date range)
router.get('/:habitId/trackers', authenticate, habitController.getTrackers);

// POST /habits/:habitId/trackers - Add or remove a tracker for a specific date
router.post('/:habitId/trackers', authenticate, habitController.manageTracker);

// === Stats Route ===

// GET /habits/:habitId/stats - Get stats for a habit
router.get('/:habitId/stats', authenticate, habitController.getHabitStats);

module.exports = router;
