# Testing Patterns

**Analysis Date:** 2026-10-06

## Test Framework

**Runner:**
- Node.js built-in test runner (`node:test`), not Jest/Vitest. No test framework is listed in `package.json` dependencies and no `vitest.config.*`/`jest.config.*` exists.
- Config: none — `node:test` requires no config file. Tests are plain `.mjs` (ES module) files under `tests/`.
- **Important gap:** `package.json` has no `"test"` script (`C:\Users\luizp\OneDrive\Documentos\DashClaude\package.json` scripts are only `dev`, `build`, `preview`). Tests must currently be invoked manually per file, e.g.:

**Assertion Library:**
- `node:assert/strict` (Node built-in `assert` module, strict mode) — used in every test file via `import assert from 'node:assert/strict'`.

**Run Commands:**
```bash
node --test tests/channelInsights.test.mjs       # Run a single test file
node --test tests/*.test.mjs                     # Run all *.test.mjs files (shell glob)
node --test tests/                                # Run all tests in directory (node:test auto-discovers *.test.mjs)
```
There is no coverage tooling configured. `node --test --experimental-test-coverage` would work (built into Node) but is not currently used in any script or CI config found in the repo.

Note: `tests/consistency-sql.mjs` is NOT a `*.test.mjs` file (no `.test.` in the name) — it is a standalone script invoked directly with `node tests/consistency-sql.mjs`, not auto-discovered by `node --test`. It depends on `@electric-sql/pglite` (an in-memory Postgres), which is not listed in `package.json` devDependencies — check whether it needs to be installed separately or is expected to be provided via `PGLITE_MODULE` env var (see pattern below) before running it.

## Test File Organization

**Location:**
- All tests live in a single top-level `tests/` directory (`C:\Users\luizp\OneDrive\Documentos\DashClaude\tests\`), NOT co-located with source files. Source lives in `src/` and `supabase/functions/`; tests reference them via relative imports (e.g. `../src/utils/channelInsights.ts`).

**Naming:**
- `<subject>.test.mjs` for Node-test-runner-discovered suites: `tests/channelInsights.test.mjs`, `tests/consistency-edge.test.mjs`.
- Non-`.test.` scripts for standalone/manual verification: `tests/consistency-sql.mjs` (SQL regression script), `tests/build-consistency-package.py` (Python build helper, unrelated to automated testing).

**Structure:**
```
tests/
├── build-consistency-package.py     # Python helper script (not a test)
├── channelInsights.test.mjs         # Unit tests for src/utils/channelInsights.ts
├── consistency-edge.test.mjs        # Behavioral tests for the Supabase edge function
└── consistency-sql.mjs              # Standalone Postgres (PGlite) regression script, not auto-run by `node --test`
```
There is exactly one test file per "subject under test", not a 1:1 mapping across all of `src/` — most of `src/` (components, hooks, pages, services, contexts) currently has NO corresponding test file. Only `src/utils/channelInsights.ts` has direct unit test coverage.

## Test Structure

**Suite Organization (actual pattern, `tests/channelInsights.test.mjs`):**
```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareChannel, getChannelDetail, inspectSnapshot } from '../src/utils/channelInsights.ts'

const make = () => ({ /* builds a full, realistic DashboardSnapshot-shaped fixture object inline */ })

