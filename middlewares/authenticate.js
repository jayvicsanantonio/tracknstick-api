const db = require("../db");

function authenticate(req, res, next) {
  const apiKey = req.header("X-API-Key");

  if (!apiKey) {
    return res.status(401).json({ error: "Missing authentication" });
  }

  const selectStmt = db.prepare("SELECT id FROM users WHERE api_key = ?");

  selectStmt.get(apiKey, (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to authenticate API Key" });
    }

    if (!row) {
      return res.status(401).json({ error: "Invalid API Key" });
    }

    req.userId = row.id;

    next();
  });
  selectStmt.finalize();
}

module.exports = authenticate;
