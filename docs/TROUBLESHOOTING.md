# Troubleshooting Guide

This document contains solutions for common issues you might encounter when working with the TrackNStick API, built with Hono.js on Cloudflare Workers and D1.

## Common Wrangler & Deployment Issues

### Error: "✘ [ERROR] Could not resolve "path/to/module"
**Problem:** Wrangler failed to build the Worker because it couldn't find a module.
**Solutions:**
1.  **Check Import Path:** Ensure the import path is correct and the file exists.
2.  **Dependencies:** If it's an npm package, ensure it's installed: `pnpm install <package_name>`.
3.  **TypeScript Configuration:** Verify `tsconfig.json` paths and `baseUrl` if using path aliases.
4.  **File Extension:** For local modules, ensure you're correctly referencing `.ts` or `.js` files as per your `tsconfig.json` and module resolution strategy. Sometimes, explicitly adding `.js` to relative imports is needed for Node.js ESM compatibility targeted by Workers.

### Error: "TypeError: globalThis.MY_VARIABLE is undefined" (or similar for bindings)
**Problem:** A binding (D1, KV, Secret, Environment Variable) defined in `wrangler.toml` is not accessible in the Worker code (e.g., `c.env.DB`).
**Solutions:**
1.  **`wrangler.toml` Configuration:**
    *   Verify the binding name in `wrangler.toml` matches the name used in your code (e.g., `binding = "DB"` means you access it via `c.env.DB`).
    *   Ensure the D1 database, KV namespace, etc., exists in your Cloudflare account and the `database_id` or `namespace_id` is correct.
2.  **Local Development (`wrangler dev --local`):**
    *   For D1: Ensure you have run migrations locally: `pnpm run db:migrate:local` (or the equivalent `wrangler d1 migrations apply ... --local`).
    *   For KV: Use `wrangler kv:namespace create <NAMESPACE_NAME> --preview` and `wrangler kv:key put ... --preview-id=...` or populate it locally if Wrangler supports local KV emulation for your version.
    *   For Secrets/Vars: Ensure they are in your `.dev.vars` file for local testing.
3.  **Deployed Worker:**
    *   For D1/KV: Ensure the bindings in `wrangler.toml` point to the correct production resources.
    *   For Secrets: Ensure secrets are set via `wrangler secret put <SECRET_NAME>` or in the Cloudflare dashboard for the specific environment.
    *   For Environment Variables: Ensure they are defined in `[vars]` or `[env.production.vars]` in `wrangler.toml`.

### Changes Not Reflected After Deployment
**Problem:** You've deployed new code with `pnpm run deploy` (or `wrangler deploy`), but the live API still serves old behavior.
**Solutions:**
1.  **Build Step:** Ensure your deployment script includes the build step (`pnpm run build` or `tsc`) before `wrangler deploy`. The `predeploy` script in `package.json` should handle this.
2.  **Cache Busting:** Cloudflare might cache responses. Check cache settings. For Workers, deployments are usually immediate, but client-side or intermediate caches could be an issue.
3.  **Correct Environment:** If using multiple environments (e.g., `staging`, `production`), ensure you deployed to the intended environment. `wrangler deploy --env <environment_name>`.
4.  **Wrangler Output:** Check the output of `wrangler deploy` for any errors or warnings. Confirm the "Uploaded <WORKER_NAME>" message.
5.  **Worker Version:** In the Cloudflare dashboard, check the deployed version of your Worker to ensure the latest deployment is active.

## D1 Database Issues

### Error: "D1_ERROR: no such table: <table_name>" or "D1_ERROR: no such column: <column_name>"
**Problem:** The D1 database schema is out of sync with what the application code expects. This usually means migrations haven't been applied or are incorrect.
**Solutions:**
1.  **Apply Migrations:**
    *   **Local:** `pnpm run db:migrate:local` (e.g., `wrangler d1 migrations apply <YOUR_DB_NAME> --local`)
    *   **Remote (Preview/Production):** `pnpm run db:migrate` (e.g., `wrangler d1 migrations apply <YOUR_DB_NAME>`)
2.  **Check Migration Files:** Review your SQL migration files in the `migrations/` directory for correctness. Ensure they create the necessary tables and columns.
3.  **Migration Order:** Ensure migration files are named with sequential prefixes (e.g., `0000_...`, `0001_...`) so they apply in the correct order.
4.  **Local D1 State:** If using `wrangler dev --local`, your D1 data is stored in `.wrangler/v3/d1/<DB_UUID>/db.sqlite`. Sometimes, deleting this local file (after backing up if needed) and re-running migrations can resolve persistent local schema issues.
5.  **Remote D1 State:** For remote, ensure migrations were applied to the correct database instance specified in `wrangler.toml`.

