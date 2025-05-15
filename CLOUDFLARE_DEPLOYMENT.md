# TrackNStick API Cloudflare Deployment Guide

## Overview

This guide documents the process of deploying the TrackNStick API to Cloudflare Workers with D1 database integration. It covers the technical decisions, implementation details, configuration settings, and deployment steps.

## Decision-Making Process

### Why Cloudflare Workers?

Cloudflare Workers was chosen as the deployment platform for the following reasons:

1. **Global Distribution**: Workers run on Cloudflare's edge network, providing low-latency access worldwide
2. **Serverless Architecture**: No need to manage servers or infrastructure
3. **Cost-Effective**: The free tier includes generous limits (100,000 requests per day)
4. **D1 Database Integration**: Native SQLite-compatible database that scales with the application
5. **Built-in Security**: Automatic TLS and DDoS protection

### Implementation Approach

Two approaches were considered for deploying the Express.js application to Cloudflare Workers:

1. **Express.js Adaptation**: Convert the existing Express app to run on Cloudflare Workers
   - Pros: Reuse existing code and logic
   - Cons: Complex adaptation process, performance overhead, potential compatibility issues
2. **Direct Worker Implementation**: Reimplement the API directly for Cloudflare Workers
   - Pros: Better performance, simpler code, fewer compatibility issues
   - Cons: Need to reimplement API logic

We chose the **Direct Worker Implementation** approach because:

- The API is relatively simple and straightforward to reimplement
- Direct implementation avoids the complexity of adapting Express.js to the Worker environment
- Performance gains are significant without the Express.js adapter layer
- Native use of D1 is more efficient than adapting Knex queries

## Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)
- Cloudflare account
- SQLite database (local development)

## Detailed Setup Process

### 1. Wrangler CLI Installation and Authentication

Install the Wrangler CLI globally to manage Workers deployment:

```bash
npm install -g wrangler
```

Authentication with Cloudflare requires browser-based OAuth:

```bash
wrangler login
```

This command opens a browser window to authorize Wrangler to access your Cloudflare account. After authorization, Wrangler stores credentials locally for future commands.

### 2. D1 Database Creation

Create a D1 database to store application data:

```bash
wrangler d1 create tracknstick-db
```

This command outputs information about the created database, including the database ID that must be used in configuration files.

### 3. Wrangler Configuration

Create or update a `wrangler.toml` file with the following configuration:

```toml
# Configuration file for Cloudflare Workers deployment
# Defines settings for the TrackNStick API project

name = "tracknstick-api"
main = "worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[build]
command = "npm install"

[vars]
NODE_ENV = "production"

[[d1_databases]]
binding = "DB" # Will be available in your Worker as env.DB
database_name = "tracknstick-db"
database_id = "<your-database-id>" # Replace with your actual D1 database ID

[site]
bucket = "./public"
```

Key configuration settings:

- `name`: The name of your Worker (affects the deployment URL)
- `main`: The entry point for your Worker code
- `compatibility_date`: Required field for Workers, ensures compatibility with specific features
- `compatibility_flags`: Enables Node.js compatibility for certain features
- `[vars]`: Environment variables available to your Worker
- `[[d1_databases]]`: Configuration for D1 database integration
- `[site]`: Static asset configuration (required even if not used)

### 4. Public Directory Creation

Cloudflare expects a `public` directory even if your API doesn't serve static assets:

```bash
mkdir -p public
```

This directory can remain empty but must exist to avoid deployment errors.

## Worker Implementation Details

### API Design Philosophy

The Worker implementation follows these principles:

1. Direct use of Cloudflare's API without unnecessary abstraction layers
2. Modular code organization for maintainability
3. Clean separation of concerns (routing, database operations, error handling)
4. Proper CORS handling for cross-origin requests
5. RESTful API design with appropriate HTTP methods and status codes

### Worker Structure

The `worker.js` file implements the following components:

1. **Database Operations**: Methods to interact with the D1 database
   - Organized as a `HabitsDB` object with CRUD methods
   - Direct use of D1's SQL interface for efficiency
2. **API Route Handlers**: Functions to handle specific API endpoints
   - Separate handler for habits-related routes
   - Proper parameter extraction from URLs
3. **Request Processing**: Main handler for incoming requests
   - URL parsing and routing
   - CORS headers configuration
   - Error handling and response formatting

The code avoids the complexity of the Express middleware stack while maintaining clear organization.

### CORS Configuration

CORS headers are set up to allow cross-origin requests:

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

The Worker handles OPTIONS preflight requests with a 204 status code, which is important for browsers making cross-origin requests.

## Database Migration Process

### Schema Export

Extract the schema from the SQLite database:

```bash
sqlite3 tracknstick.db .schema > schema.sql
```

This command creates a SQL file containing all table definitions and indexes.

### Schema Cleanup

Remove SQLite-specific statements from the schema file (like `sqlite_sequence` tables), as these can cause errors when imported into D1.

### Schema Import

Import the cleaned schema to D1:

```bash
wrangler d1 execute tracknstick-db --file=schema.sql --remote
```

This command executes the SQL statements from the schema file against the remote D1 database.

### Data Migration (Optional)

For migrating existing data:

1. Export data from SQLite:

   ```bash
   sqlite3 tracknstick.db .dump > data.sql
   ```