test('compares known channel using previous counts, including declines and no change', () => {
  assert.equal(compareChannel(make(), 'Google Ads', 100).percent, 100)
  assert.equal(compareChannel(make(), 'Google Ads', 25).percent, -50)
  assert.equal(compareChannel(make(), 'Google Ads', 50).state, 'unchanged')
})
```
- No `describe` blocks — tests are flat, each `test(...)` call has a long, descriptive sentence-style name that documents the behavior being verified (reads like a spec), not a short label. Example names: `'does not invent percentages from zero or use aggregate organic for subchannels'`, `'checks actual received sums and detects duplicates or invalid counts'`.
- No `beforeEach`/`afterEach` hooks used anywhere. Fixtures are built fresh per-assertion via a local factory function (`make()`) called inline, ensuring no shared mutable state leaks between assertions within a test.
- Tests directly import and execute real TypeScript source files (`.ts`) from Node — this works because Node's built-in TypeScript stripping (`node:module`'s `stripTypeScriptTypes`, or native `.ts` support) is relied upon rather than a transpilation step or ts-node. There is no separate build step before running tests.
- Multiple assertions per `test()` block are normal and expected — tests group related assertions under one descriptive scenario rather than splitting into one-assertion-per-test.

## Mocking

**Framework:** None (no `sinon`, `jest.mock`, `vi.mock`). Mocking is done via hand-written fakes/stubs passed as plain objects or via Node's `vm` module.

**Patterns:**

1. **Dependency injection via plain object fakes** (`tests/channelInsights.test.mjs`) — no mocking framework needed since pure functions take data in and return data out; tests just construct the input object (`make()`) directly.

2. **Sandboxed execution via `node:vm` for testing a Deno/edge-function file from Node** (`tests/consistency-edge.test.mjs`):
```javascript
import vm from 'node:vm'
import fs from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'