### Error: "FOREIGN KEY constraint failed" (or similar data integrity issues)
**Problem:** An `INSERT` or `UPDATE` operation violates a foreign key constraint (e.g., inserting a `habit` with a `user_id` that doesn't exist in the `users` table).
**Solutions:**
1.  **Application Logic:** Verify that your application logic correctly creates parent records before child records.
2.  **D1 Enforcement:** While D1 parses `FOREIGN KEY` syntax, actual enforcement might vary or need to be explicitly enabled in table definitions if supported. As of recent updates, D1 *does* support foreign key constraints. Ensure your `CREATE TABLE` statements correctly define them.
3.  **Data Consistency:** Check the data you're trying to insert/update. The referenced key must exist in the parent table.

### Old Schema Issues (e.g., "table habits has no column named frequency" if `frequency` used to be separate fields)
**Problem:** This indicates the database is on an older schema version before `frequency` was consolidated into a JSON object, or `longest_streak`, `total_completions`, `last_completed`, `start_date`, `end_date` were added.
**Solution:**
1.  **Apply All Migrations:** Ensure all migrations, especially those that refactor the `habits` table (like `0002_recreate_habits_table.sql` and subsequent timestamp/column additions), have been applied:
    ```bash
    # For local D1
    pnpm run db:migrate:local
    # For remote D1
    pnpm run db:migrate
    ```
2.  **Data Migration Scripts:** If you had data in an older schema, you might need to run specific data migration scripts (like the one mentioned `db:migrate:frequency` for old frequency fields, if applicable to your current state). However, for a fresh setup, only schema migrations are needed.

## Authentication Issues (Clerk & Hono)

### Error: "Unauthorized", "Bearer token missing or invalid", or "Token verification failed" (401 errors)
**Problem:** The API request lacks a valid Clerk JWT, or the token verification failed.
**Solutions:**
1.  **Frontend:**
    *   Ensure the frontend application correctly obtains a JWT from Clerk using its SDK (e.g., `await getToken()` from `@clerk/clerk-react`).
    *   Verify the token is included in the `Authorization` header of API requests, formatted as `Bearer <token>`.
2.  **Backend (`clerkMiddleware.ts` or similar):**
    *   **Clerk Configuration:** Double-check that `CLERK_SECRET_KEY` (or relevant JWKS URL for newer Clerk SDKs like `@clerk/backend`) is correctly set as a secret for your deployed Worker and in `.dev.vars` for local development.
    *   **Middleware Logic:** Ensure the middleware correctly extracts the token from the header.
    *   **Clock Skew:** Ensure your server/worker environment has a reasonably synchronized clock, as JWT validation is time-sensitive. Cloudflare Workers generally handle this.
    *   **Clerk Instance Initialization:** Verify Clerk SDK (e.g., `ClerkBackendAPI` or `createClerkClient`) is correctly initialized with the necessary keys/configuration.
3.  **Token Expiration:** Short-lived JWTs expire. Clerk's frontend SDKs usually handle token refresh. If issues persist, ensure this refresh mechanism is working.

### Error: `c.get('userId')` is undefined after auth middleware
**Problem:** The authentication middleware successfully ran but didn't set the `userId` in Hono's context.
**Solutions:**
1.  **Middleware Logic:** In your Clerk auth middleware, ensure you are using `c.set('userId', authenticatedUserId)` after successful token verification.
2.  **Middleware Order:** Confirm the auth middleware runs *before* the route handlers that try to access `c.get('userId')`.

## Hono.js Specific Issues

### Error: "Cannot find module './<some-path>' or its corresponding type declarations" (in Hono routes/handlers)
**Problem:** TypeScript or the runtime cannot resolve an import.
**Solutions:**
1.  **Relative Paths:** Double-check relative paths.
2.  **`tsconfig.json`:** Ensure `paths` and `baseUrl` are correctly configured if using path aliases.
3.  **Build Step:** Make sure your build process (`tsc`) is running correctly and outputting files to the expected directory (usually `dist/`). `wrangler deploy` typically deploys the `dist/index.js` file.

### Unexpected Routing / 404 Not Found for Defined Routes
**Problem:** A route that seems correctly defined in Hono returns a 404.
**Solutions:**
1.  **Base Path:** If using `app.route('/basepath', subApp)` in `index.ts`, ensure your request URL includes the base path.
2.  **Parameter Names:** For routes with parameters (e.g., `/habits/:id`), ensure the parameter name in the route definition matches how it's accessed (e.g., `c.req.param('id')`).
3.  **Middleware Interference:** A middleware might be inadvertently ending the request or not calling `await next()`.
4.  **Order of Routes:** More specific routes should generally be defined before more generic ones if there's a potential overlap (though Hono's routing is usually robust).

## General Debugging Tips
*   **`wrangler tail`:** Your first go-to for live logs from your Worker (local or remote).
*   **`console.log`:** Use liberally during development to inspect variables, request/response objects, and context. Remove or disable for production unless for essential logging.
*   **Simplify:** Temporarily comment out parts of your code (middleware, complex logic) to isolate the issue.
*   **Check `package.json` Scripts:** Understand what commands like `pnpm run dev` or `pnpm run db:migrate:local` are actually executing.
*   **Read Error Messages Carefully:** They often contain specific clues.
*   **Cloudflare Dashboard:** Check Worker logs and D1 query insights for deployed issues.
