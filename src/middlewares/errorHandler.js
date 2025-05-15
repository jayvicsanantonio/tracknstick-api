import logger from '../utils/logger.js';

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
const errorHandler = (err, req, res, _next) => {
  const error = {
    ...err,
    statusCode: err.statusCode || 500,
    status: err.status || 'error',
  };

  logger.error(`[${req.method}] ${req.originalUrl} - Error: ${error.message}`, {
    error,
    stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
  });

  if (error.errorCode === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
    return res.status(400).json({
      status: 'fail',
      message: error.message || 'Input validation failed',
      errorCode: 'VALIDATION_ERROR',
      errors: error.details,
    });
  }

  if (process.env.NODE_ENV === 'production') {
    sendErrorProd(error, res);
  } else {
    sendErrorDev(error, res);
  }
};

export default errorHandler;
