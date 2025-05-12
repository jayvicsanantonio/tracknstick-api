const { dbRun } = require('./dbUtils'); // Assuming dbRun handles BEGIN, COMMIT, ROLLBACK
const logger = require('./logger');

/**
 * Executes a series of database operations within a transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 * @param {Function} operations - An async function containing the database operations to execute.
 *                                This function should throw an error if any operation fails.
 * @returns {Promise<any>} A promise that resolves with the result of the operations function if successful.
 * @throws {Error} Throws the original error from operations or a transaction management error.
 */
async function withTransaction(operations) {
  try {
    await dbRun('BEGIN TRANSACTION');

    const result = await operations();

    await dbRun('COMMIT');
    return result;
  } catch (err) {
    logger.error('Transaction failed. Rolling back.', { error: err });
    try {
      await dbRun('ROLLBACK');
    } catch (rollbackErr) {
      logger.error('FATAL: Failed to rollback transaction after error.', {
        rollbackError: rollbackErr,
        originalError: err,
      });
      throw rollbackErr;
    }
    throw err;
  }
}

module.exports = {
  withTransaction,
};
