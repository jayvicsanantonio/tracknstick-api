import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../tracknstick.db'
    );

logger.info(`Attempting to connect to database at: ${dbPath}`);

const SQLite3 = sqlite3.verbose();
const db = new SQLite3.Database(dbPath, (err) => {
  if (err) {
    logger.error(`Error opening database at ${dbPath}:`, { error: err });
    process.exit(1);
  } else {
    logger.info('Database connected successfully.');
    db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
      if (pragmaErr) {
        logger.error('Error enabling foreign keys', { error: pragmaErr });
      } else {
        logger.info('Foreign key constraints enabled.');
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
const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        logger.error('DB Run Error:', { sql, params, error: err });
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });

export { db, dbAll, dbGet, dbRun };