2. Sanitize the dump file to remove SQLite-specific statements and ensure compatibility with D1

3. Import data to D1:
   ```bash
   wrangler d1 execute tracknstick-db --file=data.sql --remote
   ```

## Deployment Steps

### 1. Final Review of Configuration

Double-check the `wrangler.toml` configuration to ensure:

- Correct database ID is specified
- Appropriate compatibility flags are set
- Environment variables are configured
- Main file is set to `worker.js`

### 2. Worker Deployment

Deploy the Worker using:

```bash
wrangler deploy
```

This command:

1. Runs the build command (npm install)
2. Packages your code and assets
3. Uploads them to Cloudflare
4. Provides a deployment URL

The deployment URL follows the pattern: `https://<worker-name>.<account-subdomain>.workers.dev`

### 3. Database Binding Verification

After deployment, verify that the D1 database is correctly bound to your Worker by checking the deployment output. You should see information about the D1 database binding.

## Testing and Verification

### Endpoint Testing

Test the deployed API endpoints using cURL or a similar tool:

```bash
# Get all habits
curl https://tracknstick-api.<your-subdomain>.workers.dev/api/v1/habits

# Create a new habit
curl -X POST https://tracknstick-api.<your-subdomain>.workers.dev/api/v1/habits \
  -H "Content-Type: application/json" \
  -d '{"name":"Daily Meditation","icon":"🧘‍♂️","frequency":"daily","userId":1}'

# Get a specific habit
curl https://tracknstick-api.<your-subdomain>.workers.dev/api/v1/habits/1

# Update a habit
curl -X PUT https://tracknstick-api.<your-subdomain>.workers.dev/api/v1/habits/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Evening Meditation"}'

# Delete a habit
curl -X DELETE https://tracknstick-api.<your-subdomain>.workers.dev/api/v1/habits/1
```

### Foreign Key Constraints

Note that if your database has foreign key constraints, you must first create the records that other tables depend on. For example, before creating habits, you must ensure a user exists:

```bash
wrangler d1 execute tracknstick-db --command="INSERT INTO users (clerk_user_id) VALUES ('test_user_id');" --remote
```

## Advanced Configuration

### Environment Variables

You can set additional environment variables for different environments:

```toml
[vars]
NODE_ENV = "production"
CLERK_API_KEY = "your_clerk_api_key"
```

For environment-specific variables:

```toml
[env.staging]
vars = { NODE_ENV = "staging" }

[env.production]
vars = { NODE_ENV = "production" }
```

Deploy to a specific environment using:

```bash
wrangler deploy --env production
```

### Custom Domain Configuration

To use a custom domain instead of the workers.dev subdomain:

1. Add a DNS record pointing to your Cloudflare Worker
2. Configure the custom domain in the Cloudflare Dashboard
3. Add a route in the `wrangler.toml` file:

```toml
routes = [
  { pattern = "api.yourdomain.com", custom_domain = true }
]
```

## Monitoring and Maintenance

### Logs and Analytics

Access logs and analytics via the Cloudflare Dashboard to monitor:

- Request volume and response times
- Error rates and patterns
- CPU and memory usage
- Geographic distribution of requests

### Updates and Rollbacks

To update your Worker, simply run `wrangler deploy` with the updated code.

To roll back to a previous version:

1. Go to the Cloudflare Dashboard
2. Navigate to Workers & Pages > tracknstick-api
3. Select the "Versions" tab
4. Choose the version to roll back to and click "Rollback"

## Troubleshooting

### Common Issues and Solutions

- **Connection issues**: Ensure your CORS settings are properly configured for your frontend application.

  - Check browser console for CORS errors
  - Verify the Access-Control-Allow-Origin header matches your frontend domain

- **Database errors**: If database operations fail, check the following:

  - The D1 database is correctly set up and migrations were successful
  - SQL queries are compatible with D1's SQLite version
  - Foreign key constraints are satisfied

- **Rate limiting**: If you see 429 Too Many Requests errors:

  - Check if you're hitting Cloudflare Workers free tier limits (100,000 requests per day)
  - Consider upgrading to a paid plan if needed

- **Node.js compatibility**: If native Node.js modules cause issues:
  - Ensure the `nodejs_compat` flag is set in your `wrangler.toml`
  - Update compatibility_date to a recent value

### Debugging Strategies

1. **Local Development**:

   ```bash
   wrangler dev
   ```

   This command runs your Worker locally for easier debugging.

2. **Database Query Testing**:

   ```bash
   wrangler d1 execute tracknstick-db --command="SELECT * FROM habits" --remote
   ```

   Directly execute SQL to verify database contents.

3. **Response Debugging**:
   Add logging statements in your code and check the logs in the Cloudflare Dashboard.

## Optimization Strategies

### Performance Optimization

1. **Minimize Response Size**: Only return necessary data fields
2. **Use Efficient Queries**: Optimize database operations and avoid unnecessary queries
3. **Cache Frequently Used Data**: Consider using Cloudflare's KV store for cacheable data
4. **Reduce Worker Size**: Keep your worker code small and efficient

### Cost Optimization

1. **Monitor Usage**: Keep track of request volumes to stay within free tier limits
2. **Optimize Query Patterns**: Reduce expensive database operations
3. **Consider Caching**: Use caching to reduce database access

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare D1 SQL Reference](https://developers.cloudflare.com/d1/reference/sql/)
