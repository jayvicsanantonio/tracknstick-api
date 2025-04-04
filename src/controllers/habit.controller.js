const habitService = require('../services/habit.service'); // Import the service

const getHabits = async (req, res, next) => {
  const { userId } = req;
  const { date, timeZone } = req.query;
  // Validation is now handled by middleware

  try {
    // Call the service layer function
    // Note: express-validator might sanitize/transform data (e.g., toDate()),
    // ensure service layer expects potentially transformed data if applicable.
    const habits = await habitService.getHabitsForDate(userId, date, timeZone);
    res.json(habits);
  } catch (error) {
    // Log the specific controller error and pass to central handler
    console.error(`Error in getHabits controller for user ${userId}:`, error);
    next(error); // Pass error to centralized handler
  }
};

const createHabit = async (req, res, next) => {
  const { userId } = req;
  const { name, icon, frequency } = req.body;
  // Validation is now handled by middleware

  try {
    // Pass validated data (potentially sanitized by validator) to the service layer
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
    console.error(`Error in createHabit controller for user ${userId}:`, error);
    next(error); // Pass error to centralized handler
  }
};

const updateHabit = async (req, res, next) => {
  const { userId } = req;
  const { habitId } = req.params;
  const { name, icon, frequency } = req.body;
  // Validation is now handled by middleware

  try {
    // Prepare data for service layer (only pass fields that are present)
    // Validator ensures at least one valid field exists
    const habitData = {};
    if (name !== undefined) habitData.name = name;
    if (icon !== undefined) habitData.icon = icon;
    if (frequency !== undefined) habitData.frequency = frequency;

    const success = await habitService.updateHabit(userId, habitId, habitData);

    if (success === null) {
      // Service indicated habit not found or not authorized
      return res
        .status(404)
        .json({ error: 'Habit not found or not authorized' });
    }
    if (success === false) {
      // Service indicated update resulted in 0 changes (e.g., data was identical)
      // We can still return success, or potentially a 304 Not Modified if desired
      console.warn(
        `Update for habit ${habitId} resulted in 0 changes (data might be identical).`
      );
    }

    res.status(200).json({ message: 'Habit updated successfully' });
  } catch (error) {
    console.error(
      `Error in updateHabit controller for user ${userId}, habit ${habitId}:`,
      error
    );
    next(error); // Pass error to centralized handler
  }
};

const deleteHabit = async (req, res, next) => {
  const { userId } = req;
  const { habitId } = req.params;
  // Param validation is handled by middleware

  try {
    const success = await habitService.deleteHabit(userId, habitId);

    if (success === null) {
      // Service indicates habit not found or not authorized
      return res
        .status(404)
        .json({ error: 'Habit not found or not authorized' });
    }
    // If success is true, deletion was successful

    res.status(200).json({ message: 'Habit deleted successfully' });
  } catch (error) {
    // Catch errors thrown by the service (e.g., inconsistent state)
    console.error(
      `Error in deleteHabit controller for user ${userId}, habit ${habitId}:`,
      error
    );
    next(error); // Pass error to centralized handler
  }
};

const getTrackers = async (req, res, next) => {
  const { userId } = req;
  const { habitId } = req.params;
  const { startDate, endDate } = req.query;
  // Param and Query validation is handled by middleware

  try {
    // Call the service layer function
    // startDate/endDate might be Date objects due to .toDate() in validator
    const trackers = await habitService.getTrackersForHabit(
      userId,
      habitId,
      startDate,
      endDate
    );

    if (trackers === null) {
      // Service indicates habit not found or not authorized
      return res
        .status(404)
        .json({ error: 'Habit not found or not authorized' });
    }

    res.json(trackers);
  } catch (error) {
    console.error(
      `Error in getTrackers controller for user ${userId}, habit ${habitId}:`,
      error
    );
    next(error); // Pass error to centralized handler
  }
};

const manageTracker = async (req, res, next) => {
  const { userId } = req;
  const { habitId } = req.params;
  const { timestamp, timeZone, notes } = req.body; // notes is optional
  // Param and Body validation is handled by middleware

  try {
    // Call the service layer function
    // timestamp might be a Date object due to .toDate() in validator
    const result = await habitService.manageTracker(
      userId,
      habitId,
      timestamp,
      timeZone,
      notes
    );

    if (result.status === 'not_found') {
      return res.status(404).json({ error: result.message });
    }

    // Determine status code based on action (added or removed)
    const statusCode = result.status === 'added' ? 201 : 200;
    res.status(statusCode).json({
      message: result.message,
      // Include trackerId only if added
      ...(result.trackerId && { trackerId: result.trackerId }),
    });
  } catch (error) {
    console.error(
      `Error in manageTracker controller for user ${userId}, habit ${habitId}:`,
      error
    );
    next(error); // Pass error to centralized handler
  }
};

// calculateStreak function is removed as it's now in the service layer

const getHabitStats = async (req, res, next) => {
  const { userId } = req;
  const { habitId } = req.params;
  const { timeZone } = req.query;
  // Param and Query validation is handled by middleware

  try {
    // Call the service layer function
    const stats = await habitService.getHabitStats(userId, habitId, timeZone);

    if (stats === null) {
      // Service indicates habit not found or not authorized
      return res
        .status(404)
        .json({ error: 'Habit not found or not authorized' });
    }

    res.json(stats);
  } catch (error) {
    console.error(
      `Error in getHabitStats controller for user ${userId}, habit ${habitId}:`,
      error
    );
    next(error); // Pass error to centralized handler
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
};
