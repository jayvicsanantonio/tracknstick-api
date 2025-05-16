import { D1Database } from '@cloudflare/workers-types';
import { User, UserInsert } from '../types/d1.js';
import logger from '../utils/logger.js';

/**
 * Finds a user by their Clerk User ID.
 */
export async function findByClerkId(
  db: D1Database,
  clerkUserId: string
): Promise<User | null> {
  const sql =
    'SELECT id, clerk_user_id, created_at, updated_at FROM users WHERE clerk_user_id = ?';

  const result = await db.prepare(sql).bind(clerkUserId).first();

  return result as User | null;
}

/**
 * Creates a new user record.
 */
export async function create(
  db: D1Database,
  clerkUserId: string
): Promise<number> {
  const sql = 'INSERT INTO users (clerk_user_id) VALUES (?)';

  try {
    const result = await db.prepare(sql).bind(clerkUserId).run();

    if (!result.success) {
      throw new Error('Failed to create user');
    }

    return result.meta.last_row_id as number;
  } catch (error: any) {
    // Check for unique constraint violation
    if (
      error.message?.includes('UNIQUE constraint failed: users.clerk_user_id')
    ) {
      logger.warn(
        `User with clerk_user_id ${clerkUserId} likely already exists.`
      );
      const existingUser = await findByClerkId(db, clerkUserId);
      if (existingUser) return existingUser.id;
    }

    throw error;
  }
}

/**
 * Finds a user by Clerk ID, creating one if not found.
 */
export async function findOrCreateByClerkId(
  db: D1Database,
  clerkUserId: string
): Promise<number> {
  const existingUser = await findByClerkId(db, clerkUserId);
  if (existingUser) {
    return existingUser.id;
  }

  logger.info(`Creating new user record for Clerk ID: ${clerkUserId}`);
  const newUserId = await create(db, clerkUserId);
  return newUserId;
}
