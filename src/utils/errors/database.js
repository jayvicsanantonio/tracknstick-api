const AppError = require('./base');

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
  }
}

module.exports = DatabaseError;
