// Note: The db require path will need adjustment when db access is moved to repository layer
const db = require('../../db'); // Adjusted path from src/middlewares/ to root

function authenticate(req, res, next) {
  const apiKey = req.header('X-API-Key');

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing authentication' });
  }

  const selectStmt = db.prepare('SELECT id FROM users WHERE api_key = ?');

  selectStmt.get(apiKey, (err, row) => {
    if (err) {
      console.error(err);
      // Consider passing error to next() for centralized handling
      return res.status(500).json({ error: 'Failed to authenticate API Key' });
    }

    if (!row) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }

    req.userId = row.id; // Attach user ID to request object

    next(); // Proceed to the next middleware or route handler
    // finalize should ideally happen after next() completes if possible,
    // but with callbacks it's tricky. Promise-based DB calls fix this.
    selectStmt.finalize();
  });
}

module.exports = authenticate;
