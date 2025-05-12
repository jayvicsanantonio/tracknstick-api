const AppError = require('./base');

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

module.exports = AuthenticationError;
