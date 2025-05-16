export class BaseError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(
    message: string,
    statusCode = 500,
    code = 'internal_server_error',
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  constructor(message = 'Validation error', details?: any) {
    super(message, 400, 'validation_error', details);
  }
}

export class NotFoundError extends BaseError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'not_found');
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'unauthorized');
  }
}

export class ForbiddenError extends BaseError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'forbidden');
  }
}

export class ConflictError extends BaseError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'conflict');
  }
}

export class RateLimitError extends BaseError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'rate_limit');
  }
}

export class DatabaseError extends BaseError {
  originalError?: Error;

  constructor(message = 'Database operation failed', originalError?: Error) {
    super(message, 500, 'database_error');
    this.originalError = originalError; // Store original error for logging
  }
}
