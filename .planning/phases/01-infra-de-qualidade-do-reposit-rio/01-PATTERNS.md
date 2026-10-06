# Phase 1: Infra de qualidade do repositório - Pattern Map

**Mapped:** 2026-10-06
**Files analyzed:** 9 (from 01-VALIDATION.md § Wave 0 Requirements + 01-RESEARCH.md § Standard Stack/Project Structure)
**Analogs found:** 6 / 9 (3 have no in-repo analog — stated plainly below, not forced)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `package.json` | config | batch (script orchestration) | `package.json` (itself, current state) | modify-in-place |
| `eslint.config.js` | config | transform (static analysis) | — none in repo | no analog |
| `.github/workflows/ci.yml` | config | batch (CI pipeline) | — none in repo | no analog |
| `tests/useDashboard.test.ts` | test | request-response + event-driven | `tests/channelInsights.test.mjs` (style/assertion convention) and `tests/consistency-edge.test.mjs` (boundary-faking technique) | role-match, composite |
| `tests/AuthContext.test.tsx` | test | event-driven (async session restore) | `tests/consistency-edge.test.mjs` (boundary-faking technique); `tests/channelInsights.test.mjs` (flat test/assert style) | role-match, composite |
| `README.md` | config/doc | N/A | `supabase/consistency-v1/README.md` | role-match (tone/content only) |
| `CLAUDE.md` | config/doc | N/A | `supabase/consistency-v1/README.md` | role-match (tone/content only) |
| `src/hooks/useDashboard.ts` (subject, unmodified) | hook | event-driven + request-response | — (this phase only adds tests, no code change) | n/a |
| `src/contexts/AuthContext.tsx` (subject, unmodified) | provider | event-driven (auth state) | — (this phase only adds tests, no code change) | n/a |

## Pattern Assignments

### `package.json` (config, batch — MODIFIED not created)

**Analog:** itself — current file at repo root, read in full.

**Current full content** (`package.json:1-29`):
```json
{
  "name": "adonay-dashboard",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.57.4",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.18.3",
    "recharts": "^2.15.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.6.2",
    "vite": "^6.0.5"
  }
}
```

**Concrete additions required (exact, not vague):**
- `scripts.test` (new key, inserted alongside `build`): `"node --import tsx/esm --experimental-test-module-mocks --test \"tests/**/*.test.{mjs,ts,tsx}\" && node tests/consistency-sql.mjs"` — per RESEARCH.md Pattern 2 / Code Examples.
- `scripts.lint` (new key): `"eslint ."`
- `devDependencies` additions (all devDependency-only, confirmed absent today): `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `tsx`, `@electric-sql/pglite` pinned at exactly `0.3.14` (not npm's current `0.5.8` — see RESEARCH.md Assumption A1/A2, and `supabase/consistency-v1/README.md` which pins the same version).
- No `dependencies` block changes — everything in this phase is a devDependency (QUAL-02's explicit constraint). The planner should preserve `dependencies` byte-for-byte and only touch `devDependencies` + `scripts`.
- No alphabetical re-sort assumed necessary — current `devDependencies` block is already alphabetically ordered (`@types/react` → `vite`); insert new entries maintaining that order if the planner wants to match existing habit, though this isn't an enforced convention (no lint/formatter governs `package.json` key order here).

---

### `eslint.config.js` (config, transform — NO ANALOG)

**No in-repo analog.** No `.eslintrc*`/`eslint.config.*`/`biome.json` exists anywhere in this repo (confirmed in CONVENTIONS.md § Linting: "No ESLint/Biome config present"). This is a greenfield file for this codebase. The planner should build it directly from RESEARCH.md § Architecture Patterns → Pattern 1 (verified-working two-block flat config), reproduced here as the ground truth to copy:

```javascript
// RESEARCH.md Pattern 1 — verified package exports (eslint-plugin-react-hooks,
// eslint-plugin-react-refresh, globals.denoBuiltin) checked live this session
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'supabase/consistency-v1'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, reactHooks.configs['recommended-latest']],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      semi: ['error', 'never'],
      quotes: ['error', 'single'],
      ...reactRefresh.configs.vite.rules,
    },
  },
  {
    files: ['supabase/functions/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.denoBuiltin },
    rules: {
      semi: ['error', 'always'],
      quotes: ['error', 'double'],
    },
  },
)
```

**Why these exact rule values match the real codebase** (not invented — verified against CONVENTIONS.md § Code Style):
- `src/` block: "no semicolons in `.ts`/`.tsx` files under `src/`, single quotes for strings, 2-space indentation" — confirmed directly in every file read in this session (`useDashboard.ts`, `AuthContext.tsx`, `dashboard.ts`, `supabase.ts`).
- `supabase/functions/` block: "DOES use semicolons and double quotes" (CONVENTIONS.md) — not independently re-verified by reading `index.ts` in this session (out of this agent's required-reading scope), but corroborated by both CONVENTIONS.md and RESEARCH.md's identical claim.
- Do NOT use `tseslint.configs.recommendedTypeChecked` on the `supabase/functions/` block — no `tsconfig.json` exists for that Deno-managed directory (RESEARCH.md Anti-Patterns, 3rd bullet).
- `supabase/consistency-v1` must stay in `ignores` — it's reference/exported SQL+TS material, not live application code under lint governance (confirmed by its own README calling it "Não aplicado ao Supabase remoto").

---

### `.github/workflows/ci.yml` (config, batch — NO ANALOG)

**No in-repo analog.** No `.github/workflows/` directory exists at all. Build directly from RESEARCH.md § Code Examples (GitHub Actions workflow), reproduced verbatim as the starting point:

```yaml
name: CI
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run lint
      - run: npm test
