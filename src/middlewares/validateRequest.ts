import { Context, MiddlewareHandler, Next } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';

type ValidateTarget = 'json' | 'query' | 'param';

export const validateRequest =
  <T extends z.ZodTypeAny>(
    schema: T,
    target: ValidateTarget = 'json'
  ): MiddlewareHandler =>
  async (c: Context, next: Next) => {
    try {
      let data: unknown;

      switch (target) {
        case 'json':
          try {
            data = await c.req.json();
          } catch (jsonError) {
            logger.warn('Invalid JSON payload received', { 
              url: c.req.url, 
              method: c.req.method 
            });
            throw new ValidationError('Invalid JSON payload');
          }
          break;
        case 'query':
          data = c.req.query();
          break;
        case 'param':
          data = c.req.param();
          break;
        default:
          try {
            data = await c.req.json();
          } catch (jsonError) {
            data = {};
          }
          break;
      }

      const result = schema.safeParse(data);

      if (!result.success) {
        const formattedErrors = result.error.format();
        logger.warn('Request validation failed', { 
          target, 
          errors: formattedErrors,
          url: c.req.url,
          method: c.req.method 
        });
        throw new ValidationError('Validation failed', formattedErrors);
      }

      // Add validated data to the context for easy access
      c.set(`validated_${target}`, result.data as z.infer<T>);

      await next();
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      if (error instanceof z.ZodError) {
        logger.warn('Zod validation error', { error: error.format() });
        throw new ValidationError('Validation failed', error.format());
      }

      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Unexpected error in validation middleware', err);
      throw err;
    }
  };
