const { dbGet, dbRun } = require('../utils/dbUtils');
const { DatabaseError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * @description Finds a user by their Clerk User ID.
 * @param {string} clerkUserId - The Clerk User ID.
 * @returns {Promise<object|undefined>} A promise resolving to the user object ({ id, clerk_user_id }) or undefined.
 * @throws {DatabaseError} If a database error occurs.
 */
async function findByClerkId(clerkUserId) {
  const sql = 'SELECT id, clerk_user_id FROM users WHERE clerk_user_id = ?';
  try {
    const user = await dbGet(sql, [clerkUserId]);
    return user;
  } catch (error) {
    logger.error(`Error in findByClerkId repository: ${error.message}`);
    throw new DatabaseError('Failed to fetch user by Clerk ID', error);
  }
}

/**
 * @description Creates a new user record.
 * @param {string} clerkUserId - The Clerk User ID.
 * @returns {Promise<number>} A promise resolving to the ID of the newly created user.
 * @throws {DatabaseError} If a database error occurs.
 */
async function create(clerkUserId) {
  const sql = 'INSERT INTO users (clerk_user_id) VALUES (?)';
  try {
    const result = await dbRun(sql, [clerkUserId]);
    return result.lastID;
  } catch (error) {
    logger.error(`Error in create user repository: ${error.message}`);
    if (
      error.code === 'SQLITE_CONSTRAINT' &&
      error.message.includes('UNIQUE constraint failed: users.clerk_user_id')
    ) {
      logger.warn(
        `User with clerk_user_id ${clerkUserId} likely already exists.`
      );
      const existingUser = await findByClerkId(clerkUserId);
      if (existingUser) return existingUser.id;
    }
    throw new DatabaseError('Failed to create user', error);
  }
}

/**
 * @description Finds a user by Clerk ID, creating one if not found.
 * @param {string} clerkUserId - The Clerk User ID.
 * @returns {Promise<number>} A promise resolving to the internal integer ID of the user.
 * @throws {DatabaseError} If a database error occurs.
 */
async function findOrCreateByClerkId(clerkUserId) {
  const existingUser = await findByClerkId(clerkUserId);
  if (existingUser) {
    return existingUser.id;
  }
  logger.info(`Creating new user record for Clerk ID: ${clerkUserId}`);
  const newUserId = await create(clerkUserId);
  return newUserId;
}

module.exports = {
  findByClerkId,
  create,
  findOrCreateByClerkId,
};
