const userRepository = require('../repositories/user.repository');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

/**
 * @description Middleware to authenticate requests using X-API-Key header.
 * Attaches userId to the request object if successful.
 * Passes AuthenticationError or AuthorizationError to error handler on failure.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 */
async function authenticate(req, res, next) {
  const apiKey = req.header('X-API-Key');

  if (!apiKey) {
    return next(new AuthenticationError('Missing API Key (X-API-Key header)'));
  }

  try {
    const user = await userRepository.findByApiKey(apiKey);

    if (!user) {
      return next(new AuthorizationError('Invalid API Key'));
    }

    req.userId = user.id;
    next();
  } catch (err) {
    console.error('Authentication failed due to database error:', err.message);
    next(err);
  }
}

module.exports = authenticate;
