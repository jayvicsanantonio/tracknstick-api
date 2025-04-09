const { AppError } = require('../utils/errors');
const { validationResult } = require('express-validator'); // To check for validation errors if needed, though typically handled before this

/**
 * Formats express-validator errors into a user-friendly message.
 * @param {Array} errors - Array of validation errors from express-validator.
 * @returns {string} - A formatted error message string.
 */
const formatValidationErrors = (errors) => {
  if (!errors || !Array.isArray(errors) || errors.length === 0) {
    return 'Validation failed'; // Default message if format is unexpected
  }
  // Join messages from different validation errors
  return errors.map((err) => err.msg).join('. ');
};

/**
 * Sends an error response in development environment (includes stack trace).
 * @param {Error} err - The error object.
 * @param {Response} res - Express response object.
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    status: err.status || 'error',
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

/**
 * Sends an error response in production environment (hides internal details).
 * @param {Error} err - The error object.
 * @param {Response} res - Express response object.
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
    // Programming or other unknown error: don't leak error details
  } else {
    // 1) Log error
    console.error('ERROR 💥:', err);

    // 2) Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

/**
 * Global error handling middleware.
 * Catches errors passed via next(error).
 */
const errorHandler = (err, req, res, next) => {
  // Set default status code and status if not already set by a custom error
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log the error regardless of environment
  // In a real app, use a more sophisticated logger (like Winston)
  console.error(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Error: ${err.message}`
  );
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack); // Log stack trace in dev
  }

  // Handle specific error types before sending response
  let errorToSend = err;

  // Note: express-validator errors are typically handled by the `validate` middleware
  // before reaching here. If they somehow bypass that, this could be a fallback.
  // However, the primary check should be for our custom AppError types.

  if (process.env.NODE_ENV === 'production') {
    // In production, we might want to transform certain non-operational errors
    // into operational ones for the client, or handle specific known errors.
    // Example: Handle a specific database error code if needed.
    // if (err.code === 'SOME_DB_ERROR_CODE') errorToSend = handleDbError(err);

    sendErrorProd(errorToSend, res);
  } else {
    // In development, send detailed error information
    sendErrorDev(errorToSend, res);
  }
};

module.exports = errorHandler;
