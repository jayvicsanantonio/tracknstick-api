# Cloudflare Workers Deployment

This document outlines the steps taken to deploy the TrackNStick API to Cloudflare Workers.

## Overview

Cloudflare Workers provides an edge computing platform that allows running JavaScript code in Cloudflare's global network of data centers, resulting in faster response times and improved scalability.

## Deployment Architecture

The deployment architecture consists of:

1. **Cloudflare Workers**: Runs the Hono application in Cloudflare's edge network
2. **Cloudflare D1**: Provides a serverless SQL database (compatible with SQLite)
3. **Wrangler**: Cloudflare's CLI tool for deploying and managing Workers

## Adaptation Process

The following adaptations were made to prepare the application for Cloudflare Workers deployment:

### 1. Database Compatibility

- Created a database adapter that supports both SQLite3 (local) and D1 (production)
- The adapter provides a unified interface regardless of the environment:
  ```javascript
  // In Node.js environment (local)
  // Uses SQLite3 via the original dbUtils.js

  // In Workers environment (production)
  // Uses Cloudflare D1 via the DB binding
  ```

### 2. Logger Adaptation

- Modified the Winston logger to be compatible with Cloudflare Workers
- Removed file transport dependencies that are not available in Workers
- Used conditional logic to detect the environment and adjust logger behavior

### 3. Build Process

- Created a custom build script (`build-worker.cjs`) to generate Workers-compatible files
- Generated simplified versions of the application that exclude Node.js-specific code
- Replaced incompatible modules with Workers-compatible alternatives

### 4. Worker Entry Point

- Created a specialized entry point (`worker-entry.js`) for the Workers environment
- Simplified the application structure while maintaining core functionality
- Used direct D1 database access instead of SQLite

## Configuration

The `wrangler.toml` file was configured with:

```toml
name = "tracknstick-api"
main = "./dist/worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[build]
command = "npm install && node build-worker.cjs"

[vars]
NODE_ENV = "production"

[[d1_databases]]
binding = "DB"
database_name = "tracknstick-db"
database_id = "d828b4a9-4ae4-4af3-af29-be4c27ae42fc"
```

## Deployment Steps

1. **Install Dependencies**:
   ```bash
   npm install -D wrangler esbuild esbuild-node-externals
   ```

2. **Create Build Scripts**:
   - Created `build-worker.cjs` to generate Workers-compatible files
   - Created `worker-entry.js` for the Workers environment

3. **Configure Wrangler**:
   - Updated `wrangler.toml` with appropriate settings
   - Connected to D1 database

4. **Deploy**:
   ```bash
   npx wrangler deploy
   ```

## Key Files Added/Modified

- **New Files**:
  - `/dist/worker.js` - Main worker entry point
  - `/dist/worker-entry.js` - Simplified Hono app for Workers
  - `/src/utils/dbAdapter.js` - Database adapter for SQLite/D1
  - `/src/middlewares/dbMiddleware.js` - Middleware to add db to context
  - `/src/utils/worker-polyfills.js` - Polyfills for Workers environment
  - `/build-worker.cjs` - Build script for Workers deployment

- **Modified Files**:
  - `/src/utils/logger.js` - Made logger compatible with Workers
  - `/index.js` - Added database middleware
  - `/src/middlewares/errorHandler.js` - Updated for Hono compatibility
  - `/wrangler.toml` - Configured for deployment

## Deployment Result

The application has been successfully deployed to Cloudflare Workers and is accessible at:
https://tracknstick-api.hi-00e.workers.dev

## Benefits Achieved

- **Global Distribution**: Application now runs across Cloudflare's global network
- **Improved Latency**: Requests are processed closer to users
- **Better Scalability**: Automatically scales based on traffic
- **Cost Efficiency**: Serverless model only charges for actual usage
- **Simplified Operations**: No server management required

## Next Steps

- **Continuous Integration**: Set up GitHub Actions for automated deployments
- **Database Migrations**: Create a proper migration strategy for D1
- **Monitoring**: Add monitoring and alerting for the Workers deployment
- **Custom Domain**: Configure a custom domain for the API

## References

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Hono.js Documentation](https://hono.dev/)
