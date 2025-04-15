/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .createTable('users', function (table) {
      table.increments('id').primary();
      table.string('clerk_user_id').notNullable().unique();
    })
    .createTable('habits', function (table) {
      table.increments('id').primary();
      table.integer('user_id').notNullable();
      table.string('name').notNullable();
      table.string('icon');
      table.string('frequency').notNullable();
      table.integer('streak').defaultTo(0);
      table.integer('total_completions').defaultTo(0);
      table.datetime('last_completed');

      table
        .foreign('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');

      table.index(['user_id', 'frequency'], 'idx_habits_user_frequency');
    })
    .createTable('trackers', function (table) {
      table.increments('id').primary();
      table.integer('habit_id').notNullable();
      table.integer('user_id').notNullable();
      table.datetime('timestamp').notNullable();
      table.text('notes');

      table
        .foreign('habit_id')
        .references('id')
        .inTable('habits')
        .onDelete('CASCADE');
      table
        .foreign('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');

      table.index(
        ['habit_id', 'user_id', 'timestamp'],
        'idx_trackers_habit_user_ts'
      );
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('trackers')
    .dropTableIfExists('habits')
    .dropTableIfExists('users');
};
