# Monorepo migration plan

Combining `tracknstick.com` (web) and `tracknstick-api` (API) into a single
repository, `jayvicsanantonio/tracknstick`.

This document is the plan of record. It is committed to both repositories so
either one can be read on its own before the merge happens.

---

## 1. Why

The two repositories describe the same eleven HTTP endpoints twice, by hand,
and nothing checks that the two descriptions agree. They had already drifted:

| Contract                                         | Server sends            | Client declares               |
| ------------------------------------------------ | ----------------------- | ----------------------------- |
| `PUT/DELETE /habits/:id`                         | `{ message }`           | `{ message, habitId }`        |
| `GET /habits/:id/stats`                          | omitted `lastCompleted` | `string \| null`              |
| `POST /achievements/check`                       | 7 fields                | full `Achievement`            |
| `GET /achievements/stats` → `recentAchievements` | no `type`               | `type: string` required       |
| Achievement day counts                           | measured in UTC         | rendered in the reader's zone |

Every row is a place where a rename on one side compiles cleanly on both and
fails at runtime. A monorepo does not fix that by itself — a shared,
executable contract does, and a monorepo is what makes one cheap to have.

Secondary benefits: one `pnpm install`, one lockfile, atomic cross-stack
commits, and one CI definition instead of two that have already diverged (the
API's runs no linter; the web repo's does).

---

## 2. Target layout

```
tracknstick/
├── apps/
│   ├── web/                 # from tracknstick.com
│   └── api/                 # from tracknstick-api
├── packages/
│   ├── contracts/           # Zod schemas — the single source of truth
│   └── tsconfig/            # shared compiler bases
├── docs/                    # merged from both repos
├── package.json             # workspace root; scripts only, no deps
├── pnpm-workspace.yaml
├── turbo.json
├── .node-version
├── .npmrc
├── .prettierrc
├── eslint.config.js         # flat config, one file, per-app overrides
└── .github/workflows/
    ├── ci.yml               # path-filtered per app
    ├── deploy-api.yml
    └── deploy-web.yml
```

### Why `apps/` + `packages/`

It is the layout every JS monorepo tool assumes, so `pnpm --filter`,
Turborepo's task graph and Renovate's grouping all work without
configuration. `packages/` is where anything shared has to live, and the
contracts package is the reason this migration is worth doing at all.

---

## 3. The contracts package

This is the substance of the migration. Everything else is file moving.

### Shape

```
packages/contracts/src/
├── primitives.ts      # DateKey, IsoInstant, TimeZone, Frequency, HabitId
├── habits.ts
├── progress.ts
├── achievements.ts
├── chat.ts
├── errors.ts          # the { error: { message, code } } envelope
└── index.ts
```

Zod schemas, not bare TypeScript types. A type erases at compile time and so
can only describe what the client _believes_; a schema can be run, so it can
also decide what the server _sends_.

### `primitives.ts` carries the invariant that was broken

```ts
import { z } from 'zod';

/** A calendar date as it reads in some timezone. Never an instant. */
export const DateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** A moment in time. Always UTC on the wire. */
export const IsoInstant = z.string().datetime();

/**
 * An IANA zone name. Required by every endpoint whose answer is counted in
 * days: which day a completion lands on is a property of the reader, not of
 * the database.
 */
export const TimeZone = z.string().refine((tz) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}, 'Not an IANA timezone');

export const Frequency = z.enum([
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
]);
```

`DateKey` and `IsoInstant` being distinct types is the point. Confusing them
is what produced three of the bugs listed in §7: `new Date('2026-08-01')`
reads a date key as an instant, and an instant truncated with `.split('T')[0]`
becomes a date key in the wrong zone.

### Each endpoint declares both directions

```ts
// progress.ts
export const HistoryQuery = z.object({
  startDate: DateKey.optional(),
  endDate: DateKey.optional(),
  timeZone: TimeZone.default('UTC'),
});

export const DayCompletion = z.object({
  date: DateKey,
  completionRate: z.number().int().min(0).max(100),
});

export const HistoryResponse = z.object({
  history: z.array(DayCompletion),
});

export type HistoryQuery = z.infer<typeof HistoryQuery>;
export type HistoryResponse = z.infer<typeof HistoryResponse>;
```

### How each side uses it

**API** — the request half is already how this codebase works; only the
import moves:

```ts
app.get(
  '/history',
  validateRequest(HistoryQuery, 'query'),
  progressController.getProgressHistory
);
```

The response half is new, and is what actually stops drift:

```ts
// apps/api/src/utils/respond.ts
export const respond = <S extends z.ZodTypeAny>(
  c: Context,
  schema: S,
  body: z.input<S>
) =>
  c.json(
    // Parsed outside production so a shape error is a failing test, not a
    // client-side surprise; skipped in production so a hot path pays nothing.
    c.env.ENVIRONMENT === 'production' ? body : schema.parse(body)
  );
```

