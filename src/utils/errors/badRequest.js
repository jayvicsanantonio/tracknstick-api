import AppError from './base.js';

/**
 * Error for invalid or malformed client requests.
 * Status code: 400
 * Error code: BAD_REQUEST
 */
class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

export default BadRequestError;
