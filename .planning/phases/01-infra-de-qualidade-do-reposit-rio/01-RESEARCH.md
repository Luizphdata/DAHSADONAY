# Phase 1: Infra de qualidade do repositório - Research

**Researched:** 2026-10-06
**Domain:** Node/TypeScript repo tooling — test runner wiring, dual-area lint/format, GitHub Actions CI, dev-only dependency hygiene, React hook/context testing without an existing testing stack
**Confidence:** HIGH for stack/tooling choices (verified against npm registry and live execution in this session); MEDIUM for GitHub Actions action-version currency (WebSearch, cross-checked); LOW→flagged for the "four suites" framing (see Open Questions) and for anything about Supabase-side state (out of reach from this repo).

## Summary

This phase adds zero new application dependencies and zero Supabase access — everything is local tooling. Three things make it harder than it looks. First, the roadmap/CONTEXT framing of "four suites" bundles in `tests/build-consistency-package.py`, but that script is not a test — it is a one-off code generator that requires a CLI argument (a path to a manually-exported CSV from Supabase) that does not exist in this repo and is not meant to run unattended in CI. `npm test` should wire the three real automated suites (`channelInsights.test.mjs`, `consistency-edge.test.mjs`, `consistency-sql.mjs`); the Python script belongs in documentation as a manual regeneration tool, not in the test command. This is flagged prominently for the planner/user because it contradicts the roadmap's "quatro suítes" framing (see Open Questions).

Second, lint must cover two areas with deliberately different styles (`src/` semicolon-free/single-quote; `supabase/functions/` semicolon/double-quote Deno code) without homogenizing either. ESLint's flat-config format (ESLint 10.x, verified on npm) does this natively: two config objects scoped by `files` glob, each with its own `languageOptions.globals` (the `globals` npm package ships a verified `denoBuiltin` export for exactly the second block) and its own `rules.semi`/`rules.quotes`. No Prettier is needed or recommended — the existing codebase enforces style by convention only, and introducing a formatter now would silently rewrite whichever area isn't excluded, which is explicitly forbidden by QUAL-03 and by "Fora de escopo" in REQUIREMENTS.md.

