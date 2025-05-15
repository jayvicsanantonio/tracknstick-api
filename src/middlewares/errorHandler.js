import logger from '../utils/logger.js';

/**
 * Sends an error response in development environment (includes stack trace).
 * @param {Error} err - The error object.
 * @param {import('hono').Context} c - Hono context object.
 * @returns {Response} The HTTP response.
 */
const sendErrorDev = (err, c) => {
  return c.json(
    {
      status: err.status || 'error',
      errorCode: err.errorCode || 'UNKNOWN_ERROR',
      message: err.message,
      stack: err.stack,
    },
    err.statusCode || 500
  );
};

/**
 * Sends an error response in production environment (hides internal details).
 * @param {Error} err - The error object.
 * @param {import('hono').Context} c - Hono context object.
 * @returns {Response} The HTTP response.
 */
const sendErrorProd = (err, c) => {
  // For 500 errors in production, always send a generic message
  if (err.statusCode === 500) {
    logger.error('ERROR 💥:', { error: err, stack: err.stack }); // Log the detailed error server-side
    return c.json(
      {
        status: 'error',
        message: 'Something went very wrong!',
        errorCode: 'INTERNAL_SERVER_ERROR', // Use a generic code for all 500s in prod
      },
      500
    );
  }
  // For operational errors (like 4xx), send specific details
  else if (err.isOperational) {
    return c.json(
      {
        status: err.status,
        message: err.message,
        errorCode: err.errorCode || 'UNKNOWN_ERROR',
      },
      err.statusCode
    );
  }
  // For unexpected non-operational, non-500 errors (should be rare)
  else {
    logger.error('UNEXPECTED ERROR 💥:', { error: err, stack: err.stack });
    return c.json(
      {
        status: 'error',
        message: 'Something went very wrong!',
        errorCode: 'INTERNAL_SERVER_ERROR',
      },
      err.statusCode || 500
    );
  }
};

/**
 * Global error handler for Hono.
 * @param {Error} err - The error object.
 * @param {import('hono').Context} c - Hono context object.
 * @returns {Response} The HTTP response.
 */
const errorHandler = (err, c) => {
  const error = {
    ...err,
    statusCode: err.statusCode || 500,
    status: err.status || 'error',
  };

  logger.error(`[${c.req.method}] ${c.req.path} - Error: ${error.message}`, {
    error,
    stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
  });

  if (error.errorCode === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
    return c.json(
      {
        status: 'fail',
        message: error.message || 'Input validation failed',
        errorCode: 'VALIDATION_ERROR',
        errors: error.details,
      },
      400
    );
  }

  if (process.env.NODE_ENV === 'production') {
    return sendErrorProd(error, c);
  } else {
    return sendErrorDev(error, c);
  }
};

export default errorHandler;
