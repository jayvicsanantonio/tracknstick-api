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

module.exports = AppError;
