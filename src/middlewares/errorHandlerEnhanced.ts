// Environment-aware error handler with information disclosure prevention
// Provides detailed errors in development, secure responses in production

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import {
  BaseError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
} from '../utils/errors.js';
import { StatusCodes } from '../utils/statusCodes.js';
import { getSecurityConfig, type ErrorConfig } from '../config/security.js';
import logger from '../utils/logger.js';

interface ErrorResponse {
  error: {
    message: string;
    code: string;
    details?: any;
    requestId?: string;
    timestamp?: string;
  };
}

/**
 * Generate a unique request ID for error tracking
 */
function generateRequestId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get error code from HTTP status code
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
    case StatusCodes.UNPROCESSABLE_ENTITY:
      return 'validation_error';
    default:
      return status >= 500 ? 'internal_server_error' : 'client_error';
  }
}

/**
 * Sanitize error details for production environment
 */
function sanitizeErrorDetails(details: any, showDetails: boolean): any {
  if (!showDetails) {
    return undefined;
  }

  if (typeof details === 'string') {
    return details;
  }

  if (Array.isArray(details)) {
    return details.map(item => sanitizeErrorDetails(item, showDetails));
  }

  if (details && typeof details === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(details)) {
      // Skip sensitive fields that might leak information
      if (['password', 'token', 'secret', 'key', 'auth'].some(sensitive => 
        key.toLowerCase().includes(sensitive))) {
        continue;
      }

      if (key === 'stack' && !showDetails) {
        continue; // Never include stack traces in production
      }

      sanitized[key] = sanitizeErrorDetails(value, showDetails);
    }
    return sanitized;
  }

  return details;
}

/**
 * Format error message for environment
 */
function formatErrorMessage(error: Error, showDetails: boolean, fallbackMessage: string): string {
  if (!showDetails) {
    // In production, use generic messages for unknown errors
    return fallbackMessage;
  }

  // In development, show actual error message
  return error.message || fallbackMessage;
}

/**
 * Extract meaningful error context for logging
 */
function extractErrorContext(c: Context, error: Error): Record<string, any> {
  const auth = c.get('auth');
  
  return {
    path: c.req.path,
    method: c.req.method,
    userId: auth?.userId,
    requestId: auth?.metadata?.requestId,
    userAgent: c.req.header('User-Agent'),
    ipAddress: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
    errorType: error.constructor.name,
    errorMessage: error.message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Enhanced error handler with environment awareness
 */
export const errorHandlerEnhanced = (err: Error, c: Context) => {
  const errorConfig = getSecurityConfig().errorHandling;
  const requestId = generateRequestId();
  
  // Extract error context for logging
  const errorContext = extractErrorContext(c, err);
  errorContext.requestId = requestId;

  // Log error with appropriate level
  const logLevel = errorConfig.logLevel;
  const logData: Record<string, any> = {
    ...errorContext,
    ...(errorConfig.showStackTrace && err.stack ? { stack: err.stack } : {}),
  };

  if (err instanceof BaseError && err.statusCode < 500) {
    // Client errors (4xx) - log as warning
    logger.warn('Client error occurred', logData as any);
  } else {
    // Server errors (5xx) - log as error
    logger.error('Server error occurred', logData as any);
  }

  // Handle Hono's HTTPException
  if (err instanceof HTTPException) {
    const response: ErrorResponse = {
      error: {
        message: formatErrorMessage(err, errorConfig.showErrorDetails, 'Request failed'),
        code: getErrorCodeFromStatus(err.status),
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    if (errorConfig.showErrorDetails && err.cause) {
      response.error.details = sanitizeErrorDetails(err.cause, errorConfig.showErrorDetails);
    }

    c.status(err.status);
    return c.json(response);
  }

  // Handle NotFoundError
  if (err instanceof NotFoundError) {
    const response: ErrorResponse = {
      error: {
        message: formatErrorMessage(err, errorConfig.showErrorDetails, 'Resource not found'),
        code: 'not_found',
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    c.status(StatusCodes.NOT_FOUND);
    return c.json(response);
  }

  // Handle ValidationError
  if (err instanceof ValidationError) {
    const response: ErrorResponse = {
      error: {
        message: formatErrorMessage(err, errorConfig.showErrorDetails, 'Invalid request data'),
        code: 'validation_error',
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    if (errorConfig.showErrorDetails && err.details) {
      response.error.details = sanitizeErrorDetails(err.details, errorConfig.showErrorDetails);
    }

    c.status(StatusCodes.BAD_REQUEST);
    return c.json(response);
  }

  // Handle UnauthorizedError
  if (err instanceof UnauthorizedError) {
    const response: ErrorResponse = {
      error: {
        message: 'Authentication required',
        code: 'unauthorized',
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    c.status(StatusCodes.UNAUTHORIZED);
    return c.json(response);
  }

  // Handle ForbiddenError
  if (err instanceof ForbiddenError) {
    const response: ErrorResponse = {
      error: {
        message: formatErrorMessage(err, errorConfig.showErrorDetails, 'Access denied'),
        code: 'forbidden',
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    c.status(StatusCodes.FORBIDDEN);
    return c.json(response);
  }

  // Handle RateLimitError
  if (err instanceof RateLimitError) {
    const response: ErrorResponse = {
      error: {
        message: 'Too many requests',
        code: 'too_many_requests',
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    c.status(StatusCodes.TOO_MANY_REQUESTS);
    return c.json(response);
  }

  // Handle other BaseError instances
  if (err instanceof BaseError) {
    const response: ErrorResponse = {
      error: {
        message: formatErrorMessage(err, errorConfig.showErrorDetails, 'Request failed'),
        code: err.code || 'internal_server_error',
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    if (errorConfig.showErrorDetails && err.details) {
      response.error.details = sanitizeErrorDetails(err.details, errorConfig.showErrorDetails);
    }

    c.status((err.statusCode as any) || 500);
    return c.json(response);
  }

  // Handle database errors specifically
  if (err.name === 'SqliteError' || err.message?.includes('SQLITE_')) {
    logger.error('Database error occurred', {
      ...logData,
      category: 'database',
    } as any);

    const response: ErrorResponse = {
      error: {
        message: errorConfig.showErrorDetails ? 
          `Database error: ${err.message}` : 
          'Internal server error',
        code: 'database_error',
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    c.status(StatusCodes.INTERNAL_SERVER_ERROR);
    return c.json(response);
  }

  // Handle unknown errors
  logger.error('Unknown error occurred', {
    ...logData,
    category: 'unknown',
  } as any);

  const response: ErrorResponse = {
    error: {
      message: errorConfig.showErrorDetails ? 
        err.message || 'Unknown error occurred' : 
        'Internal server error',
      code: 'internal_server_error',
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  if (errorConfig.showStackTrace && err.stack) {
    response.error.details = {
      stack: err.stack.split('\n'),
    };
  }

  c.status(StatusCodes.INTERNAL_SERVER_ERROR);
  return c.json(response);
};