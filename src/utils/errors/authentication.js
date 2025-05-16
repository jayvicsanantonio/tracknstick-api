import AppError from './base.js';

/**
 * Error for failed authentication.
 * Status code: 401
 * Error code: AUTHENTICATION_FAILED
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication Failed') {
    super(message, 401, 'AUTHENTICATION_FAILED');
  }
}

export default AuthenticationError;
