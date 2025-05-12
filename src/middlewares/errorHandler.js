const { validationResult } = require('express-validator');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const { NotFoundError } = require('../utils/errors');

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
  // For 500 errors in production, always send a generic message
  if (err.statusCode === 500) {
    logger.error('ERROR 💥:', { error: err, stack: err.stack }); // Log the detailed error server-side
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
      errorCode: 'INTERNAL_SERVER_ERROR', // Use a generic code for all 500s in prod
    });
  }
  // For operational errors (like 4xx), send specific details
  else if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errorCode: err.errorCode || 'UNKNOWN_ERROR',
    });
  }
  // For unexpected non-operational, non-500 errors (should be rare)
  else {
    logger.error('UNEXPECTED ERROR 💥:', { error: err, stack: err.stack });
    res.status(err.statusCode || 500).json({
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

  logger.error(`[${req.method}] ${req.originalUrl} - Error: ${err.message}`, {
    error: err,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  if (err.errorCode === 'VALIDATION_ERROR' && Array.isArray(err.details)) {
    return res.status(400).json({
      status: 'fail',
      message: err.message || 'Input validation failed',
      errorCode: 'VALIDATION_ERROR',
      errors: err.details,
    });
  }

  const errorToSend = err;

  if (process.env.NODE_ENV === 'production') {
    sendErrorProd(errorToSend, res);
  } else {
    sendErrorDev(errorToSend, res);
  }
};

module.exports = errorHandler;
