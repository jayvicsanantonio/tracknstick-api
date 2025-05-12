const habitService = require('../services/habit.service');
const logger = require('../utils/logger');

/**
 * @description Get habits scheduled for a specific date.
 * @route GET /api/v1/habits
 * @access Private
 */
const getHabits = async (req, res, next) => {
  const { userId } = req.auth;
  const { date, timeZone } = req.query;

  try {
    const habits = await habitService.getHabitsForDate(userId, date, timeZone);
    res.json(habits);
  } catch (error) {
    logger.error(`Error in getHabits controller for user ${userId}:`, {
      error,
    });
    next(error);
  }
};

/**
 * @description Create a new habit.
 * @route POST /api/v1/habits
 * @access Private
 */
const createHabit = async (req, res, next) => {
  const { userId } = req.auth;
  const { name, icon, frequency } = req.body;

  try {
    const result = await habitService.createHabit(userId, {
      name,
      icon,
      frequency,
    });
    res.status(201).json({
      message: 'Habit created successfully',
      habitId: result.habitId,
    });
  } catch (error) {
    logger.error(`Error in createHabit controller for user ${userId}:`, {
      error,
    });
    next(error);
  }
};

/**
 * @description Update an existing habit.
 * @route PUT /api/v1/habits/:habitId
 * @access Private
 */
const updateHabit = async (req, res, next) => {
  const { userId } = req.auth;
  const { habitId } = req.params;
  const { name, icon, frequency } = req.body;

  try {
    const habitData = {};
    if (name !== undefined) habitData.name = name;
    if (icon !== undefined) habitData.icon = icon;
    if (frequency !== undefined) habitData.frequency = frequency;

    await habitService.updateHabit(userId, habitId, habitData);

    res.status(200).json({ message: 'Habit updated successfully' });
  } catch (error) {
    logger.error(
      `Error in updateHabit controller for user ${userId}, habit ${habitId}:`,
      { error }
    );
    next(error);
  }
};

/**
 * @description Delete a specific habit.
 * @route DELETE /api/v1/habits/:habitId
 * @access Private
 */
const deleteHabit = async (req, res, next) => {
  const { userId } = req.auth;
  const { habitId } = req.params;

  try {
    await habitService.deleteHabit(userId, habitId);

    res.status(200).json({ message: 'Habit deleted successfully' });
  } catch (error) {
    logger.error(
      `Error in deleteHabit controller for user ${userId}, habit ${habitId}:`,
      { error }
    );
    next(error);
  }
};

/**
 * @description Get tracker entries for a specific habit.
 * @route GET /api/v1/habits/:habitId/trackers
 * @access Private
 */
const getTrackers = async (req, res, next) => {
  const { userId } = req.auth;
  const { habitId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    const trackers = await habitService.getTrackersForHabit(
      userId,
      habitId,
      startDate,
      endDate
    );

    res.json(trackers);
  } catch (error) {
    logger.error(
      `Error in getTrackers controller for user ${userId}, habit ${habitId}:`,
      { error }
    );
    next(error);
  }
};

/**
 * @description Add or remove a tracker entry for a habit on a specific date.
 * @route POST /api/v1/habits/:habitId/trackers
 * @access Private
 */
const manageTracker = async (req, res, next) => {
  const { userId } = req.auth;
  const { habitId } = req.params;
  const { timestamp, timeZone, notes } = req.body;

  try {
    const result = await habitService.manageTracker(
      userId,
      habitId,
      timestamp,
      timeZone,
      notes
    );

    const statusCode = result.status === 'added' ? 201 : 200;
    res.status(statusCode).json({
      message: result.message,
      ...(result.trackerId && { trackerId: result.trackerId }),
    });
  } catch (error) {
    logger.error(
      `Error in manageTracker controller for user ${userId}, habit ${habitId}:`,
      { error }
    );
    next(error);
  }
};

/**
 * @description Get statistics for a specific habit.
 * @route GET /api/v1/habits/:habitId/stats
 * @access Private
 */
const getHabitStats = async (req, res, next) => {
  const { userId } = req.auth;
  const { habitId } = req.params;
  const { timeZone } = req.query;

  try {
    const stats = await habitService.getHabitStats(userId, habitId, timeZone);

    res.json(stats);
  } catch (error) {
    logger.error(
      `Error in getHabitStats controller for user ${userId}, habit ${habitId}:`,
      { error }
    );
    next(error);
  }
};

/**
 * @description Get progress overview for a user for a given month.
 * @route GET /api/v1/progress/overview
 * @access Private
 */
const getProgressOverview = async (req, res, next) => {
  const { userId } = req.auth;
  const { month, timeZone } = req.query;
  try {
    const overview = await habitService.getProgressOverview(
      userId,
      month,
      timeZone
    );
    res.json(overview);
  } catch (error) {
    logger.error(
      `Error in getProgressOverview controller for user ${userId}:`,
      { error }
    );
    next(error);
  }
};

module.exports = {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  getTrackers,
  manageTracker,
  getHabitStats,
  getProgressOverview,
};
