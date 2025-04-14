/**
 * Base class for custom application errors.
 * Allows associating an HTTP status code with an error.
 */
class AppError extends Error {
  /**
   * Creates an instance of AppError.
   * @param {string} message - The error message.
   * @param {number} statusCode - The HTTP status code associated with the error.
   * @param {string} [errorCode='UNKNOWN_ERROR'] - A unique code for the error type.
   */
  constructor(message, statusCode, errorCode = 'UNKNOWN_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for bad requests (e.g., invalid input).
 * Status code: 400
 * Error code: INVALID_INPUT
 */
class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400, 'INVALID_INPUT');
  }
}

/**
 * Error for missing or invalid authentication credentials.
 * Status code: 401
 * Error code: AUTHENTICATION_FAILED
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication Required') {
    super(message, 401, 'AUTHENTICATION_FAILED');
  }
}

/**
 * Error for insufficient permissions to access a resource.
 * Status code: 403
 * Error code: AUTHORIZATION_FAILED
 */
class AuthorizationError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'AUTHORIZATION_FAILED');
  }
}

/**
 * Error for when a requested resource is not found.
 * Status code: 404
 * Error code: RESOURCE_NOT_FOUND
 */
class NotFoundError extends AppError {
  constructor(message = 'Not Found') {
    super(message, 404, 'RESOURCE_NOT_FOUND');
  }
}

/**
 * Error for internal database issues.
 * Status code: 500
 * Error code: DATABASE_ERROR
 */
class DatabaseError extends AppError {
  /**
   * Creates an instance of DatabaseError.
   * @param {string} [message='Database operation failed'] - The error message.
   * @param {Error} [originalError=null] - The original error caught from the database driver.
   */
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError; // Store original error for logging
    // Database errors are typically not 'operational' from the client's perspective
    // but represent server-side issues. The base class defaults to true,
    // but we might override if needed, though the 500 status usually implies 'error' status.
    // this.isOperational = false; // Optional: Mark as non-operational if desired
  }
}

module.exports = {
  AppError,
  BadRequestError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError, // Add the new error class here
};