```

Note (RESEARCH.md Assumption A3, MEDIUM confidence): `actions/checkout@v7`/`actions/setup-node@v7` were WebSearch-corroborated, not fetched from the live GitHub Marketplace page — planner/executor should spot-check the current major version at plan/execute time since this is the one lower-confidence literal in the whole research doc. Everything else in this file (step order: checkout → setup-node → `npm ci` → build → lint → test) is a direct translation of QUAL-04's literal requirement text, not inference.

---

### `tests/useDashboard.test.ts` (test, event-driven + request-response — NEW)

**Primary analog (style/assertion convention):** `tests/channelInsights.test.mjs` (full file read, 43 lines).

**Secondary analog (boundary-faking technique):** `tests/consistency-edge.test.mjs` (full file read, 25 lines) — the sophisticated analog requested; study its `vm.runInNewContext` fake-globals technique as the conceptual template even though the new file uses a *different* mechanism (`t.mock.module` + jsdom, not `vm`) to achieve the same philosophy: fake only the runtime boundary, run the real logic unmodified.

**Imports pattern** (from `channelInsights.test.mjs:1-3`, the convention to match):
```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareChannel, getChannelDetail, inspectSnapshot } from '../src/utils/channelInsights.ts'
```
The new file follows the same shape but needs more imports for DOM/mocking (per RESEARCH.md Patterns 2-4):
```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { renderHook, act, waitFor } from '@testing-library/react'
```
`useDashboard` itself has no JSX, so unlike `AuthContext.test.tsx`, this file does NOT strictly need `--import tsx/esm` for its own parsing — but the orchestrator `npm test` script loads that flag process-wide anyway (RESEARCH.md Pitfall 1's "the loader must be active for the whole process, not just for files ending in .tsx"), so it is harmless and consistent to assume it's present.

**Core pattern — boundary-faking via `t.mock.module`** (synthesized from RESEARCH.md Pattern 3, which is itself a direct extension of the `consistency-edge.test.mjs` philosophy of faking `createClient`/`Deno` while running real handler logic unmodified):
```javascript
// RESEARCH.md Pattern 3 — verified in research session against a local relative .ts module
test('useDashboard refetches when filters change', async (t) => {
  let calls = 0
  t.mock.module(new URL('../src/services/dashboard.ts', import.meta.url).href, {
    exports: { getDashboardSnapshot: async () => { calls++; return fixtureSnapshot() } },
  })
  const { useDashboard } = await import('../src/hooks/useDashboard.ts')
  // renderHook(() => useDashboard(filters)) via @testing-library/react, then rerender with new filters
  assert.equal(calls, 2) // initial + filter change
})
```
Mock boundary is `src/services/dashboard.ts`'s named export `getDashboardSnapshot` (confirmed exact signature by reading `src/services/dashboard.ts:4`: `export async function getDashboardSnapshot(params: DashboardRequest): Promise<DashboardSnapshot>`) — this is the natural seam because it is the *only* call `useDashboard.ts` makes that touches Supabase/network (confirmed: `useDashboard.ts:8` imports only `getDashboardSnapshot` from `../services/dashboard`, no direct `supabase` import). Do NOT mock `src/lib/supabase.ts` for this file — the hook never imports it directly.

**`navigator`/`window` override pattern** (RESEARCH.md Pattern 4, verified live against the exact failure in Pitfall 2):
```javascript
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
// ... later, inside act():
Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true, writable: true })
window.dispatchEvent(new window.Event('offline'))
```
This is required because `useDashboard.ts:19` reads `navigator.onLine` at initial state (`typeof navigator !== 'undefined' && !navigator.onLine`) and `useDashboard.ts:184-195`/`199-200` registers real `window.addEventListener('offline'/'online', ...)` handlers — the test must dispatch real DOM events for these to fire, not just flip a boolean.

**What the real subject's surface actually requires covering** (read in full, `src/hooks/useDashboard.ts:1-216` — QUAL-06's four behaviors map onto these exact lines):
- Session-independent, but filter-driven refetch: the `filterKey` memo (`useDashboard.ts:29`) and the `useEffect` at `useDashboard.ts:139-161` that resets refs and calls `request('filter')` whenever `filters` changes.
- Background/polling refresh: `useDashboard.ts:163-171`, `window.setInterval(..., DASHBOARD_REFRESH_INTERVAL)` (constant = `60_000`, from `src/config/dashboard.ts:1` — tests should either fake timers or use a small enough interval override to avoid 60s-real-time tests; RESEARCH.md's "Full suite ~30s" budget implies fake/advanced timers, not real waits).
- Visibility/focus/online "refresh-if-stale" path: `useDashboard.ts:126-137` (`refreshIfStale`) gated by `document.visibilityState !== 'visible'`, `DASHBOARD_STALE_TIME` (`30_000`) and `DASHBOARD_REFRESH_DEBOUNCE` (`1_000`), both from `src/config/dashboard.ts:2-3` — real values to assert against, not guessed ones.
- Offline state: `useDashboard.ts:59-66` (request-time check) and `useDashboard.ts:184-195` (`handleOffline`/`handleOnline` listeners) — `isOffline` state surfaces in the hook's return value (`useDashboard.ts:215`).
- The `RefreshSource` union to exercise across tests is the literal type at `useDashboard.ts:11`: `'initial' | 'filter' | 'manual' | 'polling' | 'visibility' | 'focus' | 'online'`.

**Test naming/structure convention to copy** (from `channelInsights.test.mjs` and `TESTING.md`): flat `test(...)` calls with long descriptive sentence-style names (no `describe` blocks, no `beforeEach`), multiple assertions grouped per scenario, fresh fixture built inline per test. `fixtureSnapshot()` should be a local factory analogous to `channelInsights.test.mjs`'s `make()` (`channelInsights.test.mjs:5`), shaped as a minimal valid `DashboardSnapshot` (see that same fixture for the full field shape: `kpis.period.previous_available`, `kpis.current.valid_clicks`, `breakdowns.channels`, `timeseries`, `campaigns`, `integrity.core_totals_match`).

**Error handling convention to preserve, not alter:** `useDashboard.ts` never throws to the caller — it converts failures into `error`/`backgroundError` boolean state (CONVENTIONS.md § Error Handling). Tests must assert on these state flags, not on thrown exceptions, when simulating a failing `getDashboardSnapshot` mock.

---

### `tests/AuthContext.test.tsx` (test, event-driven — NEW)

**Primary analog (style/assertion convention):** `tests/channelInsights.test.mjs` (flat test/assert convention, as above).

**Secondary analog (boundary-faking technique, the sophisticated one):** `tests/consistency-edge.test.mjs:7-12` — study specifically how it builds a fake `createClient` returning a fake `{ auth: {...} }` shape and injects it as a sandboxed global, then drives the *real* handler through that fake. `AuthContext.test.tsx` needs the same shape of fake (`{ auth: { getSession, onAuthStateChange, signInWithPassword, signOut } }`) but delivered via `t.mock.module()` on `src/lib/supabase.ts` rather than via `vm.runInNewContext` globals — RESEARCH.md's "Don't Hand-Roll" table makes this substitution explicit ("Keeps the fake's shape obviously tied to the one real contract...same pattern already used for `createClient` in `consistency-edge.test.mjs`").

**Mock boundary — exact shape required** (derived from reading `src/lib/supabase.ts:1-14` and `src/contexts/AuthContext.tsx` in full):
- `src/lib/supabase.ts` exports two named bindings: `supabase: SupabaseClient | null` and `supabaseConfigError: string | null` (`src/lib/supabase.ts:6-13`). `supabase` is `null` whenever `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing from `import.meta.env` — this nullable-client design is exactly why `AuthContext.tsx` guards every usage with `if (!supabase)` (`AuthContext.tsx:36`, `:81`, `:90`). The mock must supply a non-null fake client to exercise the "configured" path, and can supply `supabase: null, supabaseConfigError: 'some string'` to exercise the already-existing `!supabase` early-return path (`AuthContext.tsx:36-39`, sets `loading` false immediately, no `onAuthStateChange` subscription at all).
- The fake client's `auth` sub-object must implement exactly what `AuthContext.tsx` calls: `onAuthStateChange(callback)` returning `{ data: { subscription: { unsubscribe() {} } } }` (`AuthContext.tsx:43-50`), `getSession()` returning `{ data: { session } }` (`AuthContext.tsx:52-70`, inside `restoreSession`), `signInWithPassword({ email, password })` returning `{ error }` (`AuthContext.tsx:85`), `signOut()` returning `{ error }` (`AuthContext.tsx:94`).