const source = stripTypeScriptTypes(
  fs.readFileSync(new URL('../supabase/functions/dashboard-whatsapp/index.ts', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/, '')
)

function app({ authorized = true, validSession = true, configured = true, snapshot = null } = {}) {
  let handler, calls = 0
  const context = {
    Request, Response, URL,
    console: { error(){}, warn(){} },               // silenced logger stub
    createClient: () => ({                            // fake Supabase client
      auth: { getUser: async () => ({ data: { user: validSession ? { id:'test', email: authorized?'allowed@example.invalid':'other@example.invalid' } : null }, error: null }) },
      rpc: async () => { calls++; return { data: snapshot, error: null } },
    }),
    Deno: {
      env: { get: key => key === 'DASHBOARD_ALLOWED_EMAILS' ? (configured ? 'allowed@example.invalid' : '') : 'test' },
      serve: fn => { handler = fn },                   // captures the handler instead of actually serving
    },
  }
  vm.runInNewContext(source, context)
  return { handle: (body, headers={}) => handler(new Request('https://test.invalid/', { method:'POST', headers:{authorization:'Bearer fake','content-type':'application/json',...headers}, body })), calls: () => calls }
}
```
This pattern strips the Deno-specific import, injects a fabricated `Deno` global (env vars + `serve` capturing the handler function) and a fabricated `createClient` (fake Supabase auth/rpc), then runs the real edge function source in an isolated V8 context (`vm.runInNewContext`) so the actual handler logic executes unmodified. Use this approach for any new edge-function tests — rewrite the fake's `configured`/`validSession`/`authorized`/`snapshot` options to cover new branches rather than inventing a new test harness.

3. **Real in-memory database instead of mocking SQL** (`tests/consistency-sql.mjs`) — rather than mocking Postgres/Supabase RPC calls, this script spins up `@electric-sql/pglite` (real embedded Postgres), creates fixture tables/roles, applies the actual SQL migration files (`supabase/consistency-v1/01-apply.sql` etc.), and asserts against real query results. This is the project's preferred pattern for anything touching SQL/RPC behavior: prefer a real embedded Postgres over mocking the database layer.

**What to Mock:**
- Deno runtime globals (`Deno.env`, `Deno.serve`) and the Supabase client factory (`createClient`) when testing the edge function in Node — there's no way to run real Deno/Supabase in a unit test, so these are faked.
- `console.error`/`console.warn` are stubbed to no-ops in the edge-function harness to keep test output clean.

**What NOT to Mock:**
- Pure utility/business logic functions (`src/utils/channelInsights.ts`) are tested directly with real inputs — no mocking needed or used.
- SQL/database behavior is NOT mocked — `consistency-sql.mjs` uses a real (in-memory) Postgres rather than stubbing query results, to catch real SQL regressions.
- The actual edge function handler logic itself is never mocked — only its runtime environment is faked, so the real request-handling code path executes.

## Fixtures and Factories

**Test Data:**
```javascript
// tests/channelInsights.test.mjs — inline factory function, rebuilt per test via make()
const make = () => ({
  kpis: { period: { previous_available: true }, current: { valid_clicks: 120 }, previous: { google_ads_clicks: 50, meta_ads_clicks: 0, organic_clicks: 25 } },
  breakdowns: { channels: [{ channel: 'Google Ads', contacts: 100 }, { channel: 'Meta Ads', contacts: 20 }] },
  timeseries: { comparison: [...], channels: [...] },
  campaigns: { campaigns: [...] },
  integrity: { core_totals_match: true },
})
```
- Fixtures are always inline JS object literals matching the `DashboardSnapshot` shape (`src/types/dashboard.ts`) — no separate fixture files, no `.json` fixtures, no factory libraries (no `faker`, no test-data-bot).
- For the SQL test (`tests/consistency-sql.mjs`), fixture rows are generated with Postgres `generate_series` directly inside the test script (`INSERT ... SELECT n, ... FROM generate_series(1,18) n`), plus a handful of explicit edge-case rows (old date, future date in a specific timezone) inserted via literal `VALUES`.

**Location:**
- No dedicated fixtures directory. Fixtures are defined at the top of each test file as local functions/constants, scoped to that file only.

## Coverage

**Requirements:** None enforced. No coverage tool is configured, no coverage threshold exists in any config file.

**View Coverage:**
```bash
node --test --experimental-test-coverage tests/
```
(Not currently wired into any script — would need to be run manually; consider adding as an `npm run test:coverage` script if coverage visibility becomes a priority.)

## Test Types

**Unit Tests:**
- `tests/channelInsights.test.mjs` — pure-function unit tests for `src/utils/channelInsights.ts` (comparison math, channel detail extraction, snapshot integrity checks). This is the only pure frontend unit test file in the repo; no tests exist yet for hooks (`useDashboard`), components (`Overview`, `Dashboard`, etc.), services (`src/services/dashboard.ts`), or contexts (`AuthContext`).

**Integration Tests:**
- `tests/consistency-edge.test.mjs` — integration-style test of the Supabase edge function's full request-handling behavior (auth, validation, CORS, response shaping) using the `vm`-sandboxed real source plus faked Deno/Supabase runtime (see Mocking section above). Covers: session/authorization rejection (401/403/503), malformed/impossible-date input rejection (400), missing-snapshot handling (502), and successful response plus CORS origin rejection (200/403).
- `tests/consistency-sql.mjs` — integration test of the actual SQL migration (`supabase/consistency-v1/01-apply.sql`/`02-rollback.sql`) against a real embedded Postgres, verifying `dashboard_snapshot()`/`dashboard_breakdowns()` RPC behavior, date-cutoff handling, permission grants (anon/authenticated/service_role), and rollback safety.

**E2E Tests:**
- Not used. No Playwright/Cypress config or test files found anywhere in the repo.

## Common Patterns

**Async Testing:**
```javascript
// tests/consistency-edge.test.mjs — async test function, awaited handler calls
test('rejects invalid sessions and unauthorized users before querying data', async () => {
  for (const [options, status] of [[{ validSession: false }, 401], [{ authorized: false }, 403], [{ configured: false }, 503]]) {
    const a = app(options)
    assert.equal((await a.handle('{}')).status, status)
    assert.equal(a.calls(), 0)   // also asserts the RPC was never called — side-effect verification, not just return value
  }
})
```
Pattern: when testing rejection/short-circuit behavior, assert BOTH the HTTP status returned AND that the downstream call (`calls()`) was not made — don't just check the response, verify work was actually skipped.

**Error Testing:**
```javascript
// tests/consistency-sql.mjs — assert.rejects for expected thrown/rejected errors, with regex message matching
await db.exec(`CREATE OR REPLACE FUNCTION public.dashboard_breakdowns(...) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;`)
await assert.rejects(() => run('hoy'), /Incomplete dashboard snapshot/)
```
Pattern: to test a specific failure mode of a SQL function, redefine the function inline with `CREATE OR REPLACE FUNCTION` to simulate the broken condition, then assert the caller rejects with a matching error message regex. Restore the real definition afterward (`await db.exec(apply)`) before continuing with subsequent assertions in the same test.

---

*Testing analysis: 2026-10-06*
