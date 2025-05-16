import AppError from './base.js';

/**
 * Error for forbidden access to a resource.
 * Status code: 403
 * Error code: ACCESS_FORBIDDEN
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access Forbidden') {
    super(message, 403, 'ACCESS_FORBIDDEN');
  }
}

export default AuthorizationError;
