import { HTTPException } from 'hono/http-exception';
import { Context } from 'hono';
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
function getErrorCodeFromStatus(status: number): string {
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

/**
 * Sanitize error message for production to prevent information leakage
 */
function sanitizeErrorMessage(message: string, isProduction: boolean): string {
  if (!isProduction) {
    return message;
  }
  
  // In production, return generic messages for server errors
  if (message.includes('database') || message.includes('Database')) {
    return 'A database error occurred';
  }
  
  return message;
}

export const errorHandler = (err: Error, c: Context) => {
  // Try to get the request-specific logger from context
  const requestLogger = c.get('logger') || logger;
  const isProduction = c.env?.ENVIRONMENT === 'production';

  // Create error context for logging
  const errorContext = {
    url: c.req.url,
    method: c.req.method,
    userAgent: c.req.header('User-Agent'),
    userId: c.get('auth')?.userId,
    timestamp: new Date().toISOString(),
  };

  // Log the error with context
  requestLogger.error('Error handling request', err, errorContext);

  // Handle Hono's HTTPException
  if (err instanceof HTTPException) {
    const message = sanitizeErrorMessage(err.message, isProduction);
    c.status(err.status);
    return c.json({
      error: {
        message,
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
          message: sanitizeErrorMessage(err.message, isProduction),
          code: 'not_found',
        },
      });
    }

    if (err instanceof ValidationError) {
      c.status(StatusCodes.BAD_REQUEST);
      return c.json({
        error: {
          message: err.message, // Validation errors are safe to expose
          code: 'validation_error',
          details: isProduction ? undefined : err.details,
        },
      });
    }

    if (err instanceof UnauthorizedError) {
      c.status(StatusCodes.UNAUTHORIZED);
      return c.json({
        error: {
          message: err.message, // Auth errors are safe to expose
          code: 'unauthorized',
        },
      });
    }

    if (err instanceof ForbiddenError) {
      c.status(StatusCodes.FORBIDDEN);
      return c.json({
        error: {
          message: err.message, // Forbidden errors are safe to expose
          code: 'forbidden',
        },
      });
    }

    // Generic BaseError
    const statusCode = err.statusCode || 500;
    const message = sanitizeErrorMessage(err.message, isProduction);
    
    c.status(statusCode as any);
    return c.json({
      error: {
        message,
        code: err.code || 'internal_server_error',
      },
    });
  }

  // Handle unknown errors - never expose internal details in production
  c.status(StatusCodes.INTERNAL_SERVER_ERROR);
  return c.json({
    error: {
      message: isProduction ? 'Internal Server Error' : err.message,
      code: 'internal_server_error',
    },
  });
};
