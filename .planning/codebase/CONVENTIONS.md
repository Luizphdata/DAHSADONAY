# Coding Conventions

**Analysis Date:** 2026-10-06

## Naming Patterns

**Files:**
- React components: PascalCase matching the exported component, e.g. `src/components/dashboard/Overview.tsx`, `src/components/ConfigurationErrorScreen.tsx`, `src/pages/Dashboard.tsx`.
- Non-component modules (hooks, services, utils, lib, types, config): camelCase, e.g. `src/hooks/useDashboard.ts`, `src/services/dashboard.ts`, `src/utils/channelInsights.ts`, `src/lib/supabase.ts`, `src/config/dashboard.ts`.
- Test files: `<subject>.test.mjs` in `tests/`, independent of the source file's extension (source is `.ts`, test is `.mjs`), e.g. `tests/channelInsights.test.mjs` tests `src/utils/channelInsights.ts`.
- Supabase edge functions live under `supabase/functions/<function-name>/index.ts` (kebab-case directory name matching the Supabase function name, e.g. `dashboard-whatsapp`).
- SQL migration/consistency files use numeric prefixes: `supabase/consistency-v1/01-apply.sql`, `02-rollback.sql`, `03-validate.sql`.

**Functions:**
- camelCase for all TypeScript/React functions and hooks: `getDashboardSnapshot`, `useDashboard`, `compareChannel`, `hasPreviousCoverage`, `getChannelDetail`, `inspectSnapshot`.
- Hooks always prefixed `use`: `useDashboard`, `useAuth`.
- Boolean-returning helpers read as predicates: `hasPreviousCoverage`, `isAutomaticRefresh` (local var), `valid(...)` (local closure in `inspectSnapshot`).
- Deno edge function (`supabase/functions/dashboard-whatsapp/index.ts`) also uses camelCase for local JS/TS identifiers (`corsHeaders`, `allowedOrigins`) despite Portuguese section-header comments.

**Variables:**
- camelCase throughout frontend/TS code: `requestSequence`, `lastSuccessfulUpdateAt`, `loadedFilterKey`.
- Refs for mutable state that should not trigger re-render are named descriptively and co-located at the top of the hook, e.g. `src/hooks/useDashboard.ts:21-28`.
- Snake_case is used only for data shapes coming from the backend/Postgres API (API payload fields), e.g. `valid_clicks`, `google_ads_clicks`, `current_day` in `src/types/dashboard.ts`. Do not convert these to camelCase — they mirror the Supabase RPC/SQL response contract.

**Types:**
- PascalCase, prefixed `Dashboard` for domain types tied to the snapshot contract: `DashboardSnapshot`, `DashboardKpiValues`, `DashboardBreakdowns`, `DashboardCampaign` (`src/types/dashboard.ts`).
- Prop types for a component are named `<Component>Props` and declared as `type`, not `interface`: `ErrorBoundaryProps`, `ErrorBoundaryState`, `AuthProviderProps` (`src/components/ErrorBoundary.tsx`, `src/contexts/AuthContext.tsx`).
- Union/enum-like string literals are modeled as string literal union types, not TS `enum`: `type DashboardPreset = 'hoy' | 'ayer' | '7d' | ...`, `type AttributionModel = 'first' | 'last'`, `type RefreshSource = 'initial' | 'filter' | ...` (`src/hooks/useDashboard.ts:11`).

## Code Style

**Formatting:**
- No Prettier config present (no `.prettierrc*` file). Style is enforced only by convention/habit, observed as: no semicolons in `.ts`/`.tsx` files under `src/`, single quotes for strings, 2-space indentation.
- Contrast: `supabase/functions/dashboard-whatsapp/index.ts` (Deno edge function) DOES use semicolons and double quotes — it follows Deno's own style conventions, distinct from the Vite/React frontend code in `src/`. When editing files in `supabase/functions/`, match that file's existing semicolon/double-quote style rather than the frontend's semicolon-free style.
- Lines are frequently long and dense in JSX-heavy files (e.g. `src/components/dashboard/Overview.tsx` has many 150+ character lines combining JSX, ternaries, and inline styles). This is the established style for presentational components — prioritize correctness over line-splitting when editing these files.

