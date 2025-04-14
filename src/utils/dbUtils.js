const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const path = require('path');

console.log(`process.env.DATABASE_PATH: ${process.env.DATABASE_PATH}`);
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, '../../tracknstick.db');

console.log(`Attempting to connect to database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`Error opening database at ${dbPath}:`, err.message);
    process.exit(1);
  } else {
    console.log('Database connected successfully.');
    db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
      if (pragmaErr) {
        console.error('Error enabling foreign keys', pragmaErr.message);
      } else {
        console.log('Foreign key constraints enabled.');
        initializeSchema();
      }
    });
  }
});

/**
 * @description Initializes the database schema by creating tables and indexes if they don't exist.
 */
function initializeSchema() {
  console.log('Initializing database schema...');
  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clerk_user_id TEXT NOT NULL UNIQUE,
        api_key TEXT NOT NULL UNIQUE
      )`,
      (err) => {
        if (err) console.error('Error creating users table:', err.message);
        else console.log('Users table checked/created.');
      }
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        icon TEXT,
        frequency TEXT NOT NULL,
        streak INTEGER DEFAULT 0,
        total_completions INTEGER DEFAULT 0,
        last_completed DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,
      (err) => {
        if (err) console.error('Error creating habits table:', err.message);
        else console.log('Habits table checked/created.');
      }
    );

    db.run(
      `CREATE INDEX IF NOT EXISTS idx_habits_user_frequency ON habits(user_id, frequency)`,
      (err) => {
        if (err) console.error('Error creating habits index:', err.message);
        else console.log('Habits index checked/created.');
      }
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS trackers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        timestamp DATETIME NOT NULL,
        notes TEXT,
        FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,
      (err) => {
        if (err) console.error('Error creating trackers table:', err.message);
        else console.log('Trackers table checked/created.');
      }
    );

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

const dbAll = promisify(db.all).bind(db);
const dbGet = promisify(db.get).bind(db);

/**
 * @description Promise wrapper for sqlite3 db.run method.
 * @param {string} sql - The SQL query to execute.
 * @param {Array} [params=[]] - Parameters for the SQL query.
 * @returns {Promise<{lastID: number, changes: number}>} A promise resolving with lastID and changes count.
 * @throws {Error} If a database error occurs.
 */
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.error('DB Run Error:', sql, params, err);
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

module.exports = {
  db,
  dbAll,
  dbGet,
  dbRun,
};
