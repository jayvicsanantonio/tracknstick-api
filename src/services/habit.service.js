const habitRepository = require('../repositories/habit.repository');
const trackerRepository = require('../repositories/tracker.repository');
const {
  AppError,
  BadRequestError,
  NotFoundError,
  AuthorizationError, // Although not used directly yet, good to import if needed later
} = require('../utils/errors');
// TODO: Create dateUtils file later
// const { getLocaleDates } = require('../utils/dateUtils');

// Helper function (consider moving to utils/dateUtils.js)
function getLocaleStartEnd(utcDate, timeZone) {
  const localeDate = new Date(
    utcDate.toLocaleString('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
  );
  const localeStart = new Date(
    localeDate.getFullYear(),
    localeDate.getMonth(),
    localeDate.getDate(),
    0,
    0,
    0,
    0
  );
  const localeEnd = new Date(
    localeDate.getFullYear(),
    localeDate.getMonth(),
    localeDate.getDate(),
    23,
    59,
    59,
    999
  );
  return {
    localeStartISO: localeStart.toISOString(),
    localeEndISO: localeEnd.toISOString(),
  };
}

async function getHabitsForDate(userId, dateString, timeZone) {
  // Validate inputs
  const utcDate = new Date(dateString);
  if (Number.isNaN(utcDate.getTime())) {
    throw new BadRequestError('Invalid date format provided');
  }
  // Basic timezone check (more robust validation could be added)
  try {
    // Attempt to use the timezone to see if it's valid
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch (e) {
    throw new BadRequestError('Invalid timeZone format provided');
  }

  // --- Business Logic ---
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short', // Get day like 'Mon', 'Tue' etc.
  });
  const dayOfWeek = formatter.format(utcDate);
  // --- End Business Logic ---

  // --- Repository Calls ---
  // 1. Find habits scheduled for this day of the week
  const habits = await habitRepository.findHabitsByDay(userId, dayOfWeek);

  if (!habits || habits.length === 0) {
    return []; // Return empty array if no habits scheduled
  }

  // 2. Find trackers for these habits on the specific date
  const habitIds = habits.map((h) => h.id);
  const { localeStartISO, localeEndISO } = getLocaleStartEnd(utcDate, timeZone); // Use helper

  const trackers = await trackerRepository.findTrackersByDateRange(
    userId,
    habitIds,
    localeStartISO,
    localeEndISO
  );
  // --- End Repository Calls ---

  // --- Combine and Format Results ---
  const completedHabitIds = new Set(trackers.map((t) => t.habit_id));

  const results = habits.map((habit) => ({
    id: habit.id,
    name: habit.name,
    icon: habit.icon,
    frequency: habit.frequency.split(','), // Parse frequency string into array
    completed: completedHabitIds.has(habit.id),
    // Include basic stats from the habit record
    stats: {
      totalCompletions: habit.total_completions,
      streak: habit.streak,
      lastCompleted: habit.last_completed,
    },
  }));
  // --- End Combination ---

  return results;
}

async function createHabit(userId, habitData) {
  // Input validation (e.g., ensuring frequency is array) could happen here or in controller/middleware
  // For now, assume basic validation happened before service call
  try {
    const newHabitId = await habitRepository.create(userId, habitData);
    // Optionally, fetch the created habit data to return it, or just return the ID
    // const newHabit = await habitRepository.findById(newHabitId, userId); // Requires findById implementation
    // return newHabit;
    return { habitId: newHabitId }; // Return just the ID for now
  } catch (error) {
    // Log service-level error and re-throw or handle specific errors
    console.error(
      `Service error creating habit for user ${userId}: ${error.message}`
    );
    // Re-throw the original error or a new service-specific error
    throw error;
  }
}

async function updateHabit(userId, habitId, habitData) {
  // 1. Check if habit exists and belongs to the user
  const existingHabit = await habitRepository.findById(habitId, userId);
  if (!existingHabit) {
    throw new NotFoundError('Habit not found or not authorized');
  }

  // 2. Call repository to update
  // habitData should contain { name?, icon?, frequency? }
  try {
    // Correct parameter order: habitId, userId, habitData
    const result = await habitRepository.update(habitId, userId, habitData);
    // Check if any rows were actually updated
    if (result.changes === 0) {
      // This could mean the habit wasn't found (race condition?) or data was identical
      console.warn(
        `Update service call for habit ${habitId} resulted in 0 changes.`
      );
      // Throw an error as the update unexpectedly failed
      throw new AppError('Habit update failed unexpectedly', 500);
    }
    return true; // Indicate success (controller doesn't need this, but good for clarity)
  } catch (error) {
    console.error(
      `Service error updating habit ${habitId} for user ${userId}: ${error.message}`
    );
    throw error; // Re-throw
  }
}

async function deleteHabit(userId, habitId) {
  // 1. Check if habit exists and belongs to the user
  const existingHabit = await habitRepository.findById(habitId, userId);
  if (!existingHabit) {
    throw new NotFoundError('Habit not found or not authorized');
  }

  // IMPORTANT: In a real application, the following two operations
  // should be wrapped in a database transaction to ensure atomicity.
  try {
    // 2. Delete associated trackers
    await trackerRepository.removeAllByHabit(habitId, userId);
    // We don't necessarily need to check the result here

    // 3. Delete the habit itself
    const result = await habitRepository.remove(habitId, userId);

    if (result.changes === 0) {
      // This is unexpected if the findById check passed
      console.error(
        `Failed to delete habit ${habitId} in repository after successful check.`
      );
      // Throw an operational error with 500 status
      throw new AppError(
        'Inconsistent state: Habit found but failed to delete.',
        500
      );
    }

    return true; // Indicate success
  } catch (error) {
    console.error(
      `Service error deleting habit ${habitId} for user ${userId}: ${error.message}`
    );
    throw error; // Re-throw
  }
}

