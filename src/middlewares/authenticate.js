const { dbGet } = require('../utils/dbUtils'); // Import dbGet wrapper
const {
  AuthenticationError,
  AuthorizationError,
  AppError, // Import AppError for generic server errors if needed
} = require('../utils/errors');

async function authenticate(req, res, next) {
  // Make the function async
  const apiKey = req.header('X-API-Key');

  if (!apiKey) {
    // Pass AuthenticationError to the error handler
    return next(new AuthenticationError('Missing API Key (X-API-Key header)'));
  }

  try {
    // Use await with the dbGet wrapper
    const query = 'SELECT id FROM users WHERE api_key = ?';
    const row = await dbGet(query, [apiKey]);

    if (!row) {
      // Use 403 Forbidden for invalid key, pass AuthorizationError
      return next(new AuthorizationError('Invalid API Key'));
    }

    req.userId = row.id; // Attach user ID to request object
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    console.error('Authentication DB Error:', err);
    // Pass the original database error to the centralized error handler
    // The handler will log it and return a generic 500 response in production
    next(err);
  }
}

module.exports = authenticate;
