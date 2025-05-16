// @ts-nocheck
import { HTTPException } from 'hono/http-exception';
import {
  BaseError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
} from '../utils/errors.js';
import { StatusCodes } from '../utils/statusCodes.js';
import logger from '../utils/logger.js';

/**
 * Helper function to get an error code from HTTP status
 */
function getErrorCodeFromStatus(status) {
  switch (status) {
    case StatusCodes.BAD_REQUEST:
      return 'bad_request';
    case StatusCodes.UNAUTHORIZED:
      return 'unauthorized';
    case StatusCodes.FORBIDDEN:
      return 'forbidden';
    case StatusCodes.NOT_FOUND:
      return 'not_found';
    case StatusCodes.TOO_MANY_REQUESTS:
      return 'too_many_requests';
    default:
      return status >= 500 ? 'internal_server_error' : 'client_error';
  }
}

export const errorHandler = (err, c) => {
  // Try to get the request-specific logger from context
  const requestLogger = c.get('logger') || logger;

  // Log the error
  requestLogger.error('Error handling request', err);

  // Handle Hono's HTTPException
  if (err instanceof HTTPException) {
    c.status(err.status);
    return c.json({
      error: {
        message: err.message,
        code: getErrorCodeFromStatus(err.status),
      },
    });
  }

  // Handle custom error types
  if (err instanceof BaseError) {
    if (err instanceof NotFoundError) {
      c.status(StatusCodes.NOT_FOUND);
      return c.json({
        error: {
          message: err.message,
          code: 'not_found',
        },
      });
    }

    if (err instanceof ValidationError) {
      c.status(StatusCodes.BAD_REQUEST);
      return c.json({
        error: {
          message: err.message,
          code: 'validation_error',
          details: err.details,
        },
      });
    }

    if (err instanceof UnauthorizedError) {
      c.status(StatusCodes.UNAUTHORIZED);
      return c.json({
        error: {
          message: err.message,
          code: 'unauthorized',
        },
      });
    }

    if (err instanceof ForbiddenError) {
      c.status(StatusCodes.FORBIDDEN);
      return c.json({
        error: {
          message: err.message,
          code: 'forbidden',
        },
      });
    }

    // Generic BaseError
    c.status(err.statusCode || 500);
    return c.json({
      error: {
        message: err.message,
        code: err.code || 'internal_server_error',
      },
    });
  }

  // Handle unknown errors
  c.status(StatusCodes.INTERNAL_SERVER_ERROR);
  return c.json({
    error: {
      message: 'Internal Server Error',
      code: 'internal_server_error',
    },
  });
};
