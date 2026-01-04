import { vi } from 'vitest';
import { Hono } from 'hono';
import { D1Database } from '@cloudflare/workers-types';

/**
 * Creates a mock D1 database for testing
 */
export function createMockD1Database(mockResults: any): D1Database {
  // Create a more robust mock DB
  const mockD1 = {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      first: vi
        .fn()
        .mockImplementation(async () => mockResults.results[0] || null),
      run: vi.fn().mockResolvedValue(mockResults),
      all: vi.fn().mockResolvedValue(mockResults),
    }),
    batch: vi.fn().mockImplementation(async (statements) => {
      return statements.map(() => mockResults);
    }),
    // exec is intentionally omitted to test for missing methods or to be added as needed
  } as unknown as D1Database;

  return mockD1;
}

/**
 * Creates a test environment with a mock Cloudflare Workers context
 */
export function createTestEnv() {
  const mockResults = {
    results: [],
    success: true,
    meta: { changes: 1, last_row_id: 1 },
  };

  const mockDb = createMockD1Database(mockResults);

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