**Linting:**
- No ESLint/Biome config present in the repo (no `.eslintrc*`, `eslint.config.*`, or `biome.json`). TypeScript's `strict: true` (`tsconfig.app.json:11`) is the primary static safety net.
- `tsconfig.app.json` enables `strict`, `isolatedModules`, `noEmit`, `forceConsistentCasingInFileNames` — treat type errors from `tsc -b` (part of `npm run build`) as the de facto lint gate.

## Import Organization

**Order (observed in every file):**
1. External/third-party packages first: `react`, `react-router-dom`, `@supabase/supabase-js`, `recharts`, `lucide-react`.
2. Internal relative imports next, ordered roughly by proximity/dependency: `../config/...`, `../services/...`, `../types/...`, `../utils/...`, `./contexts/...`.
3. `import type { ... }` is used explicitly for type-only imports and kept separate from value imports even from the same module when practical (e.g. `src/hooks/useDashboard.ts:9`: `import type { DashboardRequest, DashboardSnapshot } from '../types/dashboard'`).

**Path Aliases:**
- None configured. All internal imports use relative paths (`../`, `./`). No `@/` or baseUrl alias exists in `tsconfig.app.json` or `vite.config.ts` — follow this when adding new files; do not introduce aliases without updating both configs.

## Error Handling

**Patterns:**
- User-facing error strings are written in Spanish and are specific/instructional, not generic: `'La configuración de Supabase no está disponible.'` (`src/lib/supabase.ts`, `src/services/dashboard.ts`, `src/contexts/AuthContext.tsx`), `'La función dashboard-whatsapp no devolvió una respuesta válida.'` (`src/services/dashboard.ts:21`).
- Service layer (`src/services/dashboard.ts`) throws plain `Error` objects or rethrows the Supabase client's own error; it does not define custom Error subclasses.
- `src/hooks/useDashboard.ts` never lets a thrown error escape to the component tree for expected failure modes: network/offline state and fetch failures are converted into boolean state flags (`error`, `backgroundError`, `isOffline`) consumed by the UI, distinguishing "no data yet" (`error`) from "had data, refresh failed" (`backgroundError`) — follow this distinction when adding new data-fetching flows.
- `src/components/ErrorBoundary.tsx` is a class component (required by React for error boundaries) catching render-time errors only, shown as a full-screen recovery UI with a reload button. It intentionally only logs in dev mode (`import.meta.env.DEV`) via `console.error` — never logs to an external service (no error tracking integration exists; see CONCERNS.md-equivalent analysis if present).
- Validation of malformed/suspicious domain data (not exceptions) is done via accumulator-style functions that return arrays of human-readable issue strings rather than throwing, e.g. `inspectSnapshot` in `src/utils/channelInsights.ts:39-53` returns `string[]` of Spanish-language data-integrity warnings, rendered directly in the UI (`Overview.tsx:25`).
- Edge function (`supabase/functions/dashboard-whatsapp/index.ts`) validates input and auth up front, returning HTTP status codes (`401`, `403`, `503`, `400`, `502`) with JSON error bodies before doing any data work — see `tests/consistency-edge.test.mjs` for the exact contract.

**Dev-only logging:**
- Both `src/hooks/useDashboard.ts:108-110` and `src/components/ErrorBoundary.tsx:20-22` gate `console.error` behind `import.meta.env.DEV`, with a consistent log prefix `'[Adonay Dashboard] ...'`. Reuse this prefix and DEV-gating pattern for any new dev diagnostics.

## Comments