**Core pattern — partial-mock-via-spread, if the test wants to keep other `src/lib/supabase.ts` behavior real** (RESEARCH.md Pitfall 4, verified):
```javascript
t.mock.module(url, { exports: { ...(await import(url)), supabase: fakeClient } })
```
Call `t.mock.module(...)` before anything else imports `../src/contexts/AuthContext.tsx` for the first time in the process (Pitfall 4's warning: mocks don't retroactively apply to an already-resolved module graph).

**JSX/loader requirement (the one hard gap vs. `useDashboard.test.ts`):** `AuthContext.tsx` has real JSX (`AuthContext.tsx:103`: `return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>`). Node's native type-stripping explicitly refuses `.tsx` (RESEARCH.md Pitfall 1). This file's test MUST run under the `--import tsx/esm` loader, and `tsconfig.app.json`'s existing `"jsx": "react-jsx"` (`tsconfig.app.json:18`, confirmed present) must be picked up by that loader — no classic-transform `React` global is needed given this setting.

**What the real subject's surface actually requires covering (session restoration, per QUAL-06):** `AuthContext.tsx:33-78`, the `useEffect` in `AuthProvider` — specifically: (a) `!supabase` branch sets `loading` false immediately and returns without subscribing (`:36-39`); (b) normal branch subscribes via `onAuthStateChange` first (`:43-50`), then calls `restoreSession()` which awaits `getSession()` and sets `session`/`user` from its result (`:52-61`), catching/resetting to `null` on throw (`:62-66`), and always setting `loading` false in `finally` (`:67-69`); (c) cleanup unsubscribes and sets `isMounted = false` (`:74-77`) — a test should verify that state updates after unmount don't happen (the `isMounted` guards at `:46`, `:58`, `:63`, `:68`).

