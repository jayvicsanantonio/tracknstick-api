import * as habitService from '../services/habit.service.js';
import { controller } from '../middlewares/controllerHandler.js';

/**
 * @description Get habits scheduled for a specific date.
 * @route GET /api/v1/habits
 * @access Private
 */
const getHabits = controller(async (c) => {
  const userId = c.get('userId');
  const validated = c.get('validated');
  const { date, timeZone } = validated;

  const habits = await habitService.getHabitsForDate(userId, date, timeZone);
  return c.json(habits);
});

/**
 * @description Create a new habit.
 * @route POST /api/v1/habits
 * @access Private
 */
const createHabit = controller(async (c) => {
  const userId = c.get('userId');
  const validated = c.get('validated');
  const { name, icon, frequency, startDate, endDate } = validated;

  const result = await habitService.createHabit(userId, {
    name,
    icon,
    frequency,
    startDate,
    endDate,
  });

  return c.json(
    {
      message: 'Habit created successfully',
      habitId: result.habitId,
    },
    201
  );
});

/**
 * @description Update an existing habit.
 * @route PUT /api/v1/habits/:habitId
 * @access Private
 */
const updateHabit = controller(async (c) => {
  const userId = c.get('userId');
  const { habitId } = c.get('validated'); // From params validation
  const habitData = c.get('validated'); // From body validation

  await habitService.updateHabit(userId, habitId, habitData);

  return c.json(
    {
      message: 'Habit updated successfully',
    },
    200
  );
});

/**
 * @description Delete a specific habit.
 * @route DELETE /api/v1/habits/:habitId
 * @access Private
 */
const deleteHabit = controller(async (c) => {
  const userId = c.get('userId');
  const { habitId } = c.get('validated');

  await habitService.deleteHabit(userId, habitId);

  return c.json(
    {
      message: 'Habit deleted successfully',
    },
    200
  );
});

/**
 * @description Get tracker entries for a specific habit.
 * @route GET /api/v1/habits/:habitId/trackers
 * @access Private
 */
const getTrackers = controller(async (c) => {
  const userId = c.get('userId');
  const { habitId } = c.get('validated'); // From params validation
  const { startDate, endDate } = c.get('validated'); // From query validation

  const trackers = await habitService.getTrackersForHabit(
    userId,
    habitId,
    startDate,
    endDate
  );

  return c.json(trackers);
});

/**
 * @description Add or remove a tracker entry for a habit on a specific date.
 * @route POST /api/v1/habits/:habitId/trackers
 * @access Private
 */
const manageTracker = controller(async (c) => {
  const userId = c.get('userId');
  const { habitId } = c.get('validated'); // From params validation
  const { timestamp, timeZone, notes } = c.get('validated'); // From body validation

  const result = await habitService.manageTracker(
    userId,
    habitId,
    timestamp,
    timeZone,
    notes
  );

  const statusCode = result.status === 'added' ? 201 : 200;
  return c.json(
    {
      message: result.message,
      ...(result.trackerId && { trackerId: result.trackerId }),
    },
    statusCode
  );
});

/**
 * @description Get statistics for a specific habit.
 * @route GET /api/v1/habits/:habitId/stats
 * @access Private
 */
const getHabitStats = controller(async (c) => {
  const userId = c.get('userId');
  const { habitId } = c.get('validated'); // From params validation
  const { timeZone } = c.get('validated'); // From query validation

  const stats = await habitService.getHabitStats(userId, habitId, timeZone);

  return c.json(stats);
});

/**
 * @description Get progress overview for a user for a given month.
 * @route GET /api/v1/progress/overview
 * @access Private
 */
const getProgressOverview = controller(async (c) => {
  const userId = c.get('userId');
  const { month, timeZone } = c.get('validated');

  const overview = await habitService.getProgressOverview(
    userId,
    month,
    timeZone
  );

  return c.json(overview);
});

export {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  getTrackers,
  manageTracker,
  getHabitStats,
  getProgressOverview,
};

/**
 * Original Express controller:
 *
 * // Example of one controller method:
 *
 * const getHabits = async (req, res, next) => {
 *   const { userId } = req.auth;
 *   const { date, timeZone } = req.query;
 *
 *   try {
 *     const habits = await habitService.getHabitsForDate(userId, date, timeZone);
 *     res.json(habits);
 *   } catch (error) {
 *     logger.error(`Error in getHabits controller for user ${userId}:`, {
 *       error,
 *     });
 *     next(error);
 *   }
 * };
 *
 * // Key differences:
 * // 1. Express uses req/res objects, Hono uses a unified context (c)
 * // 2. In Express, errors are passed to next(), in Hono they are thrown directly
 * // 3. In Express, responses are sent with res.json(), in Hono with c.json()
 * // 4. Validated data comes from c.get('validated') instead of req.body, req.params, etc.
 */
