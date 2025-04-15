const { dbGet } = require('../utils/dbUtils');
const { DatabaseError } = require('../utils/errors');

/**
 * @description Finds a user by their API key.
 * @param {string} apiKey - The API key to search for.
 * @returns {Promise<object|undefined>} A promise that resolves to the user object ({ id }) or undefined if not found.
 * @throws {DatabaseError} If a database error occurs during the query.
 */
async function findByApiKey(apiKey) {
  const sql = 'SELECT id FROM users WHERE api_key = ?';
  try {
    const user = await dbGet(sql, [apiKey]);
    return user;
  } catch (error) {
    console.error(`Error in findByApiKey repository: ${error.message}`);
    throw new DatabaseError('Failed to fetch user by API key', error);
  }
}

module.exports = {
  findByApiKey,
};
