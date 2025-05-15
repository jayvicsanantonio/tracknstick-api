import logger from './logger.js';

class D1Adapter {
  constructor(d1Database) {
    this.d1 = d1Database;
  }

  /**
   * Execute a query against D1
   * @param {string} query - SQL query to execute
   * @param {Array} params - Parameters for the query
   * @returns {Promise<Object>} Query result
   */
  async query(query, params = []) {
    try {
      const result = await this.d1
        .prepare(query)
        .bind(...params)
        .all();
      return result;
    } catch (error) {
      logger.error('D1 query error:', { error, query, params });
      throw error;
    }
  }

  /**
   * Insert data into a table
   * @param {string} table - Table name
   * @param {Object} data - Data to insert
   * @returns {Promise<Object>} Insert result
   */
  async insert(table, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

    try {
      const result = await this.d1
        .prepare(query)
        .bind(...values)
        .run();
      return { id: result.meta.last_row_id, ...data };
    } catch (error) {
      logger.error('D1 insert error:', { error, table, data });
      throw error;
    }
  }

  /**
   * Update data in a table
   * @param {string} table - Table name
   * @param {Object} data - Data to update
   * @param {Object} where - Where clause
   * @returns {Promise<Object>} Update result
   */
  async update(table, data, where) {
    const setClause = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ');
    const whereClause = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(' AND ');

    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const values = [...Object.values(data), ...Object.values(where)];

    try {
      const result = await this.d1
        .prepare(query)
        .bind(...values)
        .run();
      return { updated: result.meta.changes };
    } catch (error) {
      logger.error('D1 update error:', { error, table, data, where });
      throw error;
    }
  }

  /**
   * Delete data from a table
   * @param {string} table - Table name
   * @param {Object} where - Where clause
   * @returns {Promise<Object>} Delete result
   */
  async delete(table, where) {
    const whereClause = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(' AND ');

    const query = `DELETE FROM ${table} WHERE ${whereClause}`;
    const values = Object.values(where);

    try {
      const result = await this.d1
        .prepare(query)
        .bind(...values)
        .run();
      return { deleted: result.meta.changes };
    } catch (error) {
      logger.error('D1 delete error:', { error, table, where });
      throw error;
    }
  }

  /**
   * Select data from a table
   * @param {string} table - Table name
   * @param {Object} where - Where clause
   * @param {Array} select - Columns to select
   * @returns {Promise<Array>} Select result
   */
  async select(table, where = {}, select = ['*']) {
    const selectClause = select.join(', ');
    let query = `SELECT ${selectClause} FROM ${table}`;
    const values = [];

    if (Object.keys(where).length > 0) {
      const whereClause = Object.keys(where)
        .map((key) => `${key} = ?`)
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
      values.push(...Object.values(where));
    }

    try {
      const result = await this.d1
        .prepare(query)
        .bind(...values)
        .all();
      return result.results;
    } catch (error) {
      logger.error('D1 select error:', { error, table, where, select });
      throw error;
    }
  }
}

export default D1Adapter;
