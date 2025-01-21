const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./tracknstick.db");

// Create the users table
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clerk_user_id TEXT NOT NULL,
  api_key TEXT NOT NULL
)`);

// Create the habits table
db.run(`
  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    frequency TEXT NOT NULL,
    streak INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    last_completed DATETIME,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )
`);

// Create the trackers table
db.run(`
  CREATE TABLE IF NOT EXISTS trackers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    timestamp DATETIME NOT NULL,
    notes TEXT,
    FOREIGN KEY (habit_id) REFERENCES habits (id)
  );
`);

module.exports = db;