Third — the hardest part — `useDashboard.ts` and `AuthContext.tsx` have no test infrastructure today, and the project has deliberately avoided Jest/Vitest. Node's built-in test runner (`node --test`, Node 24.15.0 locally) can run both, but with two real, verified limitations: (1) Node's native TypeScript type-stripping explicitly refuses `.tsx` files (JSX is not type syntax, so it can't be whitespace-erased) — `AuthContext.tsx` cannot be imported by `node --test` without a transform step; (2) hooks can't be invoked outside of a React render pass, and `react-dom/client`'s renderer needs a real `document`, which Node does not provide. Both gaps were verified live in this session: adding `tsx` as an ESM loader (`node --import tsx/esm --test ...`) with the project's existing `"jsx": "react-jsx"` tsconfig setting correctly renders a `.tsx` component; `jsdom` + `@testing-library/react`'s `renderHook`/`render` correctly mounts hooks/components in a minimal DOM, and `navigator.onLine` can be overridden via `Object.defineProperty` (plain assignment fails — Node has its own read-only `navigator` global). Mocking the Supabase client / `getDashboardSnapshot` service boundary (rather than reaching the real network) is done with Node's own `--experimental-test-module-mocks` flag and `t.mock.module(url, { exports: {...} })` — verified working against both a built-in module and a local relative `.ts` module in this session. None of this requires migrating off `node --test`.

**Primary recommendation:** Keep `node --test` as the only test runner; add `jsdom`, `@testing-library/react`, `@testing-library/dom`, and `tsx` as devDependencies to close the JSX/DOM gap; use `--experimental-test-module-mocks` + `t.mock.module()` to fake the Supabase boundary (mirroring the project's existing "fake the runtime boundary, not the logic" pattern from `consistency-edge.test.mjs`); use a two-block ESLint 10 flat config for the dual style areas; treat `build-consistency-package.py` as documentation-only, not part of `npm test`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| QUAL-01 | `npm test` runs, in one discoverable command, the suites `node --test tests/*.test.mjs` and the script `node tests/consistency-sql.mjs`, with environment prerequisites documented (Node 24, `PGLITE_MODULE` when applicable) | Pattern 2 (orchestrator script); Code Examples (`npm test` wiring); Pitfall 5 explains why `build-consistency-package.py` is excluded from this command; Validation Architecture maps the exact script |
| QUAL-02 | `@electric-sql/pglite@0.3.14` is declared as a test-only dependency, outside production `dependencies`, and the script that requires it fails with a clear message when it is not installed | Standard Stack (pinned version + devDependency install command); existing `PGLITE_MODULE` escape hatch in `tests/consistency-sql.mjs` already gives a clear resolution failure when unset/missing |
| QUAL-03 | Lint and formatting configured per area: `src/` without semicolons, single quotes, 2 spaces; `supabase/functions/` with semicolons and double quotes. Running lint does not rewrite either area in the other's style | Pattern 1 (two-block ESLint flat config) with verified `globals.denoBuiltin` export; Anti-Patterns (why no Prettier); Standard Stack lists exact ESLint/typescript-eslint/plugin versions |
| QUAL-04 | CI runs `tsc -b`, lint, and the tests on every push, and fails visibly when any of them breaks | Code Examples (GitHub Actions workflow); Environment Availability confirms GitHub remote already configured; Assumption A3 flags the one MEDIUM-confidence detail (action major versions) |
| QUAL-05 | README.md and CLAUDE.md exist and describe: how to run, how to test, conventions per area, and the consistency-package runbook, including the warning that `baseline-functions.sql` is not a migration | Pitfall 6 (verbatim warning requirement); Recommended Project Structure lists both new files; Validation Architecture's requirement map notes this is a manual-review, not automated, check |
| QUAL-06 | `src/hooks/useDashboard.ts` and `src/contexts/AuthContext.tsx` have automated tests covering session restoration, filter changes, background refresh, and offline state | Patterns 2-4 (module mocking, jsdom rendering, navigator/window overrides) — all verified live in this session; Don't Hand-Roll table; Pitfalls 1-4 cover every failure mode actually hit while proving this feasible; Validation Architecture requirement map gives the exact command |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Test execution (`npm test`) | Build/Dev tooling (Node CLI) | — | Pure local tooling, no runtime tier involved |
| Lint/format enforcement | Build/Dev tooling | — | Static analysis, runs before any tier executes |
| CI orchestration | CI platform (GitHub Actions) | Build/Dev tooling | GitHub Actions invokes the same local npm scripts; no new logic lives in CI itself |
| React hook/context test harness | Browser-emulation (jsdom, in test process) | Frontend Server — N/A (no SSR in this project) | `useDashboard`/`AuthContext` are browser-tier code; testing them requires emulating the browser tier (DOM), not the API tier |
| Edge Function test harness (existing) | API / Backend (Deno Edge Function), emulated via `node:vm` | — | Already solved by `consistency-edge.test.mjs`; phase 1 does not change this pattern |
| SQL/RPC test harness (existing) | Database / Storage (PGlite), emulated in-process | — | Already solved by `consistency-sql.mjs`; phase 1 only needs to make the dependency devDependency-only and wire it into `npm test` |
| Documentation (README/CLAUDE.md) | N/A (docs) | — | Cross-cutting; must describe all tiers above without code changes |

## Standard Stack

### Core (new devDependencies for this phase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `eslint` | `10.0.1` [VERIFIED: npm registry] | Lint engine, flat config | Current major; flat config (`eslint.config.js`) is the only config format ESLint 9+ supports — no `.eslintrc` fallback needed |
| `typescript-eslint` | `8.71.1` [VERIFIED: npm registry] | TS-aware linting (meta-package: parser + plugin + configs) | Single package replaces `@typescript-eslint/{parser,eslint-plugin}` separate installs since v8; peers `eslint ^8.57\|^9\|^10`, `typescript >=4.8.4 <6.1.0` — compatible with installed TS ~5.6.2 [VERIFIED: npm registry] |
| `@eslint/js` | `10.0.1` [VERIFIED: npm registry] | `js.configs.recommended` base ruleset | Official baseline recommended by ESLint itself for flat config |
| `eslint-plugin-react-hooks` | `7.1.1` [VERIFIED: npm registry] | Rules-of-hooks / exhaustive-deps | Ships flat-config presets `recommended-latest` and `flat` [VERIFIED: inspected package exports locally] |
| `eslint-plugin-react-refresh` | `0.5.7` [VERIFIED: npm registry] | Vite Fast Refresh boundary enforcement | Ships a `vite` flat-config preset [VERIFIED: inspected package exports locally] — matches this project's Vite setup exactly |
| `globals` | `17.13.0` [VERIFIED: npm registry] | Predefined global sets for `languageOptions.globals` | Exports `globals.denoBuiltin` [VERIFIED: inspected package export locally] — gives the `supabase/functions/` lint block `Deno`/edge globals without hand-listing them |
| `jsdom` | `30.1.2` [VERIFIED: npm registry] | DOM environment for hook/component tests | `engines.node` is `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` [VERIFIED: npm registry] — this exact range includes the locally installed Node `24.15.0`; a slightly older/newer Node 24 patch could be rejected, worth pinning Node version in CI to match |
| `@testing-library/react` | `16.3.3` [VERIFIED: npm registry] | `render`/`renderHook` for hooks & the Auth provider | Peer `react ^18\|^19`, `react-dom ^18\|^19`, `@testing-library/dom ^10` [VERIFIED: npm registry] — matches installed React 18.3.1 |
| `@testing-library/dom` | `10.4.2` [VERIFIED: npm registry] | Required peer of `@testing-library/react` | — |
| `tsx` | `4.23.15` [VERIFIED: npm registry; actively maintained, last publish 2026-09-20] | ESM loader (`--import tsx/esm`) that transforms `.tsx` on the fly | Only needed because Node's native type-stripping refuses `.tsx` (see Pitfall 1); does **not** replace `node --test` as the runner, only the module loader |

### Already-present, test-only (no change needed except declaring devDependency)

| Library | Version | Purpose | Note |
|---------|---------|---------|------|
| `@electric-sql/pglite` | `0.3.14` (pinned by existing harness/README) | In-memory Postgres for `tests/consistency-sql.mjs` | **Must go in `devDependencies`, never `dependencies`** (QUAL-02/QUAL-06 / REQUIREMENTS "Fora de escopo"). Current npm registry latest is `0.5.8` [VERIFIED: npm registry] — a newer version exists, but the existing SQL harness and README were authored against `0.3.14`; do not bump without re-validating `tests/consistency-sql.mjs` against the new version (out of scope for this phase — flagged as an assumption, see Assumptions Log). The `PGLITE_MODULE` env-var escape hatch in `tests/consistency-sql.mjs:4` already works with any install location; keep it — it lets a contributor point at a pre-built `dist/index.js` instead of relying on npm resolution, per the README. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node --test` (kept) | Vitest / Jest | Rejected — no concrete reason the built-in runner can't meet the criteria (verified: it can, with `tsx` loader + jsdom). Migrating would also mean rewriting 3 existing, working harnesses for no benefit, against explicit project direction. |
| `jsdom` (recommended) | `happy-dom` (`20.14.5` [VERIFIED: npm registry]) | `happy-dom` is faster and lighter, but less feature-complete/battle-tested for edge cases (older `navigator` property semantics, some event quirks); `jsdom` is the one Testing Library documents and defaults to. Use `happy-dom` only if `jsdom`'s install/startup cost becomes a measured problem — not expected at this test-file count. |
| `tsx` loader (recommended) | Hand-written `node:module` `registerHooks()` + `esbuild.transformSync` | Technically possible (Node 24 has `module.registerHooks`, sync hooks), but that API is Stability "1.1 Active Development"/experimental as of Node 24-era docs [CITED: nodejs.org/api/module.html] — less stable than depending on the mature, widely-used `tsx` package which wraps the same mechanism and tracks Node API changes for you. |
| Full DOM render (`jsdom` + Testing Library) for `useDashboard`/`AuthContext` tests (recommended) | Extract "reducible logic" into pure functions, test those without any DOM | Rejected as the primary strategy — QUAL-06 explicitly requires covering session restoration, filter changes, **background refresh**, and **offline state**, which are defined by the interaction between React effects and real browser events/timers (`visibilitychange`, `online`/`offline`, `setInterval`). Testing only extracted pure logic would leave the actual effect-wiring (the part most likely to regress) uncovered, and would require refactoring two files whose refactor is not in this phase's scope. A real DOM is also consistent with this project's own established testing philosophy (`consistency-sql.mjs` uses a *real* embedded Postgres instead of mocking SQL; `consistency-edge.test.mjs` runs the *real* Edge Function source, faking only the runtime boundary). Hand-rolled fakes for `window`/`document`/`navigator` remain a legitimate fallback for small, isolated new assertions, but should not replace jsdom as the base environment. |
| `react-test-renderer` (not recommended) | — | Still technically works with React 18.3, but the React team has been steering the ecosystem away from it toward Testing Library + a real DOM; introducing it in 2026 for a hook test is swimming against the current, not the standard. |

**Installation:**
```bash
npm install --save-dev eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals jsdom @testing-library/react @testing-library/dom tsx
```
`@electric-sql/pglite@0.3.14` also needs an explicit `npm install --save-dev @electric-sql/pglite@0.3.14` — it is currently not declared anywhere in `package.json` (confirmed: absent from both `dependencies` and `devDependencies`).

**Version verification:** All versions above were checked against the live npm registry in this research session (`npm view <pkg> version`) on 2026-10-06. Re-run before planning executes if more than a few days pass.

## Architecture Patterns

### System Architecture Diagram (test execution flow)

```
  git push
     │
     ▼
┌─────────────────────────── GitHub Actions CI ───────────────────────────┐
│                                                                           │
│  checkout (actions/checkout@v7)                                         │
│         │                                                                │
│         ▼                                                                │
│  setup-node (actions/setup-node@v7, node-version: 24)                   │
│         │                                                                │
│         ▼                                                                │
│  npm ci                                                                  │
│         │                                                                │
│         ├──────────────┬──────────────────┬─────────────────────┐       │
│         ▼              ▼                  ▼                     │       │
│    npm run build   npm run lint      npm test                    │       │
│    (tsc -b +        (eslint .,        (node --test over          │       │
│     vite build)      two rule         *.test.mjs/.test.ts/.tsx   │       │
│                       blocks by        via --import tsx/esm,     │       │
│                       `files` glob)    THEN node                 │       │
│                                         tests/consistency-sql.mjs)│       │
│         │              │                  │                     │       │
│         └──────────────┴──────────────────┴─────────────────────┘       │
│                              │                                          │
│                     any non-zero exit code                             │
│                              ▼                                          │
│                     CI run marked failed, visible on PR/commit          │
└───────────────────────────────────────────────────────────────────────┘

  Inside `npm test` (local or CI), per-suite data flow:

  channelInsights.test.mjs ──imports (type-stripped)──► src/utils/channelInsights.ts
       (pure functions, plain object fixtures, no I/O)

  consistency-edge.test.mjs ──reads as text, strips types──► supabase/functions/dashboard-whatsapp/index.ts
       │
       └─ runs real source in vm.runInNewContext() with faked Deno/createClient globals

  consistency-sql.mjs ──spins up──► PGlite (real embedded Postgres)
       │
       └─ loads baseline-functions.sql + 01-apply.sql, asserts on dashboard_snapshot() RPC output

  useDashboard.test.(mjs|ts) [NEW] ──mocks via t.mock.module()──► src/services/dashboard.ts
       │                                                           (getDashboardSnapshot faked)
       └─ renders hook via @testing-library/react + jsdom, drives fake timers / dispatches
          window 'online'/'offline', document visibilitychange

  AuthContext.test.tsx [NEW] ──mocks via t.mock.module()──► src/lib/supabase.ts
       │                                                     (supabase client faked)
       └─ loaded via `--import tsx/esm` (JSX transform), rendered via
          @testing-library/react in jsdom, asserts session-restore transitions
```

### Recommended Project Structure (additions only — no existing files move)
```
.github/
└── workflows/
    └── ci.yml                      # tsc -b, lint, npm test on push/PR
eslint.config.js                    # flat config, two `files`-scoped blocks (src/, supabase/functions/)
tests/
├── channelInsights.test.mjs        # existing — unchanged
├── consistency-edge.test.mjs       # existing — unchanged
├── consistency-sql.mjs             # existing — unchanged, becomes part of `npm test`
├── build-consistency-package.py    # existing — document as manual tool, NOT part of npm test
├── useDashboard.test.ts            # NEW — no JSX needed (hook file has none); native node:test stripping works
└── AuthContext.test.tsx            # NEW — requires `--import tsx/esm` loader (source has JSX)
README.md                           # NEW
CLAUDE.md                           # NEW
```

### Pattern 1: Two-block ESLint flat config for divergent style areas
**What:** A single `eslint.config.js` exporting an array; one config object scoped to `src/**/*.{ts,tsx}` with `rules: { semi: ['error','never'], quotes: ['error','single'] }` and `languageOptions.globals` for browser; a second scoped to `supabase/functions/**/*.ts` with `rules: { semi: ['error','always'], quotes: ['error','double'] }` and `languageOptions.globals: globals.denoBuiltin`.
**When to use:** Any monorepo-ish layout where one area intentionally diverges in style from another (this is exactly QUAL-03's constraint — "lint must accommodate, not force unification").
**Example:**
```javascript
// Source: ESLint flat-config docs (eslint.org/docs/latest/use/configure/configuration-files) [CITED]
// and verified package exports (eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals) [VERIFIED locally]
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
Note: `typescript-eslint`'s type-aware rules normally need a `tsconfig.json` project reference per block via `languageOptions.parserOptions.project`. `supabase/functions/` has no `tsconfig.json` today (it's Deno, type-checked by the Deno toolchain, not `tsc`) — scope that block to **non-type-aware** rules only (`tseslint.configs.recommended`, not `recommendedTypeChecked`) to avoid requiring a tsconfig that doesn't exist and isn't meaningful for Deno's `npm:` import style.

### Pattern 2: `npm test` as an orchestrator script, not a single `node --test` invocation
**What:** `package.json` `"test"` script runs the native-stripping-eligible suites with `node --test`, loads the `tsx` ESM hook only for the files that need it, then separately invokes the standalone SQL script, and fails the whole command if any step fails.
**When to use:** Exactly this phase's QUAL-01 — "um único comando descobrível" that fails when any of the suites breaks.
**Example:**
```json
{
  "scripts": {
    "test": "node --import tsx/esm --experimental-test-module-mocks --test \"tests/**/*.test.{mjs,ts,tsx}\" && node tests/consistency-sql.mjs"
  }
}
```
[VERIFIED in this session: `node --import tsx/esm --test` correctly transforms and runs a `.tsx` test file with real JSX, provided `tsconfig.json`'s `jsx` compiler option is set — this repo's `tsconfig.app.json` already has `"jsx": "react-jsx"`.] `&&` ensures the second command only runs if `node --test` exits 0, and more importantly, the overall script's exit code is non-zero if either half fails — bash/npm propagates the last command's exit code, and `&&` short-circuits on the first failure, which is the correct "fail fast, fail visibly" behavior for CI. `PGLITE_MODULE` (optional) stays as an environment variable set by the invoker, not hardcoded in the script — document it in README/CLAUDE.md as QUAL-01 requires.

### Pattern 3: Faking only the runtime boundary (Supabase client / service layer), never the logic under test
**What:** Use `node:test`'s module-mock API to replace `src/services/dashboard.ts`'s `getDashboardSnapshot` (for `useDashboard` tests) or `src/lib/supabase.ts`'s `supabase` client (for `AuthContext` tests) with a hand-written fake, while importing and executing the real hook/provider unmodified.
**When to use:** Any test of code whose only non-deterministic/external dependency is a network call — matches this project's existing convention exactly (`consistency-edge.test.mjs` fakes `Deno`/`createClient`, never the handler logic).
**Example:**
```javascript
// Source: Node.js test runner docs (nodejs.org/api/test.html#mockmodulespecifier-options) [CITED]
// mechanics VERIFIED in this session against both a Node built-in module and a local relative .ts module;
// requires the --experimental-test-module-mocks CLI flag in Node 24.15.0 (NOT yet stable without it,
// despite latest upstream docs describing it as "Stable" for a newer Node line — verify against the
// Node version actually pinned in CI).
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('useDashboard refetches when filters change', async (t) => {
  let calls = 0
  t.mock.module(new URL('../src/services/dashboard.ts', import.meta.url).href, {
    exports: { getDashboardSnapshot: async () => { calls++; return fixtureSnapshot() } },
  })
  const { useDashboard } = await import('../src/hooks/useDashboard.ts')
  // ...renderHook(() => useDashboard(filters)) via @testing-library/react, then rerender with new filters
  assert.equal(calls, 2) // initial + filter change
})
```
Partial mocking (keep some real exports, override one) is done by spreading the real module first: `t.mock.module(url, { exports: { ...(await import(url)), oneExport: fakeImpl } })` — [VERIFIED in this session].

### Pattern 4: `navigator`/`window` overrides inside jsdom
**What:** After installing `jsdom`'s window/document as globals, override read-only-looking properties via `Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true, writable: true })`, then dispatch the matching event (`window.dispatchEvent(new window.Event('offline'))`) so the hook's real `addEventListener('offline', ...)` handler fires.
**When to use:** Testing `useDashboard.ts`'s offline/online handling and any other `navigator`/`window` event-driven behavior.
**Example:** [VERIFIED in this session — see Pitfall 2 for the exact failure this avoids]
```javascript
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
// ... later, inside act():
Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true, writable: true })
window.dispatchEvent(new window.Event('offline'))
```

### Anti-Patterns to Avoid
- **Running `build-consistency-package.py` from `npm test` or CI:** it requires `sys.argv[1]` (a CSV path) that doesn't exist in the repo; invoking it with no arguments crashes with `IndexError`, and even with a real CSV it's a generator, not an assertion-bearing test suite in the CI sense. Document it, don't automate it.
- **Adding Prettier "to make lint simpler":** would reformat whichever area the formatter's defaults don't match, violating QUAL-03 and the explicit "Fora de escopo: Unificar convenções de estilo" entry in REQUIREMENTS.md.
- **Using `tseslint.configs.recommendedTypeChecked` on the `supabase/functions/` block:** that preset requires `parserOptions.project` pointing at a real `tsconfig.json`; none exists for the Deno function, and creating one just to satisfy ESLint would be scope creep misrepresenting that code as tsc-managed when it's actually Deno-managed.
- **Writing new test files as `.mjs` while trying to import `AuthContext.tsx` directly:** Node's native stripping will throw `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`-style rejection for `.tsx` regardless of the importing file's extension — the loader must be active (`--import tsx/esm`) for the whole process, not just "for files ending in .tsx".

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Rendering a React hook outside a component | A custom "fake fiber"/manual `useState` re-implementation to call the hook as a plain function | `@testing-library/react`'s `renderHook` over a real `jsdom` document | Hooks have real ordering/dependency-array semantics that only the actual React reconciler implements correctly; a hand-rolled harness will silently diverge from production behavior |
| Faking Supabase auth/session for `AuthContext` tests | A bespoke `EventEmitter`-based fake client | `t.mock.module()` replacing `src/lib/supabase.ts`'s named exports with a plain object shaped like the real client (`{ auth: { getSession, onAuthStateChange, signInWithPassword, signOut } }`) | Keeps the fake's shape obviously tied to the one real contract (`@supabase/supabase-js`'s `SupabaseClient['auth']`), and gets automatic restore-after-test from the test context, same pattern already used for `createClient` in `consistency-edge.test.mjs` |
| TypeScript+JSX transform for test loading | A custom esbuild/Babel pipeline wired into `node:module` hooks | `tsx` (wraps esbuild, maintained, tracks Node loader API changes) | Node's loader-hooks API itself is still "Active Development" stability in the Node 24 line; depending on a maintained wrapper instead of hand-writing the hook is lower risk |
| Dual-style linting | Two separate ESLint invocations with two separate config files glued together by a shell script | One `eslint.config.js` exporting an array with `files`-scoped blocks | Flat config's `files` glob matching is exactly designed for this; a single command (`eslint .`) covers both areas and a single config file is what QUAL-05/README needs to describe |

**Key insight:** every "don't hand-roll" here traces back to the same principle this codebase already follows for its existing three suites: fake the smallest possible boundary (the network/runtime edge), and let the real implementation — React's reconciler, ESLint's config resolution, Node's own loader — do everything else.

## Common Pitfalls

### Pitfall 1: Node's native TypeScript type-stripping cannot load `.tsx` files, at all
**What goes wrong:** Any test file that is itself `.tsx`, or that imports a `.tsx` module (directly or transitively), fails to load under plain `node --test` with an unsupported-syntax error, even though the exact same mechanism works fine for plain `.ts` files with no JSX (like `useDashboard.ts`).
**Why it happens:** Node's built-in stripping ([CITED: nodejs.org/api/typescript.html]) only erases TypeScript *type* syntax by replacing it with whitespace; JSX is not type syntax, it's syntax that must be *transformed* into function calls (`React.createElement`/`jsx()`), which whitespace-erasure cannot do.
**How to avoid:** Load the whole test process through `tsx`'s ESM loader (`node --import tsx/esm --test ...`); confirm `tsconfig.json`'s `jsx` option is set to `react-jsx` (this repo's `tsconfig.app.json` already has it) so `tsx`'s esbuild-backed transform picks the automatic JSX runtime instead of defaulting to the classic transform (which expects a global `React` identifier and will throw `ReferenceError: React is not defined`).
**Warning signs:** `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` or a parse error mentioning `<` where an expression was expected, pointing at a JSX tag; or, if the loader is present but tsconfig isn't picked up, `ReferenceError: React is not defined` at render time. [VERIFIED in this session — both failure modes reproduced before the fix.]

### Pitfall 2: `navigator`/`globalThis.navigator` is a Node built-in, read-only global — plain assignment throws
**What goes wrong:** `globalThis.navigator = dom.window.navigator` throws `TypeError: Cannot set property navigator of #<Object> which has only a getter`.
**Why it happens:** Node itself defines an experimental `navigator` global (exposing things like `navigator.userAgent`) as a getter-only property; jsdom's own `window.navigator` can't just overwrite it with `=`.
**How to avoid:** Use `Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })` for the initial setup, and the same pattern (`Object.defineProperty(window.navigator, 'onLine', { value, configurable: true, writable: true })`) for flipping `onLine` mid-test.
**Warning signs:** The `TypeError` above, thrown at module top-level before any test even runs (so the whole file reports as failed, not a specific assertion). [VERIFIED in this session.]

### Pitfall 3: `t.mock.module` requires `--experimental-test-module-mocks` on Node 24.15.0, contrary to what the latest upstream docs imply
**What goes wrong:** Code copied from current Node.js docs (which may reflect a newer Node line than what's actually pinned in this repo/CI) omits the flag because the docs describe the feature as "Stable." Running it without the flag on Node 24.15.0 gives `typeof t.mock.module === 'undefined'`.
**Why it happens:** Module mocking stabilized at different points across Node release lines; this repo's pinned runtime (Node 24.15.0, confirmed via `node --version` and matched exactly by `jsdom@30.1.2`'s `engines.node` range) still gates it behind the experimental flag.
**How to avoid:** Always pass `--experimental-test-module-mocks` in both the `test` npm script and the CI workflow; don't rely on flag-free docs examples without checking the actual pinned Node version first.
**Warning signs:** `t.mock.module is not a function` or `undefined`; the `(node:X) ExperimentalWarning: Module mocking is an experimental feature` message only appears when the flag IS present — its *absence* at runtime (no warning, no error, just silent no-op) is the subtler failure mode to watch for if the flag is dropped from one script but not another. [VERIFIED in this session against the exact locally-installed Node 24.15.0.]

### Pitfall 4: `t.mock.module`'s `exports` option replaces the whole module, not just the named export you pass
**What goes wrong:** `t.mock.module(url, { exports: { oneExport: fake } })` makes every *other* export of that module `undefined` to any consumer, even ones the test doesn't care about.
**Why it happens:** The deprecated `namedExports` option used to merge; the current `exports` option is a full replacement (confirmed by the deprecation warning: "options.namedExports is deprecated. Use options.exports instead" plus observed behavior).
**How to avoid:** Spread the real module first: `t.mock.module(url, { exports: { ...(await import(url)), oneExport: fake } })`, and call `t.mock.module(...)` **before** anything else imports that same specifier for the first time in the process — mocks don't retroactively apply to an already-resolved module graph.
**Warning signs:** Unrelated functionality from the "mocked" module silently becomes `undefined` deep inside the component/hook under test, producing confusing downstream errors unrelated to the thing being tested. [VERIFIED in this session.]

### Pitfall 5: `build-consistency-package.py` looks like a fourth test suite but isn't one
**What goes wrong:** Treating it as part of `npm test`/CI produces a guaranteed, permanent failure (`IndexError: list index out of range` on `sys.argv[1]`), because it has no default input and the CSV it expects is a manual, one-time Supabase export that is not and should not be committed to the repo.
**Why it happens:** It lives in `tests/` and has the word "build" + relates to the same `consistency-v1` package the other suites validate, inviting the assumption it's part of the same automated suite.
**How to avoid:** Document it in CLAUDE.md/README as a manual regeneration tool ("run this by hand, with a freshly exported CSV, only when re-synchronizing `supabase/consistency-v1/` from a new Supabase export"), explicitly excluded from `npm test`.
**Warning signs:** A CI run that always fails at exactly this step with no code change having touched Python at all. Also: Python itself is **not installed** on the machine this research was performed on (only Windows Store execution-alias stubs exist at `python`/`python3`, which print a "not found, install from Store" message when actually invoked) — see Environment Availability.

### Pitfall 6: `02-rollback.sql` / `03-validate.sql` / `baseline-functions.sql` must never be run as a live migration
**What goes wrong:** `baseline-functions.sql` is explicitly "referência exportada e entrada dos testes. **Não executar como migração.**" per `supabase/consistency-v1/README.md`. Phase 1 doesn't touch Supabase, but the runbook documentation this phase writes (QUAL-05) must carry this warning forward verbatim, since Phase 2 will be the first to actually act on it.
**Why it happens:** The file's SQL content is syntactically a valid migration-shaped script, making it easy for a future reader (or an agent) to assume it's meant to be applied directly.
**How to avoid:** CLAUDE.md/README's consistency-v1 runbook section must reproduce the warning, not just link to the nested README.
**Warning signs:** None detectable automatically from this repo — this is a documentation-discipline pitfall, not a code one.

## Code Examples

### `npm test` wiring all suites (QUAL-01)
```json
// Source: synthesized from verified Node --test / --experimental-test-module-mocks behavior
// and the existing tests/ layout (TESTING.md)
{
  "scripts": {
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "node --import tsx/esm --experimental-test-module-mocks --test \"tests/**/*.test.{mjs,ts,tsx}\" && node tests/consistency-sql.mjs"
  }
}
```

### Declaring PGlite as test-only (QUAL-02/QUAL-06)
```bash
# Source: supabase/consistency-v1/README.md pins 0.3.14; verified absent from current package.json
npm install --save-dev @electric-sql/pglite@0.3.14
```
```javascript
// tests/consistency-sql.mjs:4 — existing escape hatch, keep as-is (works with the above install)
const { PGlite } = await import(process.env.PGLITE_MODULE ? pathToFileURL(process.env.PGLITE_MODULE).href : '@electric-sql/pglite')
```

### GitHub Actions workflow (QUAL-04)
```yaml
# .github/workflows/ci.yml
# Source: actions/checkout and actions/setup-node major versions per WebSearch,
# cross-referenced across multiple sources dated 2026 [CITED, MEDIUM confidence — verify
# against the live Marketplace listing at plan time since action majors move independently of this research]
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

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `.eslintrc.*` (JSON/YAML/JS cascading config) | Flat config (`eslint.config.js`), single exported array | ESLint 9 (2024) made flat config the default; ESLint 10.0.1 [VERIFIED: npm] has no `.eslintrc` fallback at all | Any lint setup guide referencing `.eslintrc` or `"extends": [...]` string arrays is stale; this phase must use flat config from the start |
| `ts-node` / Babel for running TS test files | Node's native type-stripping (`node --test` on `.ts`/`.mts`/`.cts`, stable) | Stabilizing across the Node 23→24 line | Removes a whole class of "transpile step before test" setup for every file **except** `.tsx` (Pitfall 1) |
| `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` as two installs | `typescript-eslint` single meta-package | Standard since v8 | Simpler `package.json`; same underlying behavior |
| `--experimental-loader` (async, off-thread) module customization | `module.registerHooks()` (sync, main-thread) | Introduced ~Node 22-23 line, still marked below Release Candidate stability as observed via current docs during this research | Relevant background for why this research recommends depending on `tsx` instead of hand-writing a loader — the underlying API is still moving |

**Deprecated/outdated:**
- `t.mock.module`'s `namedExports` option: deprecated in favor of `exports` (full replacement semantics) — observed directly in this session's Node 24.15.0 output.
- `react-test-renderer`: not formally removed, but the ecosystem (Testing Library, React core team guidance) has moved to real-DOM testing; don't introduce it fresh in 2026.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@electric-sql/pglite` should stay pinned at `0.3.14` rather than bumped to the current `0.5.8` latest | Standard Stack | If the planner/user wants the latest PGlite, `tests/consistency-sql.mjs`'s fixture-table setup and role/grant assertions would need re-validation against the newer version's behavior — not verified in this session either way |
| A2 | `build-consistency-package.py` should be excluded from `npm test`/CI entirely (treated as a documented manual tool) | Summary, Pitfall 5 | This directly contradicts the roadmap's "quatro suítes" phrasing and the task's own additional-context instruction to wire it in; if the user actually wants a CI step that at least smoke-tests the script doesn't crash (e.g., running it against a committed sample fixture CSV), that's a different, buildable requirement not currently specified anywhere — needs explicit confirmation before planning locks this in either direction |
| A3 | GitHub Actions `actions/checkout@v7` / `actions/setup-node@v7` are the correct current major versions to pin | Code Examples (CI workflow) | Action majors are released independently of this research date; if a newer major shipped between 2026-10-06 and plan execution, CI setup would use a slightly stale (but still functional) pin — low risk, since GitHub maintains back-compat within reasonable windows |
| A4 | New `.ts`/`.tsx` test files should NOT be added to any `tsconfig.*.json` project reference (left type-stripped-only, like the existing `.mjs` tests) | Architecture Patterns / Project Structure | If the user wants `tsc -b` to type-check the new test files too, a `tsconfig.test.json` (or extending `tsconfig.app.json`'s `include`) would be needed, plus `@types/node` as a devDependency — currently absent from `package.json` entirely |
| A5 | `eslint-plugin-react-hooks`'s `recommended-latest` preset (rather than `flat`) is the right one for this project | Architecture Patterns (Pattern 1) | Both exist [VERIFIED locally]; `recommended-latest` tracks the plugin's current rule set including newer React Compiler-related rules, `flat` is a narrower/older alias — if the user's React usage patterns trigger false positives from the newer rules, `flat` is the fallback, not a blocker |

**If this table is empty:** N/A — see rows above; all other factual claims in this document were either verified by direct command execution in this session or cited to a fetched official-docs page.

## Open Questions

1. **Is `build-consistency-package.py` actually meant to be part of `npm test`, or is the roadmap's "quatro suítes" phrasing simply imprecise?**
   - What we know: `REQUIREMENTS.md`'s QUAL-01 text only names two things — `node --test tests/*.test.mjs` and `node tests/consistency-sql.mjs`. The roadmap's Phase 1 success criterion #1 says "quatro suítes." The script itself (read in full during this research) requires a CLI argument pointing at a CSV that isn't in the repo, and has no assertions of its own beyond internal `replace_once` sanity checks that only run if given real input.
   - What's unclear: Whether "quatro suítes" is simply counting all four files under `tests/` loosely (including the non-test generator) without intending it to run unattended in CI, or whether the user actually wants some CI-safe smoke test of the script (e.g., committing a tiny fixture CSV and running the script against it as a 4th assertion-bearing step).
   - Recommendation: Planner should surface this to the user explicitly before locking QUAL-01's task list. Default recommendation (Assumption A2): document the script as manual-only, keep `npm test` at 3 suites, satisfying the literal REQUIREMENTS.md wording.

2. **Should `@electric-sql/pglite` be bumped from `0.3.14` to the current `0.5.8`, or stay pinned?**
   - What we know: The existing harness and README were authored and tested against `0.3.14` specifically; `0.5.8` is current on npm.
   - What's unclear: Whether `0.5.8`'s behavior (role/grant handling, `db.exec`/`db.query` API surface) is still compatible with `tests/consistency-sql.mjs`'s exact usage — not tested in this session.
   - Recommendation: Pin `0.3.14` for this phase (lowest risk, matches documented/tested state); leave a version-bump evaluation as a follow-up, not blocking Phase 1.

3. **Does the user want test-file type-checking (`tsc -b` coverage) for the new `useDashboard.test.ts`/`AuthContext.test.tsx`, or is runtime-only (type-stripped) sufficient, matching the existing `.mjs` suites?**
   - What we know: Current `.mjs` suites are not type-checked by `tsc -b` at all (not included in any tsconfig reference) and the project has shipped fine this way.
   - What's unclear: Whether adding typed test files changes that expectation.
   - Recommendation: Default to consistency with the existing pattern (no tsconfig inclusion, no `@types/node` dependency added) unless the user's CONTEXT.md/discussion says otherwise.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All of `npm test`, `npm run build`, `npm run lint`, CI | ✓ | 24.15.0 [VERIFIED locally] | — |
| npm | Package install/scripts | ✓ | 11.12.1 [VERIFIED locally] | — |
| Python (3.x) | `tests/build-consistency-package.py` (manual tool only, per Assumption A2) | ✗ | — (only Windows Store execution-alias stubs present at `python`/`python3`, which print an install-redirect message when invoked; no real interpreter installed) [VERIFIED locally] | Not required for `npm test`/CI if Pitfall 5's recommendation is followed; if the user insists on running this script in CI, Python would need to be installed via `actions/setup-python` in the GitHub runner (where real Python is always available) even though it's absent on this local dev machine |
| Deno CLI | Not required — `supabase/functions/dashboard-whatsapp/index.ts` is linted via ESLint in this phase, not `deno lint`/`deno fmt` | ✗ | — [VERIFIED locally: `deno` not found] | ESLint flat-config block with Deno globals (Pattern 1) substitutes; this is a deliberate choice for this phase, not a gap, since QUAL-03 asks for "lint" (singular command) over both areas |
| `gh` CLI | Not required for this phase (CI is a committed YAML file, no `gh` calls needed to author it) | ✗ | — [VERIFIED locally: `gh` not found] | N/A |
| GitHub remote | QUAL-04 ("CI dispara ao push") | ✓ | Remote confirmed: `https://github.com/Luizphdata/DAHSADONAY.git`, branches `main` and `gsd/onboarding` [VERIFIED locally via `git remote -v`] | — |

**Missing dependencies with no fallback:**
- None that block this phase's success criteria, provided `build-consistency-package.py` is treated as documentation-only (Assumption A2).

**Missing dependencies with fallback:**
- Python: see table above — only relevant if the user overrides Assumption A2.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node built-in `node:test` (Node 24.15.0 locally), run via `npm test` |
| Config file | None required by `node:test` itself; `tsconfig.app.json`'s `"jsx": "react-jsx"` is read by the new `tsx` ESM loader |
| Quick run command | `node --import tsx/esm --experimental-test-module-mocks --test tests/useDashboard.test.ts` (single new file, fast feedback) |
| Full suite command | `npm test` (all suites + SQL script) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| QUAL-01 | `npm test` runs all real suites in one command, fails on any break | integration (meta) | `npm test` | ❌ Wave 0 — needs `package.json` `"test"` script |
| QUAL-02 | `@electric-sql/pglite@0.3.14` is devDependency-only; missing-dep failure is clear | manual/config check | `npm ls @electric-sql/pglite --omit=dev` (should print nothing) | ❌ Wave 0 — needs `package.json` edit + install |
| QUAL-03 | `eslint .` lints both areas with no cross-contamination of style | lint (static) | `npm run lint` | ❌ Wave 0 — needs `eslint.config.js` + devDependencies |
| QUAL-04 | CI runs `tsc -b`, lint, tests on push; failure is visible | CI (external) | GitHub Actions run status on a pushed commit/PR | ❌ Wave 0 — needs `.github/workflows/ci.yml` |
| QUAL-05 | README.md + CLAUDE.md answer run/test/convention/runbook questions, including the `baseline-functions.sql` non-migration warning | doc-existence + content check | manual review (no automated doc-content test exists or is proposed) | ❌ Wave 0 — needs both files created |
| QUAL-06 | `useDashboard.ts` session restore / filter change / background refresh / offline covered; `AuthContext.tsx` session restore covered | unit/integration (jsdom + Testing Library) | `node --import tsx/esm --experimental-test-module-mocks --test tests/useDashboard.test.ts tests/AuthContext.test.tsx` | ❌ Wave 0 — needs both new test files + jsdom/Testing Library/tsx devDependencies |

### Sampling Rate
- **Per task commit:** run the specific new/changed test file directly (quick run command above), plus `npm run lint` on changed files.
- **Per wave merge:** `npm test` (full suite) + `npm run build` (`tsc -b && vite build`).
- **Phase gate:** Full `npm test` + `npm run lint` + `npm run build` green locally, AND a pushed commit showing a green GitHub Actions run, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `package.json` — add `"test"` and `"lint"` scripts; add all devDependencies listed in Standard Stack.
- [ ] `eslint.config.js` — two-block flat config (Pattern 1).
- [ ] `.github/workflows/ci.yml` — CI pipeline (Code Examples).
- [ ] `tests/useDashboard.test.ts` — new, covers session-independent parts of QUAL-06 (filters, background refresh, offline).
- [ ] `tests/AuthContext.test.tsx` — new, covers session-restoration part of QUAL-06.
- [ ] `README.md`, `CLAUDE.md` — new, QUAL-05.
- [ ] Explicit `@electric-sql/pglite@0.3.14` devDependency entry in `package.json` (currently fully absent).

## Security Domain

This phase makes no changes to authentication, authorization, input validation, or cryptography logic — it only adds tests around existing auth code (`AuthContext.tsx`) and build/lint/CI tooling. The ASVS categories most tempting to apply here (V2 Authentication, V3 Session Management) describe the *application's* controls, which this phase observes via tests but does not modify (that's explicitly CONS-07/Phase 2+ territory for the Edge Function side, and out of scope entirely for the frontend auth flow in this phase).

| ASVS Category | Applies to this phase | Standard Control |
|---------------|------------------------|-------------------|
| V2 Authentication | No — not modified | N/A (tested, not changed) |
| V3 Session Management | No — not modified | N/A (tested, not changed) |
| V5 Input Validation | No new input surfaces introduced | N/A |
| V6 Cryptography | No | N/A |
| V14 Configuration / Supply Chain | Yes — indirectly | Keeping `@electric-sql/pglite` out of `dependencies` (QUAL-02) is itself a minimal supply-chain control: it prevents a test-only native-code-adjacent package from shipping in the production bundle/build graph. CI pinning Node major version (`24`) via `setup-node` is the other relevant V14-ish control introduced here. |

No STRIDE-relevant new threat surface is introduced by this phase (no new network endpoints, no new data flows into the Supabase boundary). The one secrets-adjacent note: CI must not need `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`/Supabase secrets to run `npm test`/`npm run lint`/`tsc -b` — all three existing test harnesses fake the Supabase boundary already, and the new hook/context tests must do the same (Pattern 3), so CI should run green with **zero** real secrets configured. If the planner finds a path where CI needs a real secret to pass, that's a signal something is testing against the live network rather than a fake boundary, and should be corrected rather than solved by adding a GitHub Actions secret.

## Sources

### Primary (HIGH confidence — verified via direct execution or npm registry in this session)
- npm registry `npm view <package> version/engines/peerDependencies` for: eslint, typescript-eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, @testing-library/react, @testing-library/dom, tsx, esbuild, happy-dom, @electric-sql/pglite, @testing-library/jest-dom
- Direct local execution (Node 24.15.0, this session, in an isolated scratch directory, no project files touched): `node --test` default discovery behavior, `t.mock.module` requiring `--experimental-test-module-mocks`, partial-mock-via-spread pattern, `node --import tsx/esm --test` running a real `.tsx` file with JSX (classic-transform failure then automatic-transform success once `tsconfig.json`'s `jsx` option was set), `jsdom` + `@testing-library/react`'s `renderHook`/`render`, `navigator.onLine` override via `Object.defineProperty`, `globals` package's `denoBuiltin` export, `eslint-plugin-react-hooks`'s `recommended-latest`/`flat` configs, `eslint-plugin-react-refresh`'s `vite` config
- This repo's own files: `package.json`, `tsconfig.json`/`tsconfig.app.json`/`tsconfig.node.json`, `vite.config.ts`, `.env.example`, `.gitignore`, `tests/*.mjs`, `tests/build-consistency-package.py`, `src/hooks/useDashboard.ts`, `src/contexts/AuthContext.tsx`, `supabase/functions/dashboard-whatsapp/index.ts` (partial), `supabase/consistency-v1/README.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/codebase/{TESTING,CONVENTIONS,STACK,CONCERNS}.md`

### Secondary (MEDIUM confidence — WebFetch of official docs, or WebSearch cross-checked against multiple sources)
- nodejs.org/api/test.html — default test discovery globs, exit-code-on-failure behavior, `--experimental-test-coverage` options [fetched this session]
- nodejs.org/api/typescript.html — type-stripping scope and `.tsx` exclusion, unsupported syntax list [fetched this session]
- nodejs.org/api/module.html#customization-hooks — stability of `register()` vs `registerHooks()` [fetched this session; stability levels described reflect the Node docs version served at fetch time, which may be ahead of the locally pinned Node 24.15.0 — treat the *exact* stability label with caution, the directional claim (still actively evolving) is solid]
- eslint.org/docs/latest/use/configure/configuration-files — flat config `files`/`ignores`/`languageOptions.globals` syntax [fetched this session]
- WebSearch: GitHub Actions `actions/checkout`/`actions/setup-node` current major versions (v7/v7) as of 2026 — corroborated across multiple independent results (GitHub repo tags, migration blog posts) but not fetched directly from the GitHub Marketplace page itself

### Tertiary (LOW confidence — flagged for validation)
- None retained as authoritative; the one earlier training-knowledge-only claim (that `t.mock.module` was simply "stable" per generic knowledge) was explicitly checked and corrected during this session rather than left as an assumption.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version/peer-dependency claim checked against the live npm registry this session
- Architecture (test loader + DOM strategy): HIGH — the two hardest claims (Node refuses `.tsx`; `navigator` is read-only) were reproduced live and the fixes verified live, not taken on faith
- Pitfalls: HIGH for Pitfalls 1-4 (all reproduced live); MEDIUM for Pitfall 5/6 (file-content reading, not live reproduction, but direct and unambiguous)
- CI action versions: MEDIUM — WebSearch-sourced, not fetched from an authoritative single source, but cross-corroborated

**Research date:** 2026-10-06
**Valid until:** ~30 days for the Node/ESLint/Testing-Library ecosystem claims (fast-moving but not volatile week-to-week); re-verify npm versions immediately before planning if more than ~2 weeks elapse. GitHub Actions action-major-version claim should be re-checked at plan time regardless of elapsed time, since it was the lowest-confidence item in this research.
