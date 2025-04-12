const habitRepository = require('../repositories/habit.repository');
const trackerRepository = require('../repositories/tracker.repository');
const {
  AppError,
  BadRequestError,
  NotFoundError,
  AuthorizationError,
} = require('../utils/errors');
const { getLocaleStartEnd } = require('../utils/dateUtils');
const { calculateStreak } = require('../utils/streakUtils');
const { withTransaction } = require('../utils/transactionUtils');

/**
 * @description Retrieves habits scheduled for a specific date, including completion status.
 * @param {number} userId - The ID of the user.
 * @param {string} dateString - The target date string (e.g., 'YYYY-MM-DD').
 * @param {string} timeZone - The IANA timezone name.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of habit objects with completion status.
 * @throws {BadRequestError} If dateString or timeZone is invalid.
 * @throws {Error} If a database error occurs.
 */
async function getHabitsForDate(userId, dateString, timeZone) {
  const utcDate = new Date(dateString);
  if (Number.isNaN(utcDate.getTime())) {
    throw new BadRequestError('Invalid date format provided');
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch (e) {
    throw new BadRequestError('Invalid timeZone format provided');
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  });
  const dayOfWeek = formatter.format(utcDate);

  const habits = await habitRepository.findHabitsByDay(userId, dayOfWeek);

  if (!habits || habits.length === 0) {
    return [];
  }

  const habitIds = habits.map((h) => h.id);
  const { localeStartISO, localeEndISO } = getLocaleStartEnd(utcDate, timeZone);

  const trackers = await trackerRepository.findTrackersByDateRange(
    userId,
    habitIds,
    localeStartISO,
    localeEndISO
  );

  const completedHabitIds = new Set(trackers.map((t) => t.habit_id));

  const results = habits.map((habit) => ({
    id: habit.id,
    name: habit.name,
    icon: habit.icon,
    frequency: habit.frequency.split(','),
    completed: completedHabitIds.has(habit.id),
    stats: {
      totalCompletions: habit.total_completions,
      streak: habit.streak,
      lastCompleted: habit.last_completed,
    },
  }));

  return results;
}

/**
 * @description Creates a new habit for a user.
 * @param {number} userId - The ID of the user.
 * @param {object} habitData - The habit data.
 * @param {string} habitData.name - The name of the habit.
 * @param {string} [habitData.icon] - The icon for the habit.
 * @param {Array<string>} habitData.frequency - The frequency of the habit.
 * @returns {Promise<{habitId: number}>} A promise that resolves to an object containing the new habit ID.
 * @throws {Error} If a database error occurs.
 */
async function createHabit(userId, habitData) {
  try {
    const newHabitId = await habitRepository.create(userId, habitData);
    return { habitId: newHabitId };
  } catch (error) {
    console.error(
      `Service error creating habit for user ${userId}: ${error.message}`
    );
    throw error;
  }
}

/**
 * @description Updates an existing habit for a user.
 * @param {number} userId - The ID of the user.
 * @param {number} habitId - The ID of the habit to update.
 * @param {object} habitData - The habit data to update.
 * @param {string} [habitData.name] - The new name.
 * @param {string} [habitData.icon] - The new icon.
 * @param {Array<string>} [habitData.frequency] - The new frequency.
 * @returns {Promise<boolean>} A promise that resolves to true if successful.
 * @throws {NotFoundError} If the habit is not found or not authorized.
 * @throws {AppError} If the update fails unexpectedly.
 * @throws {Error} If a database error occurs.
 */
async function updateHabit(userId, habitId, habitData) {
  const existingHabit = await habitRepository.findById(habitId, userId);
  if (!existingHabit) {
    throw new NotFoundError('Habit not found or not authorized');
  }

  try {
    const result = await habitRepository.update(habitId, userId, habitData);
    if (result.changes === 0) {
      console.warn(
        `Update service call for habit ${habitId} resulted in 0 changes.`
      );
      throw new AppError('Habit update failed unexpectedly', 500);
    }
    return true;
  } catch (error) {
    console.error(
      `Service error updating habit ${habitId} for user ${userId}: ${error.message}`
    );
    throw error;
  }
}

/**
 * @description Deletes a habit and its associated trackers for a user.
 * @param {number} userId - The ID of the user.
 * @param {number} habitId - The ID of the habit to delete.
 * @returns {Promise<boolean>} A promise that resolves to true if successful.
 * @throws {NotFoundError} If the habit is not found or not authorized.
 * @throws {AppError} If the deletion fails unexpectedly after finding the habit.
 * @throws {Error} If a database error occurs.
 */
async function deleteHabit(userId, habitId) {
  const existingHabit = await habitRepository.findById(habitId, userId);
  if (!existingHabit) {
    throw new NotFoundError('Habit not found or not authorized');
  }

  try {
    await withTransaction(async () => {
      await trackerRepository.removeAllByHabit(habitId, userId);
      const result = await habitRepository.remove(habitId, userId);

      if (result.changes === 0) {
        console.error(
          `Failed to delete habit ${habitId} in repository after successful check.`
        );
        throw new AppError(
          'Inconsistent state: Habit found but failed to delete.',
          500
        );
      }
    });
    return true;
  } catch (err) {
    console.error(
      `Service error deleting habit ${habitId} for user ${userId}: ${err.message}`
    );
    throw err;
  }
}

