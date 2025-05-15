import { z } from 'zod';

/**
 * Creates a validation middleware for Hono using Zod schemas
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @param {string} source - The source of data to validate ('params', 'query', or 'json')
 * @returns {Function} Hono middleware function
 */
const validate = (schema, source = 'json') => {
  return async (c, next) => {
    try {
      let data;

      // Get data based on the source
      switch (source) {
        case 'params':
          data = c.req.param();
          break;
        case 'query':
          data = c.req.query();
          break;
        case 'json':
        default:
          data = await c.req.json().catch(() => ({}));
          break;
      }

      // Validate data against the schema
      const result = schema.safeParse(data);

      if (!result.success) {
        // Format validation errors
        const validationError = new Error('Input validation failed');
        validationError.statusCode = 400;
        validationError.status = 'fail';
        validationError.isOperational = true;
        validationError.errorCode = 'VALIDATION_ERROR';
        validationError.details = result.error.issues.map((issue) => ({
          type: issue.code,
          value: issue.path.join('.'),
          msg: issue.message,
          path: issue.path,
          location: source,
        }));

        throw validationError;
      }

      // Add validated data to context for handlers to use
      const validatedData = c.get('validated') ?? {};

      c.set('validated', { ...validatedData, ...result.data });

      return next();
    } catch (error) {
      if (error.errorCode === 'VALIDATION_ERROR') {
        throw error;
      }

      // Handle unexpected errors during validation
      const validationError = new Error('Validation error');
      validationError.statusCode = 400;
      validationError.status = 'fail';
      validationError.isOperational = true;
      validationError.errorCode = 'VALIDATION_ERROR';
      validationError.details = [
        {
          type: 'unknown',
          msg: error.message,
          location: source,
        },
      ];

      throw validationError;
    }
  };
};

export default validate;
