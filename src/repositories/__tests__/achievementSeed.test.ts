import { describe, it, expect, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import { AchievementRepository } from '../achievement.repository.js';

/** Records the SQL every prepared statement carries. */
function recordingDb() {
  const statements: string[] = [];
  const db = {
    prepare: vi.fn((sql: string) => {
      statements.push(sql);
      return {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true }),
      };
    }),
  } as unknown as D1Database;

  return { db, statements };
}

describe('initializeAchievements', () => {
  it('updates the catalogue in place instead of replacing rows', async () => {
    // INSERT OR REPLACE deletes the row first, and
    // user_achievements.achievement_id cascades on delete -- so re-seeding
    // wiped every badge every user had earned.
    const { db, statements } = recordingDb();

    await new AchievementRepository(db).initializeAchievements();

    expect(statements.length).toBeGreaterThan(0);
    for (const sql of statements) {
      expect(sql).not.toMatch(/INSERT\s+OR\s+REPLACE/i);
      expect(sql).toMatch(/ON CONFLICT\(key\) DO UPDATE/i);
    }
  });

  it('writes one statement per seeded achievement', async () => {
    const { db, statements } = recordingDb();
    const repository = new AchievementRepository(db);

    await repository.initializeAchievements();

    expect(statements).toHaveLength(repository.getDefaultAchievements().length);
  });
});
