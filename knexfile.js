require('dotenv').config();
const path = require('path');
const logger = require('./src/utils/logger');

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, './tracknstick.db');

logger.info(`Knex using database at: ${dbPath}`);

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: dbPath,
    },
    useNullAsDefault: true,
    migrations: {
      directory: './db/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './db/seeds',
    },
  },

  /*
  staging: {
    client: 'postgresql',
    connection: {
      database: 'my_db',
      user:     'username',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      database: 'my_db',
      user:     'username',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }
  */
};
