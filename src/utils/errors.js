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

module.exports = {
  AppError,
  BadRequestError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
};
