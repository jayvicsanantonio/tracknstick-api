const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const path = require('path');

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
      }
    });
  }
});

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