**Render pattern (new to this repo, from RESEARCH.md's verified-live Testing Library usage):** wrap in `AuthProvider`, assert on `useAuth()`'s returned `{ user, session, loading, configurationError, signIn, signOut }` (`AuthContext.tsx:13-20` is the full contract type) via `renderHook(() => useAuth(), { wrapper: AuthProvider })` or an equivalent `render` + a small consumer component — RESEARCH.md's Don't-Hand-Roll table explicitly rules out any custom fiber/manual re-implementation here.

---

### `README.md` (doc — NO ANALOG for this specific file, but a strong tone/content reference exists)

**No root `README.md` exists today** (confirmed: only `AUDITORIA-DADOS.md` and `PLANEJAMENTO-GTD.md` are present at repo root — neither is a conventional project README).

**Closest reference for tone/content:** `supabase/consistency-v1/README.md` (full file read, 58 lines) — this is the one piece of prose documentation that already exists in this repo and sets precedent for: direct, instructional Portuguese-with-technical-English-identifiers prose; numbered sequential sections; literal verbatim warnings about dangerous operations rather than paraphrased ones; exact copy-pasted shell commands.

**The exact warning QUAL-05 requires carrying forward verbatim** (`supabase/consistency-v1/README.md:10`):
```
`baseline-functions.sql`: referência exportada e entrada dos testes. **Não executar como migração.**
```
RESEARCH.md Pitfall 6 is explicit: "CLAUDE.md/README's consistency-v1 runbook section must reproduce the warning, not just link to the nested README." The new root README.md must quote this bolded sentence, not merely summarize it.

**The exact commands the new README must document** (`supabase/consistency-v1/README.md:46-51`, already the authoritative "how to test" reference this repo has used until now):
```text
node --test tests/channelInsights.test.mjs tests/consistency-edge.test.mjs
node tests/consistency-sql.mjs
```
These become, post-Phase-1, the single `npm test` command — the new README should show the new single command (from `package.json`'s new `"test"` script) as the current way, while the runbook section can still reference the nested README's manual validation sequence for `supabase/consistency-v1/` work specifically (that nested runbook — steps 1-8 of "Sequência de aplicação na cópia de teste" — is Phase 2+ territory, not something this phase automates, but QUAL-05 requires linking to/reproducing its existence per the research's "runbook" requirement).

**Also must document (QUAL-05's other three questions):** how to run (`npm run dev`/`npm run build`/`npm run preview` — already in `package.json` scripts, unchanged), how to test (new `npm test`, plus the quick single-file command from RESEARCH.md's Validation Architecture: `node --import tsx/esm --experimental-test-module-mocks --test tests/<file>`), conventions per area (the two divergent style blocks from CONVENTIONS.md § Code Style — semicolon-free/single-quote `src/` vs. semicolon/double-quote `supabase/functions/` — stated plainly, not just "see eslint.config.js").

---

### `CLAUDE.md` (doc — NO ANALOG for this specific file, same reference as README.md)

Same analog and same verbatim-warning requirement as `README.md` above (`supabase/consistency-v1/README.md`). The difference in audience: `CLAUDE.md` is written for an AI agent working in this repo in future phases — RESEARCH.md's Pitfall 5 and Pitfall 6 are specifically things this file must state as hard rules for an agent to avoid (don't run `build-consistency-package.py` from automated tooling; don't ever execute `baseline-functions.sql` as a migration). Both files share the same source facts; `CLAUDE.md` should state them as directives/constraints, `README.md` as descriptive documentation — but neither invents new facts beyond what RESEARCH.md and `supabase/consistency-v1/README.md` already establish.

---

## Shared Patterns

### Boundary-faking (never fake the logic under test)
**Source:** `tests/consistency-edge.test.mjs:7-12` (fakes `Deno`/`createClient`, runs real handler logic); generalized in RESEARCH.md Pattern 3.
**Apply to:** `tests/useDashboard.test.ts` (fake `src/services/dashboard.ts`'s `getDashboardSnapshot`) and `tests/AuthContext.test.tsx` (fake `src/lib/supabase.ts`'s `supabase` client) — never stub the hook/provider's own logic, only its one external call.
```javascript
// tests/consistency-edge.test.mjs:9 — the fake is shaped exactly like the real contract
createClient: () => ({
  auth: { getUser: async () => ({ data: { user: ... }, error: null }) },
  rpc: async () => { calls++; return { data: snapshot, error: null } },
}),
```

### Flat test structure, no `describe`/`beforeEach`
**Source:** `tests/channelInsights.test.mjs` (every test file in this repo today follows this).
**Apply to:** Both new test files — long descriptive sentence-style test names, fixtures rebuilt inline per test via a local factory function, multiple related assertions grouped per `test()` call.

### Dev-only, DEV-gated console logging with a fixed prefix
**Source:** CONVENTIONS.md § Dev-only logging; `useDashboard.ts:108-110`.
```javascript
if (import.meta.env.DEV) {
  console.error('[Adonay Dashboard] No fue posible actualizar el snapshot.', caughtError)
}
```
**Apply to:** Not directly relevant to Phase 1's new files (no new application logging is added), but relevant context if a test needs to silence/assert on this console output — `consistency-edge.test.mjs:9` stubs `console.error`/`console.warn` to no-ops for exactly this reason; the new hook/context tests may need the same stubbing to keep test output clean when deliberately triggering error paths.

### PGLITE_MODULE escape hatch (existing, unchanged)
**Source:** `tests/consistency-sql.mjs:4`.
```javascript
const { PGlite } = await import(process.env.PGLITE_MODULE ? pathToFileURL(process.env.PGLITE_MODULE).href : '@electric-sql/pglite')
```
**Apply to:** No code change needed — this already works once `@electric-sql/pglite@0.3.14` is added as a devDependency (QUAL-02). Document the env var in README.md/CLAUDE.md per QUAL-01's "environment prerequisites documented" requirement; do not touch this file.

### Nullable-client guard pattern
**Source:** `src/lib/supabase.ts:11-13`, consumed identically in `src/services/dashboard.ts:5-7` and `src/contexts/AuthContext.tsx:36,81,90`.
```typescript
export const supabase: SupabaseClient | null = supabaseConfigError ? null : createClient(supabaseUrl, supabaseAnonKey)
```
**Apply to:** Relevant to how `AuthContext.test.tsx`'s mock must be shaped — it must account for both the `null` branch (unconfigured) and the real-client branch, since `AuthContext.tsx` itself branches on this exact nullability at three call sites.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `eslint.config.js` | config | transform (static analysis) | No ESLint/Biome config of any format exists anywhere in the repo today (confirmed via CONVENTIONS.md and direct listing) — this is this repo's first lint config. Use RESEARCH.md Pattern 1 verbatim as the starting point. |
| `.github/workflows/ci.yml` | config | batch (CI pipeline) | No `.github/workflows/` directory exists. This is the repo's first CI pipeline. Use RESEARCH.md's Code Examples workflow verbatim as the starting point. |
| `README.md` | doc | N/A | No conventional project README exists at repo root (only `AUDITORIA-DADOS.md`, `PLANEJAMENTO-GTD.md`, neither a README). Closest reference for tone/structure is `supabase/consistency-v1/README.md` (used above), but it documents a different, narrower subject (one SQL/edge-function package) — the new root README is broader in scope (whole-repo run/test/convention/runbook). |
| `CLAUDE.md` | doc | N/A | Same situation as `README.md` — no file of this name exists anywhere in the repo. Same reference applies. |

## Metadata

**Analog search scope:** `tests/` (all 4 existing files), `src/hooks/`, `src/contexts/`, `src/services/`, `src/lib/`, `src/config/`, repo root (`package.json`, markdown files, tsconfig files), `supabase/consistency-v1/README.md`.
**Files scanned:** 13 (full reads: `01-RESEARCH.md`, `01-VALIDATION.md`, `CONVENTIONS.md`, `TESTING.md`, `useDashboard.ts`, `AuthContext.tsx`, `dashboard.ts` service, `supabase.ts` lib, `package.json`, `channelInsights.test.mjs`, `consistency-edge.test.mjs`, `supabase/consistency-v1/README.md`, `src/config/dashboard.ts`; partial/header read: `tests/consistency-sql.mjs`, `tsconfig.app.json`).
**Pattern extraction date:** 2026-10-06
