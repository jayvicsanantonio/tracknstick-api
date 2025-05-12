const AppError = require('./base');

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

module.exports = BadRequestError;
