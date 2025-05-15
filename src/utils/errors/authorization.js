import AppError from './base.js';

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

export default AuthorizationError;