async function getTrackersForHabit(userId, habitId, startDate, endDate) {
  // 1. Check if habit exists and belongs to the user
  const existingHabit = await habitRepository.findById(habitId, userId);
  if (!existingHabit) {
    throw new NotFoundError('Habit not found or not authorized');
  }

  // 2. Fetch trackers using the repository
  try {
    const trackers = await trackerRepository.findTrackersByHabitAndDateRange(
      habitId,
      userId,
      startDate, // Pass optional dates directly
      endDate
    );
    return trackers;
  } catch (error) {
    console.error(
      `Service error fetching trackers for habit ${habitId}, user ${userId}: ${error.message}`
    );
    throw error; // Re-throw
  }
}

async function manageTracker(userId, habitId, timestamp, timeZone, notes) {
  // 1. Validate inputs
  const utcDate = new Date(timestamp);
  if (Number.isNaN(utcDate.getTime())) {
    throw new BadRequestError('Invalid timestamp format provided');
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch (e) {
    throw new BadRequestError('Invalid timeZone format provided');
  }

  // 2. Check if the habit exists and belongs to the user
  const habitExists = await habitRepository.findById(habitId, userId);
  if (!habitExists) {
    throw new NotFoundError('Habit not found or not authorized');
  }

  // 3. Calculate locale date boundaries
  // Re-use helper function
  const { localeStartISO, localeEndISO } = getLocaleStartEnd(utcDate, timeZone);

  try {
    // 4. Check if a tracker already exists for this habit on this locale day
    const existingTrackers = await trackerRepository.findTrackersInDateRange(
      habitId,
      userId,
      localeStartISO,
      localeEndISO
    );

    if (existingTrackers.length > 0) {
      // 5a. Remove existing tracker(s)
      const trackerIdsToRemove = existingTrackers.map((t) => t.id);
      await trackerRepository.removeTrackersByIds(
        trackerIdsToRemove,
        habitId,
        userId
      );
      // Return an object indicating removal for the controller to interpret
      return { status: 'removed' };
    } else {
      // 5b. Create new tracker
      const newTrackerId = await trackerRepository.create(
        // Ensure timestamp is passed correctly
        habitId,
        userId,
        timestamp,
        timestamp, // Pass the original timestamp string
        notes
      );
      // Return an object indicating addition for the controller to interpret
      return { status: 'added', trackerId: newTrackerId };
    }
  } catch (error) {
    console.error(
      `Service error managing tracker for habit ${habitId}, user ${userId}: ${error.message}`
    );
    throw error; // Re-throw
  }
}

// TODO: Move calculateStreak to a utility file (e.g., utils/streakUtils.js)
function calculateStreak(trackerRows, frequency, timeZone) {
  if (!trackerRows || trackerRows.length === 0) {
    return 0;
  }
  // Ensure trackers are sorted descending (repository should handle this)
  const uniqueCompletionDates = [
    ...new Set(
      trackerRows.map((row) => {
        const utcDate = new Date(row.timestamp);
        return utcDate.toLocaleDateString('en-CA', { timeZone }); // YYYY-MM-DD
      })
    ),
  ]; // Already sorted if trackerRows was sorted

  let currentStreak = 0;
  const today = new Date();
  let currentDate = new Date(today.toLocaleDateString('en-CA', { timeZone }));

  for (let i = 0; i < uniqueCompletionDates.length; i++) {
    const completionDate = new Date(uniqueCompletionDates[i]);
    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    });

    if (completionDate.getTime() !== currentDate.getTime()) {
      if (i === 0) {
        const yesterday = new Date(currentDate);
        yesterday.setDate(currentDate.getDate() - 1);
        if (completionDate.getTime() === yesterday.getTime()) {
          currentDate = yesterday;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    const dayOfWeek = dayFormatter.format(currentDate);
    if (frequency.includes(dayOfWeek)) {
      currentStreak++;
    }

    currentDate.setDate(currentDate.getDate() - 1);
  }
  return currentStreak;
}

async function getHabitStats(userId, habitId, timeZone) {
  // 1. Check if habit exists and belongs to the user
  const habit = await habitRepository.findById(habitId, userId);
  if (!habit) {
    throw new NotFoundError('Habit not found or not authorized');
  }
  // Basic timezone check
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch (e) {
    throw new BadRequestError('Invalid timeZone format provided');
  }
  const frequency = habit.frequency.split(',');

  // 2. Fetch all trackers for the habit
  try {
    const trackers = await trackerRepository.findAllByHabit(habitId, userId);

    // 3. Calculate stats
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
    throw error; // Re-throw
  }
}

// Add other service function placeholders later
// ... etc ...

module.exports = {
  getHabitsForDate,
  createHabit,
  updateHabit,
  deleteHabit,
  getTrackersForHabit,
  manageTracker,
  getHabitStats, // Export the new function
  // Export other functions here
};
