const { AppError } = require('../utils/errors');
const { validationResult } = require('express-validator');

/**
 * Formats express-validator errors into a user-friendly message.
 * @param {Array} errors - Array of validation errors from express-validator.
 * @returns {string} - A formatted error message string.
 */
const formatValidationErrors = (errors) => {
  if (!errors || !Array.isArray(errors) || errors.length === 0) {
    return 'Validation failed';
  }
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
    errorCode: err.errorCode || 'UNKNOWN_ERROR',
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
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errorCode: err.errorCode || 'UNKNOWN_ERROR',
    });
  } else {
    console.error('ERROR 💥:', err);

    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
};

/**
 * Global error handling middleware.
 * Catches errors passed via next(error).
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  console.error(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Error: ${err.message}`
  );
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  if (err.errorCode === 'VALIDATION_ERROR' && Array.isArray(err.details)) {
    return res.status(400).json({
      status: 'fail',
      message: err.message || 'Input validation failed',
      errorCode: 'VALIDATION_ERROR',
      errors: err.details,
    });
  }

  let errorToSend = err;

  if (process.env.NODE_ENV === 'production') {
    sendErrorProd(errorToSend, res);
  } else {
    sendErrorDev(errorToSend, res);
  }
};

module.exports = errorHandler;
