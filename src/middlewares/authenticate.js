// TODO: Move DB access to a userRepository later
const { dbGet, db } = require('../utils/dbUtils'); // Import dbGet wrapper and raw db

function authenticate(req, res, next) {
  const apiKey = req.header('X-API-Key');

  if (!apiKey) {
    return res
      .status(401)
      .json({ error: 'Missing API Key (X-API-Key header)' });
  }

  // Use async/await with the dbGet wrapper
  const query = 'SELECT id FROM users WHERE api_key = ?';
  dbGet(query, [apiKey])
    .then((row) => {
      if (!row) {
        // Use 403 Forbidden for invalid key, 401 is more for missing auth
        return res.status(403).json({ error: 'Invalid API Key' });
      }

      req.userId = row.id; // Attach user ID to request object
      next(); // Proceed to the next middleware or route handler
    })
    .catch((err) => {
      console.error('Authentication DB Error:', err);
      // Pass error to centralized error handler
      next(new Error('Failed to authenticate API Key due to server error'));
    });

  // Note: We no longer need db.prepare or finalize here when using the wrappers
}

module.exports = authenticate;