**When to Comment:**
- Comments are sparse in frontend TypeScript and used only to explain non-obvious business rules, not to narrate code, e.g. `src/utils/channelInsights.ts:3`: `// Only map categories whose grain matches the previous-period KPI.`
- The Deno edge function (`supabase/functions/dashboard-whatsapp/index.ts`) uses large banner comments in Portuguese to delimit sections: `/* ===== CONFIGURAÇÃO SUPABASE ===== */`, `/* ===== ORIGENS PERMITIDAS ===== */`, `/* ===== E-MAILS AUTORIZADOS ===== */`. Follow this banner style if adding new top-level sections to that file.
- No JSDoc/TSDoc usage observed anywhere in the codebase — type signatures and descriptive naming substitute for doc comments.

## Function Design

**Size:**
- Utility/pure functions are kept small and single-purpose (`src/utils/channelInsights.ts`, `src/utils/formatters.ts` — each function 1-15 lines).
- React components, especially presentational ones, are large single-function files with substantial inline JSX and derived-value computation at the top of the function body before the `return` (`src/components/dashboard/Overview.tsx` — one ~75-line component function; `src/pages/Dashboard.tsx` — 612 lines total, single default-exported component). When extending these, prefer adding more derived `const`s near the top rather than extracting new components unless the addition is independently reusable.

**Parameters:**
- Functions operating on the dashboard snapshot take the whole `DashboardSnapshot` object plus a specific key, rather than pre-extracting values by the caller, e.g. `compareChannel(snapshot: DashboardSnapshot, channel: string, current: number)`, `getChannelDetail(snapshot: DashboardSnapshot, channel: string)`. Follow this signature shape (`snapshot` first, then specifics) for new snapshot-derived helpers in `src/utils/`.
- React components take a single destructured props object typed inline or via a `type ...Props` alias: `{ snapshot, attribution }: { snapshot: DashboardSnapshot; attribution: AttributionModel }` (`Overview.tsx:7`).

**Return Values:**
- Functions that may be "unavailable" return a discriminated-ish object with a `state` string literal field (`'unavailable' | 'new' | 'up' | 'down' | 'unchanged'`) alongside nullable numeric fields, rather than throwing or returning `undefined` — see `compareChannel` return type in `src/utils/channelInsights.ts:13-21`. Reuse this "state + nullable fields" shape for new comparison/derived-metric helpers.
- Formatters return `string` or `null` (never `undefined`) to signal "cannot format" (`formatPercent` in `src/utils/formatters.ts:8-12` returns `null` for `NaN`/`null` input); callers handle the `null` case explicitly in JSX (`Overview.tsx:30`).

## Module Design

**Exports:**
- Utility/service/hook modules use named exports (`export function ...`, `export const ...`) exclusively — `src/utils/`, `src/services/`, `src/hooks/`, `src/config/`.
- React components use `export default function ComponentName(...)` — `src/components/dashboard/Overview.tsx:7`, `src/pages/Dashboard.tsx`. Non-default named exports are also used alongside default where a hook/helper is colocated with a component module (e.g. `useAuth` exported alongside `AuthProvider` in `src/contexts/AuthContext.tsx`).

**Barrel Files:**
- None present. There is no `index.ts` re-export barrel in any `src/` subdirectory (`.gitkeep` placeholders exist instead in otherwise-empty-looking folders like `src/components/.gitkeep`, `src/hooks/.gitkeep`, `src/services/.gitkeep`, `src/types/.gitkeep`, `src/utils/.gitkeep` — these are present even though the directories have real files, suggesting the `.gitkeep` was added before content and never removed; do not treat their presence as meaningful). Import directly from the specific file.

## Language/Locale Convention

- All user-facing strings (UI copy, error messages, validation messages) are written in Spanish (Chile locale: `es-CL` used in `Intl.NumberFormat`/`Intl.DateTimeFormat`, `src/utils/formatters.ts`). New user-facing strings must also be in Spanish, matching existing tone (direct, slightly formal, no exclamation points).
- Code identifiers (variables, functions, types) are in English throughout `src/`.
- `supabase/functions/dashboard-whatsapp/index.ts` mixes Portuguese section-banner comments with English identifiers — an inconsistency inherited from the existing file; do not introduce a third language, stay consistent with whichever file you're editing.

---

*Convention analysis: 2026-10-06*
