import AppError from './base.js';

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

export default NotFoundError;
