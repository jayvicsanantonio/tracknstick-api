import { vi } from 'vitest';
import { Hono } from 'hono';
import { D1Database } from '@cloudflare/workers-types';

/**
 * Creates a mock D1 database for testing
 */
export function createMockD1Database(): D1Database {
  const mockResults = {
    results: [],
    success: true,
    meta: { changes: 0, last_row_id: 0 },
  };

  const mockD1 = {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue(mockResults),
      run: vi.fn().mockResolvedValue(mockResults),
    }),
    batch: vi.fn().mockResolvedValue([]),
    exec: vi.fn().mockResolvedValue({ results: [] }),
  } as unknown as D1Database;

  return mockD1;
}

/**
 * Creates a test environment with a mock Cloudflare Workers context
 */
export function createTestEnv() {
  const mockDb = createMockD1Database();

  // Mock Cloudflare environment bindings
  const env = {
    ENVIRONMENT: 'test',
    CLERK_SECRET_KEY: 'test-clerk-key',
    DB: mockDb,
  };

  const app = new Hono();

  return {
    app,
    env,
    mockDb,
    mockResults: {
      results: [],
      success: true,
      meta: { changes: 0, last_row_id: 0 },
    },
  };
}

/**
 * Mocks authentication to bypass Clerk verification
 */
export function mockAuthentication(userId = 'test-user-123') {
  // Mock the Clerk SDK verification
  vi.mock('@clerk/backend', () => ({
    ClerkClient: {
      verifyToken: vi.fn().mockImplementation(() => ({
        sub: userId,
        sid: 'test-session',
      })),
    },
  }));
}

/**
 * Reset all mocks between tests
 */
export function resetMocks() {
  vi.resetAllMocks();
}
