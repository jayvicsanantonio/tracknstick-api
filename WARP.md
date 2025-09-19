# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository: TrackNStick API (Cloudflare Workers + Hono + TypeScript)

Sections
- Common commands (dev, build, test, lint/format, DB ops, deploy, perf tests)
- Environment and secrets
- High-level architecture and flow
- Important rules and notes pulled from README, CLAUDE, and project files

Common commands
- Install dependencies
  - pnpm install
- Development server (Cloudflare Workers via Wrangler)
  - pnpm run dev            # uses wrangler dev (port 3000)
  - pnpm run dev:local      # wrangler dev --local (uses local D1)
- Build and deploy
  - pnpm run build          # tsc -> dist/
  - pnpm run deploy         # wrangler deploy (predeploy builds)
- Lint/format
  - pnpm run lint
  - pnpm run lint:fix
  - pnpm run format
- Tests (Vitest + Miniflare)
  - pnpm run test           # run all tests
  - pnpm run test:watch     # watch mode
  - pnpm run test:coverage  # coverage (text, json, html)
  - Run a single file: pnpm run test -- src/utils/dateUtils.test.ts
  - Run a single test by name: pnpm run test -- -t "should compute start/end"
- Database (Cloudflare D1 via scripts/db.js; add --remote to target production)
  - pnpm run db:setup           # apply migrations/schema.sql
  - pnpm run db:migrate         # same as setup (single-schema approach)
  - pnpm run db:seed            # seed (creates migrations/seed.sql if missing)
  - pnpm run db:reset           # destructive: drop tables then re-apply schema
  - pnpm run db:query "SELECT COUNT(*) FROM users"
  - Remote variants: db:setup:remote | db:migrate:remote | db:seed:remote | db:reset:remote | db:query:remote "SQL"
- Performance testing (k6)
  - k6 run scripts/performance-test.js
  - Env vars: API_URL, AUTH_TOKEN (e.g., API_URL=https://api.tracknstick.com AUTH_TOKEN={{AUTH_TOKEN}} k6 run scripts/performance-test.js)

Environment and secrets
- Node 20.12.2+ and pnpm 8+ (enforced via engines; .node-version present)
- Wrangler is required (Cloudflare Workers tooling)
- D1 binding is configured in wrangler.toml as DB (database_name: tracknstick-db)
- Secrets (set via Wrangler, do not commit secrets):
  - wrangler secret put CLERK_SECRET_KEY
  - Optionally set CLERK_PUBLISHABLE_KEY if you use Clerk’s request authentication path that requires it
- Dev server runs on http://localhost:3000 (configured in wrangler.toml [dev].port)

High-level architecture and flow
- Entry point: src/index.ts
  - Creates Hono app with typed Bindings { ENVIRONMENT, CLERK_SECRET_KEY, DB }
  - Middleware order (security-aware):
    1) requestLogger() – adds requestId and request-scoped logger
    2) initBindings() – binding initialization hook
    3) CORS via getSecurityConfig() wrapped in withFailureHandling("cors_middleware")
    4) Security headers via getSecurityConfig() wrapped in withFailureHandling("security_headers")
    5) Route mounting
       - /api/v1/habits → src/routes/habits.ts
       - /api/v1/progress → src/routes/progress.ts
       - /api/v1/achievements → src/routes/achievements.ts
       - /health → src/routes/health.ts (no auth required)
    6) notFound handler with structured JSON error
    7) Global onError: errorHandlerEnhanced (environment-aware error responses)
- Authentication
  - Clerk JWT verification in src/middlewares/clerkMiddleware.ts (createClerkClient + authenticateRequest)
  - On success, sets c.set('auth') with userId, claims, and security metadata; many routes require this
  - Achievements initialize endpoint is intentionally unauthenticated for setup
