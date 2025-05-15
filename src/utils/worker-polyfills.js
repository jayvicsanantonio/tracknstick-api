/**
 * Polyfills for Cloudflare Workers environment
 * This file is injected into the worker bundle
 */

// Add process polyfill for compatibility
if (typeof globalThis.process === 'undefined') {
  globalThis.process = {
    env: {
      NODE_ENV: 'production'
    }
  };
}

// Mock SQLite3 when directly imported
const mockSQLite3 = {
  verbose: () => ({
    Database: function() {
      throw new Error('SQLite3 is not available in Cloudflare Workers');
    }
  })
};

// Export the mock to be used in the injected bundle
export { mockSQLite3 };

// Also make it available via CommonJS for the build process
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports.sqlite3 = mockSQLite3;
}
