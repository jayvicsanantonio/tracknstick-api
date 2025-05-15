import app from './index.js';

export default {
  async fetch(request, env, ctx) {
    // Setup process.env for compatibility with Node.js code
    if (typeof process === 'undefined') {
      globalThis.process = { env: {} };
    } else if (typeof process.env === 'undefined') {
      process.env = {};
    }

    // Copy environment variables from env to process.env
    for (const key in env) {
      if (
        typeof key === 'string' &&
        !['DB', 'ASSETS', 'ENVIRONMENT'].includes(key)
      ) {
        process.env[key] = env[key];
      }
    }

    // Set NODE_ENV from the environment
    process.env.NODE_ENV = env.ENVIRONMENT || 'production';

    // Pass the request to the Hono app
    return app.fetch(request, env, ctx);
  },
};
