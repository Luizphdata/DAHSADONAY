---
phase: 01-infra-de-qualidade-do-reposit-rio
plan: 02
subsystem: testing
tags: [node-test, jsdom, testing-library, module-mocks, useDashboard, AuthContext]

# Dependency graph
requires: ["01-01"]
provides:
  - "tests/useDashboard.test.ts: node:test coverage of filter-change refetch, background polling refresh, offline/online DOM transitions"
  - "tests/AuthContext.test.tsx: node:test coverage of session restoration for both the unconfigured and configured Supabase branches"
  - "Fix to package.json's test script (TSX_TSCONFIG_PATH + cross-env) so .tsx test files actually get the react-jsx transform instead of crashing"
affects: [01-03, 01-04]

# Tech tracking
tech-stack:
  added: ["cross-env@^10.1.0 (devDependency)"]
  patterns:
    - "Boundary-faking via node:test module mocks (getDashboardSnapshot, supabase client), real hook/provider logic runs unmodified"
    - "Per-test t.mock.module + cache-busted dynamic import (?case=...) to get two independently-mocked scenarios against the same subject file within one process"
    - "jsdom with pretendToBeVisual:true so document.visibilityState defaults to 'visible' (required for polling/online-recovery code paths to fire)"

key-files:
  created: ["tests/useDashboard.test.ts", "tests/AuthContext.test.tsx"]
  modified: ["package.json", "package-lock.json"]

key-decisions:
  - "node:test's mock.module `exports` getters are evaluated exactly once at first module resolution and then frozen into a plain value (verified via a minimal node:os repro) — they are NOT re-invoked per property access. This breaks the plan's literal 'getter-based exports reflect whichever scenario is currently selected' technique for AuthContext.test.tsx. Replaced with t.mock.module (test-scoped, auto-restored between tests) plus importing the subject file through a cache-busted specifier (`../src/contexts/AuthContext.tsx?case=...`) per test, forcing a fresh module instance whose own internal `../lib/supabase` import resolves against that test's mock."
  - "tsx's nearest-tsconfig.json lookup for files under src/ resolves to this repo's solution-style root tsconfig.json (`files: []`, only `references`, no `jsx` field) rather than tsconfig.app.json, so AuthContext.tsx's JSX used the classic transform and crashed with 'ReferenceError: React is not defined' at render time under the Wave 1 `npm test` script as originally wired. Fixed by setting `TSX_TSCONFIG_PATH=tsconfig.app.json` in the test script (via the new `cross-env` devDependency, for Windows/POSIX-portable env-var syntax), without touching the solution tsconfig.json or tsc -b's project-reference behavior."
  - "useDashboard.test.ts cannot vary DASHBOARD_REFRESH_INTERVAL per test for the same reason (frozen export), so a single small interval (20ms) is shared by the whole file; the filter-change test uses >=/> comparisons on call counts instead of exact equality so a stray background poll tick can't make it flaky, while still asserting the real behavioral guarantees (refetch happens, stale filter's data is never shown)."
  - "JSDOM must be constructed with `pretendToBeVisual: true` — otherwise `document.visibilityState` defaults to 'prerender'/`hidden: true`, which silently short-circuits both the polling effect's `visibilityState === 'visible'` guard and `handleOnline`'s recovery-refetch guard, making the background-refresh and online-recovery tests fail with no useful error."

requirements-completed: [QUAL-06]

# Metrics
duration: ~55min
completed: 2026-10-06
---

# Phase 1 Plan 2: useDashboard and AuthContext Automated Test Coverage Summary

**`node:test` + jsdom + `@testing-library/react` coverage of `useDashboard.ts` (filter-change refetch, background polling, offline/online recovery) and `AuthContext.tsx` (both the unconfigured and configured session-restoration branches), faking only each file's one real network seam.**

## Performance

