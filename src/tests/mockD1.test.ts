// The D1 mock must be able to answer different queries differently
// Without this, one canned result served every query in a request

import { describe, it, expect } from 'vitest';
import { createMockD1Database } from './setup.js';

const rows = (results: unknown[]) => ({
  results,
  success: true,
  meta: { changes: 0, last_row_id: 0 },
});

describe('createMockD1Database', () => {
  it('falls back to the default result when nothing matches', async () => {
    const db = createMockD1Database(rows([{ id: 1 }]));
    const result = await db.prepare('SELECT * FROM anything').bind().all();

    expect(result.results).toEqual([{ id: 1 }]);
  });

  it('answers two different queries with two different results', async () => {
    // The case the old mock could not express, and the reason the habits
    // list bug survived: habits and trackers returned the same rows, so the
    // assertion held on either code path.
    const db = createMockD1Database(rows([]), [
      { match: 'FROM habits', result: rows([{ id: 7, name: 'Read' }]) },
      { match: 'FROM trackers', result: rows([{ habit_id: 7 }]) },
    ]);

    const habits = await db.prepare('SELECT * FROM habits').bind().all();
    const trackers = await db.prepare('SELECT * FROM trackers').bind().all();

    expect(habits.results).toEqual([{ id: 7, name: 'Read' }]);
    expect(trackers.results).toEqual([{ habit_id: 7 }]);
  });

  it('supports regex matching and honours responder order', async () => {
    const db = createMockD1Database(rows([]), [
      { match: /COUNT\(\*\)/, result: rows([{ count: 3 }]) },
      { match: 'FROM habits', result: rows([{ id: 1 }]) },
    ]);

    const counted = await db
      .prepare('SELECT COUNT(*) as count FROM habits')
      .bind()
      .first();

    expect(counted).toEqual({ count: 3 });
  });

  it('first() reads from the matched result, not the default', async () => {
    const db = createMockD1Database(rows([{ id: 'default' }]), [
      { match: 'FROM users', result: rows([{ id: 'matched' }]) },
    ]);

    expect(await db.prepare('SELECT * FROM users').bind().first()).toEqual({
      id: 'matched',
    });
  });
});
