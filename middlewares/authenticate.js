const crypto = require("crypto");

function authenticate(req, res, next) {
  const apiKey = req.header("X-API-Key");
  const expectedKey = process.env.API_KEY;

  if (!apiKey || !expectedKey) {
    return res.status(401).json({ error: "Missing authentication" });
  }

  if (apiKey.length !== expectedKey.length) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(expectedKey))) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = authenticate;
