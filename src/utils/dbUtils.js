const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const path = require('path'); // Import path module

// Construct absolute path to the database file in the project root
const dbPath = path.resolve(__dirname, '../../tracknstick.db');
console.log(`Attempting to connect to database at: ${dbPath}`); // Log the absolute path being used

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`Error opening database at ${dbPath}:`, err.message);
    // Exit process if DB connection fails on startup
    process.exit(1);
  } else {
    console.log('Database connected successfully.');
    // Enable foreign key constraints after connection is established
    db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
      if (pragmaErr) {
        console.error('Error enabling foreign keys', pragmaErr.message);
      } else {
        console.log('Foreign key constraints enabled.');
        // Initialize schema after enabling FKs (Removed temporary logging)
        initializeSchema();
      }
    });
  }
});

// Function to initialize schema
function initializeSchema() {
  console.log('Initializing database schema...');
  db.serialize(() => {
    // Create the users table
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clerk_user_id TEXT NOT NULL UNIQUE, -- Ensure clerk IDs are unique
        api_key TEXT NOT NULL UNIQUE       -- Ensure API keys are unique
      )`,
      (err) => {
        if (err) console.error('Error creating users table:', err.message);
        else console.log('Users table checked/created.');
      }
    );

    // Create the habits table
    db.run(
      `CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        icon TEXT,
        frequency TEXT NOT NULL, -- e.g., "Mon,Wed,Fri"
        streak INTEGER DEFAULT 0,
        total_completions INTEGER DEFAULT 0,
        last_completed DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE -- Cascade deletes
      )`,
      (err) => {
        if (err) console.error('Error creating habits table:', err.message);
        else console.log('Habits table checked/created.');
      }
    );

    // Create an index on the frequency column (might not be very effective with LIKE)
    db.run(
      `CREATE INDEX IF NOT EXISTS idx_habits_user_frequency ON habits(user_id, frequency)`,
      (err) => {
        if (err) console.error('Error creating habits index:', err.message);
        else console.log('Habits index checked/created.');
      }
    );

    // Create the trackers table
    db.run(
      `CREATE TABLE IF NOT EXISTS trackers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        timestamp DATETIME NOT NULL,
        notes TEXT,
        FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE, -- Cascade deletes
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE  -- Cascade deletes
      )`,
      (err) => {
        if (err) console.error('Error creating trackers table:', err.message);
        else console.log('Trackers table checked/created.');
      }
    );

    // Add index for tracker lookups
    db.run(
      `CREATE INDEX IF NOT EXISTS idx_trackers_habit_user_ts ON trackers(habit_id, user_id, timestamp)`,
      (err) => {
        if (err) console.error('Error creating trackers index:', err.message);
        else console.log('Trackers index checked/created.');
      }
    );
  });
  console.log('Database schema initialization complete.');
}

// Promisified DB methods
const dbAll = promisify(db.all).bind(db);
const dbGet = promisify(db.get).bind(db);
// Custom promise wrapper for db.run to handle 'this' context
const dbRun = (sql, params = []) => {
  // Default params to empty array
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.error('DB Run Error:', sql, params, err); // Log query details on error
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

// Export the raw db connection only if needed for transactions, otherwise export wrappers
module.exports = {
  db, // Export raw DB for potential transaction management
  dbAll,
  dbGet,
  dbRun,
};
