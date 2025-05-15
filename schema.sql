CREATE TABLE `knex_migrations` (`id` integer not null primary key autoincrement, `name` varchar(255), `batch` integer, `migration_time` datetime);
CREATE TABLE `knex_migrations_lock` (`index` integer not null primary key autoincrement, `is_locked` integer);
CREATE TABLE `users` (`id` integer not null primary key autoincrement, `clerk_user_id` varchar(255) not null);
CREATE UNIQUE INDEX `users_clerk_user_id_unique` on `users` (`clerk_user_id`);
CREATE TABLE `trackers` (`id` integer not null primary key autoincrement, `habit_id` integer not null, `user_id` integer not null, `timestamp` datetime not null, `notes` text, foreign key(`habit_id`) references `habits`(`id`) on delete CASCADE, foreign key(`user_id`) references `users`(`id`) on delete CASCADE);
CREATE INDEX `idx_trackers_habit_user_ts` on `trackers` (`habit_id`, `user_id`, `timestamp`);
CREATE TABLE IF NOT EXISTS "habits" (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `user_id` integer NOT NULL, `name` varchar(255) NOT NULL, `icon` varchar(255), `frequency` varchar(255) NOT NULL, `streak` integer DEFAULT '0', `total_completions` integer DEFAULT '0', `last_completed` datetime, `longest_streak` integer default '0', `start_date` date null, `end_date` date null, FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE);
CREATE INDEX `idx_habits_user_frequency` on `habits` (`user_id`, `frequency`);
