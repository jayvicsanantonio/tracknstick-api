import { vi } from 'vitest';
import { Hono } from 'hono';
import { D1Database } from '@cloudflare/workers-types';

/**
 * A canned answer for queries whose SQL matches `match`.
 * Without this, one result had to serve every query in a request, so a test
 * could not express "the habits query returns X and the trackers query
 * returns Y" -- which is why divergent behaviour between the two went
 * unnoticed.
 */
export interface QueryResponder {
  match: string | RegExp;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const matches = (sql: string, match: string | RegExp) =>
  typeof match === 'string' ? sql.includes(match) : match.test(sql);

/**
 * Creates a mock D1 database for testing.
 *
 * @param mockResults result for any query no responder matches
 * @param responders per-query results, first match wins
 */
export function createMockD1Database(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockResults: any,
  responders: QueryResponder[] = []
): D1Database {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultFor = (sql: string): any => {
    const responder = responders.find((r) => matches(sql, r.match));
    return responder ? responder.result : mockResults;
  };

  const mockD1 = {
    prepare: vi.fn((sql: string) => {
      const result = resultFor(sql ?? '');
      return {
        // batch() receives the prepared statement, not its SQL, so the
        // resolved result has to travel on the statement itself. Without
        // this every statement in a batch fell back to the catch-all
        // result, which made a batch of differing queries untestable.
        __result: result,
        bind: vi.fn().mockReturnThis(),
        first: vi
          .fn()
          .mockImplementation(async () => result.results?.[0] ?? null),
        run: vi.fn().mockResolvedValue(result),
        all: vi.fn().mockResolvedValue(result),
      };
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    batch: vi.fn().mockImplementation(async (statements: any[]) => {
      // Each prepared statement carries the result its SQL resolved to
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return statements.map((s: any) => s?.__result ?? mockResults);
    }),
    // exec is intentionally omitted to test for missing methods
  } as unknown as D1Database;

  return mockD1;
}

/**
 * Creates a test environment with a mock Cloudflare Workers context
 */
export function createTestEnv(responders: QueryResponder[] = []) {
  const mockResults = {
    results: [],
    success: true,
    meta: { changes: 1, last_row_id: 1 },
  };

  const mockDb = createMockD1Database(mockResults, responders);

  // Mock Cloudflare environment bindings
  const env = {
    ENVIRONMENT: 'test',
    CLERK_SECRET_KEY: 'test-clerk-key',
    CLERK_PUBLISHABLE_KEY: 'test-clerk-publishable-key',
    DB: mockDb,
  };

  const app = new Hono();

  return {
    app,
    env,
    mockDb,
    mockResults,
  };
}

// Mock Clerk state - must be prefixed with 'mock' for Vitest
const mockClerkState = {
  userId: 'test-user-123',
  isAuthenticated: true,
};

// Mock the Clerk SDK verification at the top level
vi.mock('@clerk/backend', () => {
  return {
    createClerkClient: () => ({
      authenticateRequest: async (req: Request) => {
        const authHeader = req.headers.get('Authorization');
        const isActuallyAuthenticated =
          mockClerkState.isAuthenticated &&
          !!authHeader &&
          authHeader.startsWith('Bearer ') &&
          !authHeader.toLowerCase().includes('invalid');

        return {
          isAuthenticated: isActuallyAuthenticated,
          reason: isActuallyAuthenticated ? undefined : 'test-reason',
          toAuth: () => ({
            userId: mockClerkState.userId,
            sessionId: 'test-session',
            sessionClaims: {
              iss: 'https://clerk.test',
              aud: 'test-app',
              exp: Math.floor(Date.now() / 1000) + 3600,
              iat: Math.floor(Date.now() / 1000),
              nbf: Math.floor(Date.now() / 1000),
            },
          }),
        };
      },
    }),
  };
});

/**
 * Mocks authentication to bypass Clerk verification
 */
export function mockAuthentication(
  userId = 'test-user-123',
  authenticated = true
) {
  mockClerkState.userId = userId;
  mockClerkState.isAuthenticated = authenticated;
}

/**
 * Reset all mocks between tests
 */
export function resetMocks() {
  vi.resetAllMocks();
}