**Web** — types are inferred, never restated:

```ts
import { HistoryResponse } from '@tracknstick/contracts';

export const fetchProgressHistory = async (...) => {
  const res = await axiosInstance.get('/api/v1/progress/history', { params });
  return HistoryResponse.parse(res.data).history;
};
```

### The test that makes it binding

```ts
// packages/contracts/src/__tests__/coverage.test.ts
it('declares a schema for every route the API registers', () => {
  for (const route of app.routes) {
    expect(CONTRACTS[`${route.method} ${route.path}`]).toBeDefined();
  }
});
```

Without this, a new endpoint added without a contract is simply invisible, and
the package slowly stops being the source of truth. With it, adding a route
and forgetting the contract fails CI.

### Migration order for the contracts

Do not convert all eleven endpoints at once. One feature per PR, each
independently revertible:

1. `progress` — smallest surface, and the three endpoints already share one
   response shape.
2. `achievements` — largest drift, so the largest payoff.
3. `habits` — most call sites.
4. `chat` — streaming; the response is not JSON, so only the request half
   applies.

---

## 4. Merging the two histories

Both repositories are small (167 and 136 commits; 3.6 MB and 6.0 MB of git
objects), so any approach is affordable. Two are worth considering:

|                                           | `git subtree add`              | `git filter-repo --to-subdirectory-filter` |
| ----------------------------------------- | ------------------------------ | ------------------------------------------ |
| Commit SHAs                               | unchanged                      | rewritten                                  |
| `git log apps/web/src/x` before the merge | needs `--follow`, often misses | works                                      |
| `git blame` across the merge              | breaks at the boundary         | continuous                                 |

**Use `filter-repo`.** Rewritten SHAs are the only cost, and the two source
repositories stay in place as archives, so any SHA quoted in an old issue or
PR still resolves there.

```bash
# 1. Prepare each source with its paths already moved.
git clone https://github.com/jayvicsanantonio/tracknstick.com web-src
cd web-src && git filter-repo --to-subdirectory-filter apps/web && cd ..

git clone https://github.com/jayvicsanantonio/tracknstick-api api-src
cd api-src && git filter-repo --to-subdirectory-filter apps/api && cd ..

# 2. Build the monorepo from an empty root commit.
mkdir tracknstick && cd tracknstick && git init -b main
git commit --allow-empty -m "Initial commit"

git remote add web ../web-src && git fetch web
git merge --allow-unrelated-histories web/main -m "Merge the web client"

git remote add api ../api-src && git fetch api
git merge --allow-unrelated-histories api/main -m "Merge the API"

git remote remove web && git remote remove api
```

### One thing to settle before merging

`apps/api` carries `Atomic Habits.pdf` — 6.0 MB, and the reason the API's git
directory is larger than the web client's despite having fewer commits. It is
the RAG source for the chat feature and is already ingested into
`data/chunks.json`.

Two options, in order of preference:

- **Strip it from history during the filter-repo pass**
  (`--invert-paths --path 'Atomic Habits.pdf'`). It is a copyrighted book in a
  public repository, which is the stronger argument, and every future clone
  gets 6 MB smaller. The ingestion script keeps working if the PDF is supplied
  locally at run time.
- **Leave it.** 6 MB is not fatal. Choose this only if reproducing the
  ingestion from the repo alone matters more than the above.

This decision has to be made _before_ the merge — removing it afterwards means
a second history rewrite.

---

## 5. Workspace configuration

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'packages/*'

# Carried over from both repositories: these compile native binaries or
# install git hooks, and pnpm 10 requires each to be answered explicitly.
allowBuilds:
  '@clerk/shared': true
  '@tailwindcss/oxide': true
  esbuild: true
  husky: true
  sqlite3: true
  workerd: true
  sharp: true
