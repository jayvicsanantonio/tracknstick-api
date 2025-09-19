# Repository Guidelines

## Project Structure & Module Organization
Tracknstick API targets Cloudflare Workers with Hono routing. The entry point `src/index.ts` wires routes from `src/routes`, controllers in `src/controllers`, and service logic in `src/services`. Configuration helpers live in `src/config`, reusable middlewares in `src/middlewares`, and database repositories in `src/repositories`. Integration tests sit under `src/tests/integration`, while shared types, validators, and utilities are in `src/types`, `src/validators`, and `src/utils`. Build artifacts land in `dist/`, database migrations are stored in `migrations/`, and `scripts/db.js` manages local and remote setup tasks.

## Build, Test, and Development Commands
Use `pnpm` (Node >= 20.12). Run `pnpm dev` for the hosted Wrangler dev server or `pnpm dev:local` when you need Miniflare without tunneling. Type-check and bundle with `pnpm build`; deployments go through `pnpm deploy`. Format and lint before pushing (`pnpm format`, `pnpm lint`); auto-fix lint issues with `pnpm lint:fix`. Database helpers include `pnpm db:setup`, `pnpm db:migrate`, and `pnpm db:seed`, each accepting `:remote` variants when targeting production resources.

## Coding Style & Naming Conventions
The codebase is TypeScript-first with strict ESLint (Airbnb base + TypeScript rules) and Prettier enforcement. Keep two-space indentation, 80-character lines, semicolons, and single quotes. Name files using `kebab-case` and classes or types in `PascalCase`; functions, variables, and route handlers stay camelCase. Prefer named exports and keep mocks beside the modules they support.

## Testing Guidelines
Vitest with the Miniflare environment powers integration coverage. Place specs alongside air-facing modules using the `*.test.ts` suffix (e.g., `src/tests/integration/health.test.ts`). Run `pnpm test` for the suite, `pnpm test:watch` while iterating, and `pnpm test:coverage` before opening a pull request. Add shared fixtures through `src/tests/setup.ts` to reuse bindings or auth helpers.

## Commit & Pull Request Guidelines
Follow the observed Conventional Commit style (`feat:`, `fix:`, `docs:`, `chore:`, `test:`). Keep subject lines under 72 characters and favor incremental commits over squashing late. Pull requests should summarize behavior changes, link to relevant issues or spec documents, note new environment variables, and show verification—test output, Wrangler preview URLs, or migration notes—so reviewers can reproduce results quickly.

## Security & Configuration Notes
Never commit credentials; rely on `.dev.vars` for local secrets and `wrangler secret` for remote stores. Validate that new endpoints enforce existing Clerk authentication middleware. When touching migrations or repository code, document the update in `project-specs/` if it affects data retention or access policies.