- **Duration:** ~55 min (including two empirically-verified deviations from the plan's literal mocking technique)
- **Tasks:** 2 completed
- **Files created:** 2 (`tests/useDashboard.test.ts`, `tests/AuthContext.test.tsx`)
- **Files modified:** 2 (`package.json`, `package-lock.json`)

## Accomplishments

- `tests/useDashboard.test.ts` (3 tests) exercises the real, unmodified `useDashboard` hook under jsdom, faking only `getDashboardSnapshot` (via `mock.module`) and the timing constants in `src/config/dashboard.ts`:
  - filter change triggers a refetch and never shows stale (previous filter's) data
  - background polling refresh keeps `loading` false throughout (only `refreshing` may toggle)
  - `navigator.onLine`/`window` 'offline'/'online' events flip `isOffline` and trigger a real recovery refetch
- `tests/AuthContext.test.tsx` (2 tests) exercises the real, unmodified `AuthProvider`/`useAuth`, faking only the `supabase` client export from `src/lib/supabase.ts`:
  - unconfigured (`supabase === null`) branch: `loading` resolves `false` immediately, no `onAuthStateChange` subscription ever created
  - configured branch: session is restored from a fake client's `getSession()`, `onAuthStateChange` is subscribed exactly once
- `npm test` now runs 14 tests total (up from 9 after Wave 1) plus the SQL harness, all green, and `npm run build`/`npm run lint` remain green.
- Fixed a real Wave-1 gap: the `npm test` script as wired would have crashed any `.tsx` test file with `ReferenceError: React is not defined` because tsx's tsconfig lookup doesn't pick up `tsconfig.app.json`'s `jsx: react-jsx` setting from this repo's solution-style root `tsconfig.json`. `TSX_TSCONFIG_PATH` (set via `cross-env` for cross-platform npm script syntax) fixes this for all current and future `.tsx` test files.

## Task Commits

1. **Task 1: Write tests/useDashboard.test.ts** - `89c5679` (test)
2. **Task 2: Write tests/AuthContext.test.tsx** (+ `TSX_TSCONFIG_PATH`/`cross-env` fix to `package.json`) - `fbc7e33` (test + fix)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `tests/useDashboard.test.ts` - New. 3 tests, jsdom + `@testing-library/react` `renderHook`, `mock.module` fakes `getDashboardSnapshot` and `src/config/dashboard.ts`'s constants.
- `tests/AuthContext.test.tsx` - New. 2 tests, jsdom + `@testing-library/react` `renderHook`, `t.mock.module` (per-test scope) fakes `src/lib/supabase.ts`'s `supabase`/`supabaseConfigError`.
- `package.json` - `scripts.test` now sets `TSX_TSCONFIG_PATH=tsconfig.app.json` via `cross-env`; added `cross-env@^10.1.0` devDependency.
- `package-lock.json` - Regenerated by `npm install --save-dev cross-env@10.1.0`.

## Decisions Made

See `key-decisions` in frontmatter — the two empirically-verified Node behavior discoveries (mock.module `exports` getters snapshot once, not live; tsx's tsconfig resolution misses this repo's `tsconfig.app.json` for solution-style root configs) each forced a different, verified-working technique than the plan's literal instructions described. Both are documented below as deviations with the verification steps that proved the plan's literal approach would not work.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `mock.module`'s getter-based `exports` do not provide live per-access re-evaluation in this Node version (24.15.0)**
- **Found during:** Task 2, first attempt at the plan's literal getter-based top-level `mock.module()` approach for `src/lib/supabase.ts`
- **Issue:** The plan's `<action>` specified `get supabase() { return currentSupabase }` / `get supabaseConfigError() { return currentConfigError }` registered once via the top-level `mock` import, with each `test()` reassigning `currentSupabase`/`currentConfigError` before `render(...)`. Verified via a minimal reproduction (`mock.module('node:os', { exports: { get platform() { return val } } })`, then reading `os.platform` before and after reassigning `val`) that the getter is invoked exactly once, when the synthetic module namespace is first materialized, and the result is frozen into a plain `value` property (confirmed via `Object.getOwnPropertyDescriptor` showing `{ value: ..., get: undefined }` after the first access) — never re-invoked. This means a single top-level mock + reassigned outer variable cannot make `AuthContext.tsx`'s already-resolved import binding reflect a second test's scenario.
- **Fix:** Used `t.mock.module()` (test-context-scoped, automatically restored after each test completes — verified this allows re-mocking the same specifier in a later test without the "already mocked" error that a second top-level `mock.module()` call throws) combined with importing the subject file itself through a **cache-busted specifier** per test (`'../src/contexts/AuthContext.tsx?case=unconfigured'` vs `'...?case=configured'`). Each distinct specifier is a distinct module instance to Node's ESM cache, so its own internal (unmodified, relative, no-query) `import { supabase, supabaseConfigError } from '../lib/supabase'` is freshly resolved against whatever `t.mock.module()` registered immediately before that test's import — verified working via an isolated two-file reproduction (`dep.mjs`/`consumer.mjs`/`main2.test.mjs`) before applying it to the real files.
- **Files modified:** `tests/AuthContext.test.tsx` (written directly with the verified-working technique; `tests/useDashboard.test.ts` uses the dispatcher-function pattern for `getDashboardSnapshot`, which is unaffected since functions — unlike getters — are called fresh on every invocation and correctly read the current value of their closed-over variable).
- **Verification:** Both `AuthContext.test.tsx` tests pass independently and together, each asserting the correct branch (`loading`/`session`/`user`/`configurationError`/`onAuthStateChange` call count) for its own scenario, run 3x with no flakiness observed.
- **Committed in:** `fbc7e33`

**2. [Rule 3 - Blocking] `npm test` would crash on any `.tsx` test file: tsx's tsconfig lookup misses `tsconfig.app.json`'s `jsx: react-jsx`**
- **Found during:** Task 2, first run of `tests/AuthContext.test.tsx` via the exact Wave-1-wired `npm test`/standalone command
- **Issue:** `AuthProvider`'s JSX (`<AuthContext.Provider>...`) rendered with `ReferenceError: React is not defined` — the classic-transform failure mode of Pitfall 1, meaning tsx fell back to the classic JSX transform instead of the automatic one. Root-caused by reproducing with/without the real file (both failed identically) and with/without the cache-busting query string (irrelevant — same failure either way): tsx resolves the **nearest** `tsconfig.json` by walking up from the file being transformed, and this repo's root `tsconfig.json` is a solution-style file (`"files": []`, only `"references"` to `tsconfig.app.json`/`tsconfig.node.json`, no `"compilerOptions"` of its own) — tsx does not follow TS project references, so it never sees `tsconfig.app.json`'s `"jsx": "react-jsx"`. Confirmed the fix empirically: adding `"jsx": "react-jsx"` directly to the root `tsconfig.json`'s `compilerOptions` did **not** fix it (tsx still didn't pick it up for a file under `src/`), but setting the `TSX_TSCONFIG_PATH=tsconfig.app.json` environment variable did, verified via a standalone repro script before touching `package.json`.
- **Fix:** Set `TSX_TSCONFIG_PATH=tsconfig.app.json` in `package.json`'s `scripts.test`. Since inline `VAR=value command` shell syntax doesn't work in Windows `cmd.exe` (npm's default script shell on Windows, and this is a Windows dev environment per the session's environment info) while the CI runner is `ubuntu-latest`, added `cross-env@^10.1.0` as a devDependency to set the variable portably across both.
- **Files modified:** `package.json` (`scripts.test`, new `cross-env` devDependency), `package-lock.json` (regenerated by `npm install`).
- **Verification:** `npm test` now passes all 14 tests (12 from Wave 1 + 2 new AuthContext tests) plus the SQL harness; `npm run build` and `npm run lint` still exit 0 afterward (re-run to confirm no regression from the script change).
- **Committed in:** `fbc7e33`

**3. [Rule 1 - Bug] Shared single `DASHBOARD_REFRESH_INTERVAL` mock value races the filter-change test's exact call-count assertion**
- **Found during:** Task 1, after getting the polling and offline/online tests to pass with a 20ms mocked interval
- **Issue:** The plan's filter-change test expected the service to be "called exactly twice" (initial + filter change). Because deviation #1's discovery (mock.module exports can't vary per-test within one file) also applies to `useDashboard.test.ts`'s config mock, a single small interval (necessary for the polling test to complete in under a second) is active for the whole file, including the filter-change test. The background poller can legitimately tick one or more extra times during that test's own async waits, making `callCount === 1` / `=== 2` assertions flaky (observed failures: `3 !== 1`).
- **Fix:** Changed the filter-change test's assertions from exact equality to `>=`/`>` comparisons (call count increases after the filter change; the visible data correctly reflects the new filter, never the stale one) — this still proves the required behavior (refetch happens on filter change, no stale-filter leak) without being coupled to an environment-dependent exact tick count.
- **Files modified:** `tests/useDashboard.test.ts`
- **Verification:** Re-ran the full file 5 times in a row with zero failures (previously failed roughly every other run with the exact-equality version).
- **Committed in:** `89c5679`

**4. [Rule 1 - Bug] jsdom defaults `document.visibilityState` to `'prerender'`/`hidden: true`, silently disabling polling and online-recovery**
- **Found during:** Task 1, first run of the polling and offline/online tests
- **Issue:** `useDashboard.ts`'s polling interval callback and `handleOnline`'s recovery-refetch both gate on `document.visibilityState === 'visible'`. jsdom's default (confirmed via direct `node -e` inspection) is `visibilityState: 'prerender'`, `hidden: true`, unless the JSDOM constructor is given `pretendToBeVisual: true` — neither the plan's `<action>` code snippet nor 01-RESEARCH.md/01-PATTERNS.md's jsdom setup examples mention this option, and omitting it makes both tests fail with no explicit error (the guarded code paths just silently never execute).
- **Fix:** Added `pretendToBeVisual: true` to the `JSDOM` constructor options in both new test files.
- **Files modified:** `tests/useDashboard.test.ts`, `tests/AuthContext.test.tsx` (added for consistency/safety even though `AuthContext.tsx` doesn't read `document.visibilityState`)
- **Verification:** `document.visibilityState` confirmed `'visible'` after the fix (direct `node -e` check); polling and online-recovery tests pass reliably afterward.
- **Committed in:** `89c5679`

---

**Total deviations:** 4 auto-fixed (2 Rule 1 bug-fixes in test-only files, 1 Rule 1 fix to the test's own assertions, 1 Rule 3 blocking fix to `package.json`'s shared test script). Zero changes to `src/hooks/useDashboard.ts` or `src/contexts/AuthContext.tsx` — both subjects remain completely unmodified, exactly as the plan requires.

**Impact on plan:** Deviations #1 and #2 mean two of the plan's literal acceptance-criteria checks no longer apply verbatim:
- `grep -n "get supabase()" tests/AuthContext.test.tsx` and `grep -n "get supabaseConfigError()" tests/AuthContext.test.tsx` — both now return no matches (0 lines), since the getter technique was replaced by the verified-working `t.mock.module` + cache-busted-import technique. The underlying intent (fake only the client boundary, verify both branches against the real unmodified provider) is fully met; the specific mechanical grep pattern just no longer matches the (corrected) implementation.
- All other acceptance criteria for both tasks are met as specified (exit codes, test counts, `mock.module`/`navigator`-override grep patterns for `useDashboard.test.ts`, absence of any real `@supabase/supabase-js` client construction in `AuthContext.test.tsx`).

## Issues Encountered

None beyond the four documented deviations above, all auto-fixed within this plan's scope (test files + the one shared script line needed to make any `.tsx` test runnable at all).

## User Setup Required

None — no external service configuration required. `npm install --save-dev cross-env@10.1.0` was run locally against the public npm registry only. No real Supabase secrets are needed to run `npm test` (both new test files fake the Supabase/service boundary entirely, consistent with the phase's threat model disposition).

## Next Phase Readiness

- `npm test` (14 tests + SQL harness), `npm run lint`, and `npm run build` are all green and can be used as-is by 01-03 (CI) and 01-04 (docs) for their own verification steps.
- 01-03 (GitHub Actions CI) should be aware that `npm test` now depends on `cross-env` being installed via `npm ci` — no CI-side change needed since `cross-env` runs identically on `ubuntu-latest`, but the CI workflow should not attempt to bypass `npm test`'s script wrapper (e.g. by calling `node --test` directly) without also setting `TSX_TSCONFIG_PATH`, or `.tsx` test files will fail there too.
- No blockers identified for 01-03/01-04.

---
*Phase: 01-infra-de-qualidade-do-reposit-rio*
*Completed: 2026-10-06*

## Self-Check: PASSED
