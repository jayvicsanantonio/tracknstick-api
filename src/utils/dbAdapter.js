/**
 * Database adapter that supports both SQLite3 (for local development) and D1 (for Cloudflare Workers)
 * This provides a unified interface regardless of the database backend being used.
 */
import logger from './logger.js';

// Determine if we're in a Cloudflare Workers environment
const isCloudflareWorker = 
  typeof navigator !== 'undefined' && 
  navigator.userAgent === 'Cloudflare-Workers';

let sqliteDb, dbAll, dbGet, dbRun;

// For Node.js environment, initialize SQLite3
if (!isCloudflareWorker && typeof process !== 'undefined') {
  try {
    // Import SQLite3 dependencies (only in Node.js environment)
    const { db, dbAll: _dbAll, dbGet: _dbGet, dbRun: _dbRun } = await import('./dbUtils.js');
    sqliteDb = db;
    dbAll = _dbAll;
    dbGet = _dbGet;
    dbRun = _dbRun;
    
    logger.info('Using SQLite3 database for local development');
  } catch (error) {
    logger.error('Failed to initialize SQLite3:', { error });
  }
}

/**
 * Database adapter that works with both SQLite3 and D1
 */
class DbAdapter {
  constructor(env) {
    this.env = env;
    this.d1Db = isCloudflareWorker ? env?.DB : null;
  }
  
  /**
   * Execute a query that returns multiple rows
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} - Result rows
   */
  async all(sql, params = []) {
    if (isCloudflareWorker && this.d1Db) {
      try {
        // Use D1 database in Workers environment
        const stmt = this.d1Db.prepare(sql);
        const result = await stmt.bind(...params).all();
        return result.results;
      } catch (error) {
        logger.error('D1 query error (all):', { sql, params, error });
        throw error;
      }
    } else if (dbAll) {
      // Use SQLite3 in Node.js environment
      return dbAll(sql, params);
    } else {
      throw new Error('No database connection available');
    }
  }
  
  /**
   * Execute a query that returns a single row
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} - Result row or null
   */
  async get(sql, params = []) {
    if (isCloudflareWorker && this.d1Db) {
      try {
        // Use D1 database in Workers environment
        const stmt = this.d1Db.prepare(sql);
        return await stmt.bind(...params).first();
      } catch (error) {
        logger.error('D1 query error (get):', { sql, params, error });
        throw error;
      }
    } else if (dbGet) {
      // Use SQLite3 in Node.js environment
      return dbGet(sql, params);
    } else {
      throw new Error('No database connection available');
    }
  }
  
  /**
   * Execute a query that modifies data
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<{lastID: number, changes: number}>} - Result with lastID and changes
   */
  async run(sql, params = []) {
    if (isCloudflareWorker && this.d1Db) {
      try {
        // Use D1 database in Workers environment
        const stmt = this.d1Db.prepare(sql);
        const result = await stmt.bind(...params).run();
        return {
          lastID: result.meta.last_row_id,
          changes: result.meta.changes
        };
      } catch (error) {
        logger.error('D1 query error (run):', { sql, params, error });
        throw error;
      }
    } else if (dbRun) {
      // Use SQLite3 in Node.js environment
      return dbRun(sql, params);
    } else {
      throw new Error('No database connection available');
    }
  }
}

/**
 * Create a database instance based on the current environment
 * @param {Object} env - Environment variables (including DB for D1)
 * @returns {DbAdapter} Database adapter instance
 */
export const createDbInstance = (env) => {
  return new DbAdapter(env);
};

export default DbAdapter;