- Validation
  - Zod schemas in src/validators/** used through validateRequest(target: 'json' | 'query' | 'param')
  - Validated payloads are stored on context as validated_json, validated_query, validated_param
- Security configuration
  - src/config/security.ts exposes getSecurityConfig() based on environment detection (ENVIRONMENT or NODE_ENV)
  - Controls CORS origins/methods/headers, error detail disclosure, and toggles for security headers
  - Rate limiting: a production-grade middleware (src/middlewares/rateLimitEnhanced.ts with createRateLimit) exists and is wrapped by withFailureHandling, but is currently commented out in src/index.ts. Enable if needed for deployment hardening.
- Error handling
  - src/middlewares/errorHandlerEnhanced.ts formats errors per environment, maps BaseError subclasses (ValidationError, UnauthorizedError, ForbiddenError, RateLimitError, NotFoundError), and sanitizes details in production
  - Base error types live in src/utils/errors.ts
- Logging
  - src/utils/logger.ts provides a small edge-compatible logger with child() support; requestLogger() binds a per-request logger on c.set('logger')
- Routing layers and responsibilities (layered design)
  - Routes (src/routes/**): Bind Clerk auth, validation middleware, and map to controllers
  - Controllers (src/controllers/**): Thin; pull validated inputs from context, call services, shape responses
  - Services (src/services/**): Business logic orchestration, timezone-aware calculations, batching and composition
  - Repositories (src/repositories/**): D1 SQL access; include user bootstrap ensureUserExists and soft delete patterns
- Data model (Cloudflare D1 / SQLite) — see migrations/schema.sql
  - users: clerk_user_id is the external key used across tables
  - habits: frequency is stored as a comma-separated list of day codes (e.g., "Mon,Wed,Fri"); soft delete via deleted_at
  - trackers: habit completion records; UNIQUE(habit_id, timestamp); soft delete via deleted_at
  - achievements, user_achievements: definitions and awarded achievements with progress_data JSON
- Timezone and streak logic
  - src/utils/dateUtils.ts provides getLocaleStartEnd, getDateInTimeZone, isValidTimeZone, etc. All calculations validate IANA time zones
  - src/utils/streakUtils.ts implements:
    - calculateDailyStreak and calculateNonDailyStreak (frequency-aware)
    - calculateLongestStreakFromTrackers and helpers
  - User-level streak endpoints (progress) are based on 100% completion days (see tracker.repository getUserProgressHistory/getUserStreaks)
- Progress and analytics
  - Progress history and streaks are computed via SQL (recursive CTE date generation + day-of-week matching) in tracker.repository.ts
  - Services in src/services/progress.service.ts aggregate history and streaks in parallel for efficiency
- Health endpoints
  - /health returns environment and timestamp
  - /health/db executes a simple SELECT to verify DB connectivity and response times
  - /health/details adds version info and DB status

Important rules and notes from existing docs
- README highlights
  - Dev scripts and commands above are authoritative; deploy via Wrangler; tests use Vitest; code quality via ESLint + Prettier
  - API routes live under /api/v1/* and require Authorization: Bearer <JWT> (Clerk) except /health and achievements initialize
- CLAUDE.md (accurate and current to this codebase)
  - Layered architecture: Routes → Controllers → Services → Repositories → Database
  - Middleware chain: Clerk auth → validation → controller → enhanced error handling
  - Timezone-aware design and soft deletes are foundational
  - Key files to reference: src/index.ts, migrations/schema.sql, wrangler.toml, src/types, and validators
- Cursor rules in .cursor/rules/standards.mdc
  - Note: portions appear legacy (referencing Express/Knex/helmet). Keep the generally applicable parts: layered separation (controllers/services/repositories), RESTful endpoints, naming conventions, and code style enforced by ESLint/Prettier. Use Hono + Cloudflare Workers conventions present in this repo instead of Express.

Gotchas and workflow tips
- Most routes are protected by Clerk; ensure CLERK_SECRET_KEY is set in your environment via Wrangler secrets before testing endpoints locally
- Frequency fields use day abbreviations (Mon, Tue, ...). Repositories and services depend on this exact convention.
- manageTracker toggles completion: if a tracker exists for a given date in the user’s timezone, it deletes it; otherwise inserts a new tracker, then updates habit streak metrics
- The production-grade rate limiter exists but is not wired by default; evaluate enabling with withRateLimitFailureHandling(createRateLimit()) in src/index.ts for hardened environments
- TypeScript module settings are NodeNext with ESM; follow existing import patterns and ESLint rules
