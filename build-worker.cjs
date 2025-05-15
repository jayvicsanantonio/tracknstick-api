/**
 * Build script for Cloudflare Workers deployment
 * This creates simplified worker files that exclude Node.js native modules
 */
const fs = require('fs');
const path = require('path');

// Create a new minimal entry point for Cloudflare Workers
const workerCode = `
// Import the worker entry point
import app from './worker-entry.js';

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
      if (typeof key === 'string' && key !== 'DB') {
        process.env[key] = env[key];
      }
    }

    // Set NODE_ENV from the environment
    process.env.NODE_ENV = env.ENVIRONMENT || 'production';

    // Pass the request to the Hono app
    return app.fetch(request, env, ctx);
  },
};
`;

// Worker entry code - a simplified version of the app that uses D1 database
const workerEntryCode = `
/**
 * Cloudflare Workers entry point
 * This file is separate from index.js to avoid importing SQLite3 in the Workers environment
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

// Create the Hono app
const app = new Hono();

// CORS middleware
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      // Check if localhost in development mode
      if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:')) {
        return origin;
      }
      return undefined;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
  })
);

// Security headers
app.use('*', secureHeaders());

// Logger middleware
app.use('*', honoLogger());

// Database middleware - handled directly by D1 binding
app.use('*', async (c, next) => {
  // Make D1 database available to handlers via c.get('db')
  c.set('db', c.env.DB);
  await next();
});

// API Routes
app.get('/', (c) => c.text('TrackNStick API - Cloudflare Workers Edition'));

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json(
    { 
      error: 'Internal Server Error', 
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong' 
    },
    500
  );
});

export default app;
`;

// Ensure the dist directory exists
if (!fs.existsSync('./dist')) {
  fs.mkdirSync('./dist');
}

// Write the files
fs.writeFileSync(path.join(__dirname, 'dist', 'worker.js'), workerCode);
fs.writeFileSync(path.join(__dirname, 'dist', 'worker-entry.js'), workerEntryCode);

console.log('Worker files created successfully.');