```

### Conflicts to resolve during the merge

| Setting          | web                                                       | api                                 | Resolution                                                   |
| ---------------- | --------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| `.node-version`  | `22`                                                      | `lts/*`                             | `22` — pin it; `lts/*` is not reproducible                   |
| `.npmrc`         | `engine-strict`, `auto-install-peers`, `shamefully-hoist` | `node-linker=hoisted`, `save-exact` | Root file with the union; drop `shamefully-hoist` and see §8 |
| ESLint           | flat config, v9                                           | `.eslintrc.json`, v8                | Flat config at the root, `files:`-scoped blocks per app      |
| Prettier         | `.prettierrc`                                             | `.prettierrc.json`                  | One root `.prettierrc`; reformat in a separate commit        |
| `packageManager` | `pnpm@10.33.0`                                            | `pnpm@10.33.0`                      | Already agree                                                |
| TS module mode   | bundler, ES2020                                           | NodeNext, ES2022                    | Keep both; they compile for different runtimes               |

`shamefully-hoist=true` appears in both and should not survive the move. It
exists to paper over missing dependency declarations, and in a workspace it
lets `apps/web` import a package only `apps/api` declares — exactly the class
of mistake a monorepo makes easier. Remove it, then fix whatever breaks; that
list _is_ the set of undeclared dependencies.

### Root `package.json`

```json
{
  "name": "tracknstick",
  "private": true,
  "packageManager": "pnpm@10.33.0",
  "engines": { "node": ">=22" },
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "dev": "turbo run dev --parallel",
    "format": "prettier --write ."
  }
}
```

No runtime dependencies at the root. Each app declares what it imports, which
is what keeps `apps/web`'s bundle from silently acquiring a Workers-only
package.

### Turborepo

Worth adding, for one reason: `packages/contracts` must build before either
app that depends on it, and nothing else expresses that ordering. It also
gives per-package caching, so a web-only change stops running the API suite.

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "lint": {},
    "dev": { "cache": false, "persistent": true }
  }
}
```

---

## 6. Migration phases

Each phase ends somewhere shippable. Do not start the next until the previous
is deployed and quiet.

### Phase 0 — before anything moves _(this branch)_

Fix the bugs in place, in the current repositories, so the merge diff is pure
file movement and a regression during the merge is unambiguous.

Status: **done** — see §7.

### Phase 1 — the empty monorepo

Create `jayvicsanantonio/tracknstick`, private at first. Run the filter-repo
merge from §4. Land only the workspace scaffolding: root `package.json`,
`pnpm-workspace.yaml`, `turbo.json`, `.node-version`, `.npmrc`, shared
Prettier and ESLint.

Exit criteria: `pnpm install && pnpm build && pnpm test && pnpm lint` all pass
at the root, and both apps still build exactly as they did.

Do **not** touch CI or deployment yet. Both source repositories keep
deploying; the monorepo is not authoritative.

### Phase 2 — CI

Port both workflows, path-filtered so a web change does not run the Workers
suite:

```yaml
on:
  pull_request:
    paths: ['apps/api/**', 'packages/**', '.github/workflows/ci-api.yml']
```

The API's CI gains the lint step it never had. Both keep using
`node-version-file: .node-version` — now one file.

Exit criteria: green CI on a PR touching each app, and on one touching both.

### Phase 3 — deployment

The riskiest phase, because part of it is not in the repository.

- **API → Cloudflare Workers.** `wrangler.toml` moves to `apps/api/`. The
  deploy workflow needs `working-directory: apps/api`. The D1 binding, the
  database id and the `CLERK_SECRET_KEY` / `PINECONE_API_KEY` secrets are
  properties of the _Worker_, not the repository, so they carry over
  untouched — do not re-create the Worker.
- **Web.** The web repository has no deploy workflow, so its hosting is wired
  to the repo through a provider dashboard. **Confirm which provider before
  Phase 3 starts.** Whichever it is, the root directory must change to
  `apps/web` and the build command to `pnpm --filter web build`, and the
  `VITE_CLERK_PUBLISHABLE_KEY` / `VITE_API_HOST` variables must be re-pointed
  at the new repo. This is dashboard work, not a commit, so it cannot be
  reviewed — do it with someone watching.

Deploy the API first and let it sit for a day. It is the half that can be
rolled back by re-running the old repository's workflow.

Exit criteria: both halves deployed from the monorepo, old workflows disabled
but not deleted.

### Phase 4 — the contracts package

Only now, with everything green and deployed. One feature per PR, in the order
from §3. This is where the actual integration happens; everything before it
was logistics.

Exit criteria: every endpoint has a schema, the coverage test passes, and both
apps' hand-written duplicates are gone.

### Phase 5 — archive

Archive both source repositories on GitHub (read-only, links keep resolving).
Update the README, `CLAUDE.md` and `AGENTS.md` in each. Leave a final commit
on both `main` branches pointing at the new home.

---

## 7. Bugs found and fixed before the move

Found while reading both codebases for this plan, and fixed on
`claude/monorepo-frontend-api-migration-k3cb16` in each repository. All of them
sat inside History, Completion Rates or Achievements.

### API

**`getUserProgressHistory` threw `ReferenceError` on every real user.** It
bucketed each completion with `trackerDateKey()`, which is not defined
anywhere. The file carried a blanket `@ts-nocheck` from the Hono migration, so
`tsc` never saw the undefined name. The throw is inside the loop over
trackers, so it fired for anyone with at least one habit and one completion —
and took `/progress/history`, `/progress/streaks`, `/progress/overview` and,
through the achievement snapshot, every achievement endpoint down with it. The
248 existing tests all ran with an empty tracker set, which skips the loop.

Fixed by calling `toLocalDateKey` with the request's timezone and removing the
`@ts-nocheck`. Eight new tests; six fail against the old line.

**Achievements counted days in UTC while history counted them in the reader's
zone.** `activeDays`, `perfectDays` and `maxHabitsInOneDay` used SQLite's
`DATE(timestamp)`. For anyone west of UTC an evening completion counted
towards tomorrow, so the badges contradicted the calendar rendered beside
them.

**Streak badges measured a different quantity than the streak display.** The
`streak_*` rules read `MAX(habits.longest_streak)` — the best run of a
_single_ habit on its own schedule — while the Progress page's "Longest
Streak" counts days on which _every_ scheduled habit was done. Two numbers,
one name. The snapshot already fetched the second and then measured nothing
with it.

Both fixed by introducing `utils/completionRates.ts` as the single definition
of "what fraction of this day did I complete", and routing the history, the
streaks and every day-counting rule through it. Achievement endpoints now
accept `?timeZone`.

**Re-seeding the catalogue erased every earned badge.**
`initializeAchievements` wrote with `INSERT OR REPLACE`; SQLite implements
REPLACE as delete-then-insert, so every row got a new id — and
`user_achievements.achievement_id` references `achievements(id)`
`ON DELETE CASCADE`, which D1 enforces. The route was also unauthenticated,
so any anonymous POST could trigger it. Now an upsert on the unique key, and
authenticated.

**`lastCompleted` was dropped from the wire** when a habit had never been
completed (`undefined`, which `JSON.stringify` omits), while both clients
describe it as `string | null`.

**`pnpm test` could not run on a fresh clone** — the Miniflare environment
loads `package.json`'s `main`, and nothing declared the build. It worked in CI
only because the typecheck step happened to compile first.

### Web

**The completion-rate chart read backwards.** It plotted the API's response
order, which is newest-first because that is what the streak fold consumes.

**Every date label was one day early west of Greenwich.** The axis and
tooltips parsed each `YYYY-MM-DD` key with `new Date(...)`, which reads a bare
key as UTC midnight — an August chart opened on "31".

**Future calendar cells printed a flat 0%.** The progress circle was hidden
for them; the figure beside it was not, so a Friday still to come read like a
missed one.

**`fetchProgressHistory` swallowed every failure into `[]`.** SWR saw a
successful empty month, which is how the server fault above stayed invisible
from the UI: a 500 and a month with nothing scheduled rendered identically.

**Completing a habit left the Progress page stale.** It moves today's rate,
the month's chart and both streaks, none of which the habit list's own
`mutate` reaches.

Plus the four contract corrections tabulated in §1.

### Left deliberately unfixed

- Days with nothing scheduled are absent from the history, so the calendar
  draws them as 0% rather than "not applicable". Correct behaviour is a
  product decision (a third visual state), not a bug fix.
- Eleven achievements are registered as unmeasurable — `early_bird`,
  `night_owl`, `weekend_warrior` and the rest. They need data the snapshot
  does not carry (time-of-day, gap analysis). They honestly report _no_
  progress rather than a false 0%, which is the right interim behaviour.
- `useAchievements` is hand-rolled `useState`/`useEffect` while every other
  data hook uses SWR, so it refetches on every mount and shares no cache. A
  worthwhile cleanup, but not a bug, and not something to change in the same
  branch as a correctness fix.

---

## 8. Risks

| Risk                                                                             | Mitigation                                                                                                            |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Web hosting is dashboard-configured and cannot be reviewed in a PR               | Identify the provider before Phase 3; change it with someone watching; keep the old repo's deploy path live           |
| Removing `shamefully-hoist` breaks imports that relied on it                     | Expected. Do it in Phase 1 with nothing else in the PR, so the breakage list is the finding                           |
| Rewritten SHAs break links in old issues and PRs                                 | Both source repositories stay as archives; every old SHA still resolves there                                         |
| A regression during the merge is mistaken for a pre-existing bug                 | Phase 0 fixes bugs _before_ the merge, so the merge diff is pure movement                                             |
| The contracts package is added but not adopted, becoming a third source of truth | The coverage test in §3 fails CI when a route has no schema                                                           |
| D1 migrations run from a new path                                                | They are `wrangler d1` commands against a database identified by id in `wrangler.toml`; the path does not participate |

## 9. Rollback

- **Phases 1–2**: nothing is deployed from the monorepo. Delete the branch.
- **Phase 3**: re-run the old repository's deploy workflow. The Worker and its
  bindings never moved, so this is a redeploy, not a restore.
- **Phase 4**: each contract PR is one feature. Revert the one that broke.
- **After Phase 5**: un-archive. Archiving on GitHub is reversible.

The point of the phase boundaries is that the irreversible step (archiving) is
last, and everything before it is a redeploy away from the previous state.
