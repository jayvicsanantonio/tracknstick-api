/**
 * Utility for safely using HTTP status codes with Hono
 *
 * Hono expects statusCode values to match its internal StatusCode type
 * This utility ensures we can safely use numeric status codes without type errors
 */

// Standard HTTP status codes that are commonly used
export const StatusCodes = {
  // 2xx Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  // 4xx Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Valid status code range
const MIN_STATUS_CODE = 100;
const MAX_STATUS_CODE = 599;

/**
 * Validates that a status code is within a valid HTTP status code range
 */
export function isValidStatusCode(code: number): boolean {
  return (
    Number.isInteger(code) && code >= MIN_STATUS_CODE && code <= MAX_STATUS_CODE
  );
}

/**
 * Safely converts a number to a valid HTTP status code
 * If invalid, falls back to 500 (Internal Server Error)
 */
export function toStatusCode(code: number): number {
  return isValidStatusCode(code) ? code : StatusCodes.INTERNAL_SERVER_ERROR;
}