/**
 * @description Retrieves tracker entries for a specific habit, optionally filtered by date.
 * @param {number} userId - The ID of the user.
 * @param {number} habitId - The ID of the habit.
 * @param {string} [startDate] - Optional start date string (YYYY-MM-DD).
 * @param {string} [endDate] - Optional end date string (YYYY-MM-DD).
 * @returns {Promise<Array<object>>} A promise that resolves to an array of tracker objects.
 * @throws {NotFoundError} If the habit is not found or not authorized.
 * @throws {Error} If a database error occurs.
 */
async function getTrackersForHabit(userId, habitId, startDate, endDate) {
  const existingHabit = await habitRepository.findById(habitId, userId);
  if (!existingHabit) {
    throw new NotFoundError('Habit not found or not authorized');
  }

  try {
    const trackers = await trackerRepository.findTrackersByHabitAndDateRange(
      habitId,
      userId,
      startDate,
      endDate
    );
    return trackers;
  } catch (error) {
    console.error(
      `Service error fetching trackers for habit ${habitId}, user ${userId}: ${error.message}`
    );
    throw error;
  }
}

/**
 * @description Adds or removes a tracker entry for a habit based on timestamp and timezone. Acts as a toggle.
 * @param {number} userId - The ID of the user.
 * @param {number} habitId - The ID of the habit.
 * @param {string} timestamp - The ISO 8601 timestamp string for the tracker entry.
 * @param {string} timeZone - The IANA timezone name.
 * @param {string} [notes] - Optional notes for the tracker entry.
 * @returns {Promise<{status: string, trackerId?: number}>} A promise resolving to an object indicating 'added' or 'removed' status.
 * @throws {BadRequestError} If timestamp or timeZone is invalid.
 * @throws {NotFoundError} If the habit is not found or not authorized.
 * @throws {Error} If a database error occurs.
 */
async function manageTracker(userId, habitId, timestamp, timeZone, notes) {
  const utcDate = new Date(timestamp);
  if (Number.isNaN(utcDate.getTime())) {
    throw new BadRequestError('Invalid timestamp format provided');
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch (e) {
    throw new BadRequestError('Invalid timeZone format provided');
  }

  const habitExists = await habitRepository.findById(habitId, userId);
  if (!habitExists) {
    throw new NotFoundError('Habit not found or not authorized');
  }

  const { localeStartISO, localeEndISO } = getLocaleStartEnd(utcDate, timeZone);

  try {
    const existingTrackers = await trackerRepository.findTrackersInDateRange(
      habitId,
      userId,
      localeStartISO,
      localeEndISO
    );

    if (existingTrackers.length > 0) {
      const trackerIdsToRemove = existingTrackers.map((t) => t.id);
      await trackerRepository.removeTrackersByIds(
        trackerIdsToRemove,
        habitId,
        userId
      );
      return { status: 'removed' };
    } else {
      const newTrackerId = await trackerRepository.create(
        habitId,
        userId,
        timestamp,
        notes
      );
      return { status: 'added', trackerId: newTrackerId };
    }
  } catch (error) {
    console.error(
      `Service error managing tracker for habit ${habitId}, user ${userId}: ${error.message}`
    );
    throw error;
  }
}

/**
 * @description Retrieves statistics (streak, total completions, last completed) for a specific habit.
 * @param {number} userId - The ID of the user.
 * @param {number} habitId - The ID of the habit.
 * @param {string} timeZone - The IANA timezone name.
 * @returns {Promise<object>} A promise that resolves to an object containing habit statistics.
 * @throws {NotFoundError} If the habit is not found or not authorized.
 * @throws {BadRequestError} If the timeZone is invalid.
 * @throws {Error} If a database error occurs.
 */
async function getHabitStats(userId, habitId, timeZone) {
  const habit = await habitRepository.findById(habitId, userId);
  if (!habit) {
    throw new NotFoundError('Habit not found or not authorized');
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch (e) {
    throw new BadRequestError('Invalid timeZone format provided');
  }
  const frequency = habit.frequency.split(',');

  try {
    const trackers = await trackerRepository.findAllByHabit(habitId, userId);

    const totalCompletions = trackers.length;
    const lastCompleted = trackers.length > 0 ? trackers[0].timestamp : null;
    const currentStreak = calculateStreak(trackers, frequency, timeZone);

    return {
      habit_id: habitId,
      user_id: userId,
      streak: currentStreak,
      total_completions: totalCompletions,
      last_completed: lastCompleted,
    };
  } catch (error) {
    console.error(
      `Service error calculating stats for habit ${habitId}, user ${userId}: ${error.message}`
    );
    throw error;
  }
}

module.exports = {
  getHabitsForDate,
  createHabit,
  updateHabit,
  deleteHabit,
  getTrackersForHabit,
  manageTracker,
  getHabitStats,
};
