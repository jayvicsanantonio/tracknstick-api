const { body, query, param } = require('express-validator');

const validDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Custom validator for IANA timezone
const isValidTimeZone = (value) => {
  if (!value) return false; // Must be provided
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch (ex) {
    return false;
  }
};

// Validation rules for creating a habit
const createHabit = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Habit name is required.')
    .isString()
    .withMessage('Habit name must be a string.'),
  body('icon')
    .optional()
    .trim()
    .isString()
    .withMessage('Icon must be a string.'),
  body('frequency')
    .isArray({ min: 1 })
    .withMessage('Frequency is required and must be a non-empty array.')
    .custom((days) => {
      if (!days.every((day) => validDays.includes(day))) {
        throw new Error(
          `Frequency array must only contain valid days: ${validDays.join(', ')}`
        );
      }
      // Check for duplicates
      if (new Set(days).size !== days.length) {
        throw new Error('Frequency array cannot contain duplicate days.');
      }
      return true;
    }),
];

// Validation rules for getting habits by date
const getHabitsByDate = [
  query('date')
    .notEmpty()
    .withMessage('Date query parameter is required.')
    .isISO8601()
    .withMessage('Date must be in YYYY-MM-DD format.')
    .toDate(), // Convert to date object for potential further validation
  query('timeZone')
    .notEmpty()
    .withMessage('TimeZone query parameter is required.')
    .custom(isValidTimeZone)
    .withMessage('Invalid IANA TimeZone format provided.'),
];

// Validation rules for updating a habit
const updateHabit = [
  param('habitId')
    .isInt({ gt: 0 })
    .withMessage('Habit ID must be a positive integer.'),
  // Ensure at least one field is present in the body
  body().custom((value, { req }) => {
    if (Object.keys(req.body).length === 0) {
      throw new Error(
        'Request body must contain at least one field to update (name, icon, frequency).'
      );
    }
    if (
      req.body.name === undefined &&
      req.body.icon === undefined &&
      req.body.frequency === undefined
    ) {
      throw new Error(
        'Request body must contain at least one valid field to update (name, icon, frequency).'
      );
    }
    return true;
  }),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Habit name cannot be empty if provided.')
    .isString(),
  body('icon').optional().trim().isString(),
  body('frequency')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Frequency must be a non-empty array if provided.')
    .custom((days) => {
      if (!days.every((day) => validDays.includes(day))) {
        throw new Error(
          `Frequency array must only contain valid days: ${validDays.join(', ')}`
        );
      }
      if (new Set(days).size !== days.length) {
        throw new Error('Frequency array cannot contain duplicate days.');
      }
      return true;
    }),
];

// Validation rules for deleting a habit
const deleteHabit = [
  param('habitId')
    .isInt({ gt: 0 })
    .withMessage('Habit ID must be a positive integer.'),
];

// Validation rules for getting habit stats
const getHabitStats = [
  param('habitId')
    .isInt({ gt: 0 })
    .withMessage('Habit ID must be a positive integer.'),
  query('timeZone')
    .notEmpty()
    .withMessage('TimeZone query parameter is required.')
    .custom(isValidTimeZone)
    .withMessage('Invalid IANA TimeZone format provided.'),
];

// Validation rules for managing (adding/removing) a tracker
const manageTracker = [
  param('habitId')
    .isInt({ gt: 0 })
    .withMessage('Habit ID must be a positive integer.'),
  body('timestamp')
    .notEmpty()
    .withMessage('Timestamp is required.')
    .isISO8601()
    .withMessage('Timestamp must be a valid ISO 8601 date string.')
    .toDate(),
  body('timeZone')
    .notEmpty()
    .withMessage('TimeZone is required.')
    .custom(isValidTimeZone)
    .withMessage('Invalid IANA TimeZone format provided.'),
  body('notes').optional({ nullable: true }).trim().isString(),
];

// Validation rules for getting trackers
const getTrackers = [
  param('habitId')
    .isInt({ gt: 0 })
    .withMessage('Habit ID must be a positive integer.'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be in YYYY-MM-DD format.')
    .toDate(),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be in YYYY-MM-DD format.')
    .toDate()
    .custom((value, { req }) => {
      if (req.query.startDate && value < req.query.startDate) {
        throw new Error('endDate cannot be earlier than startDate.');
      }
      return true;
    }),
];

module.exports = {
  createHabit,
  getHabitsByDate,
  updateHabit,
  deleteHabit,
  getHabitStats,
  manageTracker,
  getTrackers,
};
