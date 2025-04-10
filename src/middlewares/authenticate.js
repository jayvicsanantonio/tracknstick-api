const { dbGet } = require('../utils/dbUtils');
const {
  AuthenticationError,
  AuthorizationError,
  AppError,
} = require('../utils/errors');

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
    const query = 'SELECT id FROM users WHERE api_key = ?';
    const row = await dbGet(query, [apiKey]);

    if (!row) {
      return next(new AuthorizationError('Invalid API Key'));
    }

    req.userId = row.id;
    next();
  } catch (err) {
    console.error('Authentication DB Error:', err);
    next(err);
  }
}

module.exports = authenticate;
