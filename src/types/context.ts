import { Config } from '../utils/config.js';

// Extend Hono's context variable map to include our custom variables
declare module 'hono' {
  interface ContextVariableMap {
    config: Config;
    auth: {
      userId: string;
      sessionId: string;
    };
    validated_json: any;
    validated_query: any;
    validated_param: any;
    logger: any;
    performanceMetrics: any;
  }
}