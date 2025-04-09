/**
 * Base class for custom application errors.
 * Allows associating an HTTP status code with an error.
 */
class AppError extends Error {
  /**
   * Creates an instance of AppError.
   * @param {string} message - The error message.
   * @param {number} statusCode - The HTTP status code associated with the error.
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Mark as operational error (vs. programming error)

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for bad requests (e.g., invalid input).
 * Status code: 400
 */
class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

/**
 * Error for missing or invalid authentication credentials.
 * Status code: 401
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication Required') {
    super(message, 401);
  }
}

/**
 * Error for insufficient permissions to access a resource.
 * Status code: 403
 */
class AuthorizationError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

/**
 * Error for when a requested resource is not found.
 * Status code: 404
 */
class NotFoundError extends AppError {
  constructor(message = 'Not Found') {
    super(message, 404);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
};
