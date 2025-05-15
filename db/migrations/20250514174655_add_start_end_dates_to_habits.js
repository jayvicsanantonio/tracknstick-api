/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table('habits', (table) => {
    table.date('start_date').nullable();
    table.date('end_date').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table('habits', (table) => {
    table.dropColumn('start_date');
    table.dropColumn('end_date');
  });
};
