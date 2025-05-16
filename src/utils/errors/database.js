import AppError from './base.js';

/**
 * Error for database operations.
 * Status code: 500
 * Error code: DATABASE_ERROR
 */
class DatabaseError extends AppError {
  /**
   * @param {string} message Error message
   * @param {Error} originalError The original database error that occurred
   */
  constructor(message = 'Database Error', originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

export default DatabaseError;
