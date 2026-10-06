# Architecture

**Analysis Date:** 2026-10-06

## Pattern Overview

**Overall:** Client-rendered SPA (React + Vite) backed by a single Supabase Edge Function acting as a read-only BFF (Backend-for-Frontend) over a Postgres RPC. There is no custom application server — Supabase provides auth, the Edge Function ("dashboard-whatsapp"), and a Postgres function (`dashboard_snapshot`) that does all aggregation.

**Key Characteristics:**
- One-way data flow: UI filters → Supabase Edge Function → Postgres RPC → aggregated JSON "snapshot" → rendered views. No client-side joins/aggregation of raw rows; the client only reshapes/derives display values from a pre-aggregated snapshot.
- Single page of real functionality (`/dashboard`) fed by one API call (`getDashboardSnapshot`) per filter change; all widgets on the page are views over the same `DashboardSnapshot` object (fan-out from one fetch, not independent per-widget requests).
- Auth and data access are both gated server-side: Supabase Auth (email/password) for session, plus an **email allowlist** (`DASHBOARD_ALLOWED_EMAILS`) enforced inside the Edge Function — authentication alone does not grant data access.
- Defensive/self-validating client: a dedicated integrity layer (`src/utils/channelInsights.ts: inspectSnapshot`) re-checks sums and invariants of the snapshot in the browser and surfaces a visible warning banner if server data looks inconsistent, in addition to a server-reported `integrity.core_totals_match` flag.
- Resilience-first data hook (`src/hooks/useDashboard.ts`): handles polling, tab-visibility refresh, online/offline detection, stale-while-revalidate style background refresh, and request-sequence tokens to discard out-of-order responses — all hand-rolled (no React Query / SWR dependency).

## Layers

**Presentation / Pages (`src/pages/`):**
- Purpose: Route-level screens (Login, Dashboard, NotFound). Own local UI state (filters, view toggle, form state) and wire hooks/contexts to components.
- Location: `src/pages/Dashboard.tsx`, `src/pages/Login.tsx`, `src/pages/NotFound.tsx`
- Contains: Route components, derived filter logic, URL-querystring sync (`useSearchParams`), skeleton/error/empty states.
- Depends on: `src/hooks/useDashboard.ts`, `src/contexts/AuthContext.tsx`, `src/components/dashboard/*`, `src/utils/*`.
- Used by: `src/App.tsx` route table.

**Dashboard Components (`src/components/dashboard/`):**
- Purpose: Presentational/visualization units rendering slices of a `DashboardSnapshot` (tables, charts, cards). Mostly pure props-in/JSX-out; no data fetching.
- Location: `src/components/dashboard/*.tsx`
- Contains: `Overview.tsx` (channel drill-down view), chart components wrapping Recharts (`ContactsEvolutionChart.tsx`, `ChannelDistributionChart.tsx`, `ConversionPagesChart.tsx` — all lazy-loaded via `React.lazy`), table components (`CampaignsTable.tsx`, `GoogleKeywordsTable.tsx`, `LandingPagesTable.tsx`, `MetaPlacementsTable.tsx`), and small stat cards (`ContactButtonsCard.tsx`, `PaidMediaBreakdownCards.tsx`).
- Depends on: `src/types/dashboard.ts` for prop shapes, `src/utils/formatters.ts` / `src/utils/channelInsights.ts` for derived values.
- Used by: `src/pages/Dashboard.tsx`.

**Shared/App-level Components (`src/components/`):**
- Purpose: Cross-cutting UI shells not specific to the dashboard domain.
- Location: `src/components/ErrorBoundary.tsx` (class component, catches render errors), `src/components/LoadingScreen.tsx`, `src/components/ConfigurationErrorScreen.tsx` (shown when Supabase env vars are missing).
- Depends on: Nothing domain-specific (framework-level only).
- Used by: `src/main.tsx` (ErrorBoundary wraps the whole app), `src/App.tsx` (Loading/ConfigurationError screens gate routing).

**State / Hooks (`src/hooks/`):**
- Purpose: Encapsulate async data-fetching lifecycle and polling/refresh policy, decoupled from rendering.
- Location: `src/hooks/useDashboard.ts`
- Contains: `useDashboard(filters)` — the single stateful data hook in the app. Manages loading/error/refreshing/offline/new-contact-badge state via refs + state, using `requestSequence` ref to guard against race conditions between filter changes and in-flight requests.
- Depends on: `src/services/dashboard.ts`, `src/config/dashboard.ts` (timing constants).
- Used by: `src/pages/Dashboard.tsx`.

**Context (`src/contexts/`):**
- Purpose: Global auth/session state shared across the route tree.
- Location: `src/contexts/AuthContext.tsx`
- Contains: `AuthProvider` (subscribes to `supabase.auth.onAuthStateChange`, restores session on mount) and `useAuth()` hook. Exposes `user`, `session`, `loading`, `configurationError`, `signIn`, `signOut`.
- Depends on: `src/lib/supabase.ts`.
- Used by: `src/main.tsx` (wraps `<App />`), `src/App.tsx`, `src/pages/Login.tsx`, `src/pages/Dashboard.tsx`, `src/pages/NotFound.tsx`.

**Services (`src/services/`):**
- Purpose: Thin API-call layer — the only place that invokes the Supabase Edge Function for dashboard data.
- Location: `src/services/dashboard.ts`
- Contains: `getDashboardSnapshot(params)` — calls `supabase.functions.invoke('dashboard-whatsapp', { body: params })`, validates the `{ ok, data }` envelope, and throws on any failure shape.
- Depends on: `src/lib/supabase.ts`, `src/types/dashboard.ts`.
- Used by: `src/hooks/useDashboard.ts`.

**Lib (`src/lib/`):**
- Purpose: Low-level client/SDK initialization.
- Location: `src/lib/supabase.ts`
- Contains: Supabase client singleton; reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from `import.meta.env`; exports `supabaseConfigError` (non-null message) instead of throwing when env vars are missing, so the UI can render a friendly configuration screen.
- Depends on: `@supabase/supabase-js`.
- Used by: `src/contexts/AuthContext.tsx`, `src/services/dashboard.ts`.

**Utils (`src/utils/`):**
- Purpose: Pure derivation/formatting functions operating on an already-fetched `DashboardSnapshot`. No I/O.
- Location: `src/utils/channelInsights.ts` (channel comparison math, drill-down aggregation, client-side integrity checks), `src/utils/formatters.ts` (Intl-based number/date/percent formatting, `es-CL` locale, `America/Santiago` timezone), `src/utils/channelColors.ts`, `src/utils/pageUrl.ts`.
- Depends on: `src/types/dashboard.ts`.
- Used by: pages and dashboard components.

**Types (`src/types/`):**
- Purpose: Single source of truth for the shape of data returned by the backend snapshot RPC.
- Location: `src/types/dashboard.ts`
- Contains: `DashboardSnapshot`, `DashboardRequest`, `DashboardKpiValues`, breakdown/timeseries/campaign types, `DashboardFunctionResponse` (the Edge Function envelope).
- Depends on: Nothing (leaf module).
- Used by: Nearly every other `src/` module.

**Config (`src/config/`):**
- Purpose: Tunable constants for the data-refresh policy.
- Location: `src/config/dashboard.ts`
- Contains: `DASHBOARD_REFRESH_INTERVAL` (60s polling), `DASHBOARD_STALE_TIME` (30s), `DASHBOARD_REFRESH_DEBOUNCE` (1s), `DASHBOARD_NEW_CONTACT_BADGE_DURATION` (8s).
- Used by: `src/hooks/useDashboard.ts`.

**Backend / Edge Function (`supabase/functions/dashboard-whatsapp/`):**
- Purpose: Deno-runtime serverless function that is the sole network boundary between the SPA and the database. Performs CORS enforcement, JWT validation, email-allowlist authorization, input parsing/validation, and delegates aggregation to a Postgres RPC.
- Location: `supabase/functions/dashboard-whatsapp/index.ts`
- Contains: `Deno.serve` handler; origin allowlist (`defaultOrigins` + `DASHBOARD_ALLOWED_EMAILS`/`DASHBOARD_ALLOWED_ORIGINS` env overrides); two Supabase clients — an anon-key client scoped to the caller's bearer token (for `auth.getUser()`), and a service-role "admin" client used only to call `admin.rpc('dashboard_snapshot', {...})`; response-shape validation before returning to the client.
- Depends on: `@supabase/supabase-js` (via `npm:` specifier, Deno-style import), Postgres function `dashboard_snapshot` (defined in the database, not in this repo's TS code).
- Used by: `src/services/dashboard.ts` via `supabase.functions.invoke`.

**Database / SQL (`supabase/consistency-v1/`):**
- Purpose: Versioned, reviewable migration package for the `dashboard_snapshot` Postgres function and related validation queries — applied manually against the Supabase project (not an auto-run migration folder).
- Location: `supabase/consistency-v1/01-apply.sql` (forward migration), `02-rollback.sql`, `03-validate-data.sql` / `03-validate.sql` (post-apply checks), `baseline-functions.sql` (pre-change snapshot of existing functions), `edge-original.ts` (pre-change copy of the edge function for diffing), `README.md` (runbook for applying/rolling back).
- Used by: Manually run against Supabase via SQL editor/CLI; not wired into app build.

## Data Flow

**Dashboard snapshot fetch (main flow):**

1. `src/pages/Dashboard.tsx` builds a `DashboardRequest` (`preset`, `attribution_model`, optional `custom_start`/`custom_end`, `limit`) from UI filter state and the URL query string (`useSearchParams` keeps `preset`/`attribution`/`start`/`end` in sync with the address bar).
2. `filters` is memoized and passed to `useDashboard(filters)` (`src/hooks/useDashboard.ts`).
3. The hook calls `getDashboardSnapshot(filters)` (`src/services/dashboard.ts`), which invokes the `dashboard-whatsapp` Supabase Edge Function with the filters as the JSON body; Supabase automatically attaches the user's bearer JWT.
4. The Edge Function (`supabase/functions/dashboard-whatsapp/index.ts`) validates CORS origin, JWT, and the caller's email against `DASHBOARD_ALLOWED_EMAILS`; parses/validates the request params; then calls Postgres RPC `dashboard_snapshot` using a service-role client.
5. Postgres returns one aggregated JSON object (`DashboardSnapshot`): KPIs (current vs previous period), timeseries, breakdowns (channels, pages, buttons, keywords, devices, networks, matchtypes, placements), campaigns, and an `integrity` block.
6. The Edge Function re-validates the shape/types of this payload before responding `{ ok: true, data }` (or a typed `{ ok: false, error }` on any failure).
7. `useDashboard` stores the snapshot, computes a new-contacts delta (for automatic refreshes only), and exposes `{ data, loading, error, backgroundError, refreshing, newContacts, isOffline, reload }`.
8. `src/pages/Dashboard.tsx` renders `Overview` (default view) or `DashboardContent` (detail view) from the same snapshot; sub-components (`CampaignsTable`, chart components, etc.) receive already-aggregated slices as props and do no further fetching.

**State Management:**
- No global store (no Redux/Zustand). State is split between: React Context (`AuthContext`) for session/auth, a custom hook (`useDashboard`) for server-state/caching concerns, and local `useState` in page components for UI/filter state.
- URL query string is treated as part of state for dashboard filters (shareable/bookmarkable links), synced one-directionally from state to URL via `setSearchParams(..., { replace: true })`.
- `useDashboard` uses refs (`inFlight`, `requestSequence`, `currentSnapshot`, `loadedFilterKey`, `lastSuccessfulUpdateAt`) to track imperative/transient concerns that should not trigger re-renders by themselves.

## Key Abstractions

**DashboardSnapshot (`src/types/dashboard.ts`):**
- Purpose: The single aggregated payload contract between backend and frontend. Every dashboard view is a projection of this one type.
- Examples: `src/types/dashboard.ts` (definition), `src/services/dashboard.ts` (fetch), consumed throughout `src/pages/Dashboard.tsx` and `src/components/dashboard/*`.
- Pattern: Backend-computed aggregate/report object ("snapshot") rather than normalized entities — the client never fetches raw contact/event rows.

**DashboardRequest (filters):**
- Purpose: Normalized filter shape (`preset`, `attribution_model`, custom date range, `limit`) shared verbatim between client state, URL params, and the Edge Function's expected input.
- Examples: `src/types/dashboard.ts`, built in `src/pages/Dashboard.tsx` (`filters` memo), validated again server-side in `supabase/functions/dashboard-whatsapp/index.ts`.
- Pattern: Same validation rules (allowed presets, attribution values, date format `YYYY-MM-DD`) are duplicated independently on client (`isValidDateValue`) and server (`isValidDate`) — not shared code, since client and Edge Function are separate TS environments (browser vs Deno).

**useDashboard hook:**
- Purpose: Central "data layer" abstraction — owns fetch lifecycle, polling, staleness, and offline/online handling for the one data dependency the app has.
- Examples: `src/hooks/useDashboard.ts`
- Pattern: Hand-written stale-while-revalidate cache with request cancellation via sequence counters (`requestId !== requestSequence.current` guards), instead of a data-fetching library.

**channelInsights derivations:**
- Purpose: Pure functions that compute comparisons (`compareChannel`), drill-down detail (`getChannelDetail`), coverage checks (`hasPreviousCoverage`), and integrity warnings (`inspectSnapshot`) from a snapshot already in memory.
- Examples: `src/utils/channelInsights.ts`, consumed by `src/components/dashboard/Overview.tsx` and `src/pages/Dashboard.tsx`.
- Pattern: Client-side defensive validation layered on top of server-side integrity flags (`integrity.core_totals_match`) — belt-and-suspenders consistency checking.

## Entry Points

**SPA bootstrap:**
- Location: `src/main.tsx`
- Triggers: Vite dev server (`npm run dev`) or static bundle load in production.
- Responsibilities: Mounts React root; wraps app in `StrictMode` → `ErrorBoundary` → `BrowserRouter` → `AuthProvider` → `App`.

**Route table:**
- Location: `src/App.tsx`
- Triggers: Any navigation/route change.
- Responsibilities: Gates on `configurationError` (missing env) and `loading` (auth restoring) before rendering routes; defines `/login` (public-only), `/dashboard` (protected), `/` (redirect based on auth), and `*` (NotFound).

**Edge Function HTTP entry:**
- Location: `supabase/functions/dashboard-whatsapp/index.ts`
- Triggers: `supabase.functions.invoke('dashboard-whatsapp', ...)` from the client, or any direct HTTP GET/POST to the deployed function URL.
- Responsibilities: CORS, auth, authorization (email allowlist), input validation, RPC delegation, response integrity check.

## Error Handling

**Strategy:** Layered — render-time crashes are caught by a top-level React error boundary; async/data errors are caught and converted into typed UI states (`loading` / `error` / `backgroundError`) rather than thrown; the backend returns a consistent `{ ok: boolean, error?: string }` envelope with HTTP status codes, never a bare 500 HTML page.

**Patterns:**
- `src/components/ErrorBoundary.tsx`: class component with `getDerivedStateFromError`/`componentDidCatch`; logs only in `import.meta.env.DEV`; shows a generic "reload app" screen otherwise (no error detail leaked to users).
- `src/hooks/useDashboard.ts`: distinguishes **first-load error** (`error` state, no data yet → full error screen) from **background refresh error** (`backgroundError` state, stale data still shown → inline banner with retry) — see `src/pages/Dashboard.tsx` lines ~567–593.
- `src/services/dashboard.ts`: throws on Supabase invoke error, on `ok !== true`, or on missing `data`, so callers only need one try/catch path.
- Edge Function: every failure path returns `jsonResponse({ ok: false, error: <code> }, <status>, origin)` with machine-readable string codes (`invalid_preset`, `access_denied`, `invalid_dashboard_snapshot`, etc.); internal/unexpected errors are caught by an outer `try/catch` and logged server-side only (`internal_server_error` returned to client).
- Client-side `supabaseConfigError` (`src/lib/supabase.ts`) converts a missing-env-var startup failure into a renderable state instead of a thrown exception.

## Cross-Cutting Concerns

**Logging:** `console.error`/`console.warn` only — gated by `import.meta.env.DEV` on the client (`src/hooks/useDashboard.ts`, `src/components/ErrorBoundary.tsx`); unconditional on the server/Edge Function (`console.error`/`console.warn` in `supabase/functions/dashboard-whatsapp/index.ts`) since that only reaches Supabase function logs, not end users. No structured logging or external log aggregation.

**Validation:** Two independent validation layers: (1) Edge Function validates request shape, preset/attribution enum values, and date format before calling Postgres, and validates the shape of the RPC's response before returning it; (2) client re-validates snapshot invariants for display purposes (`inspectSnapshot`) and gates comparisons on `hasPreviousCoverage`. Dates are validated with the same `YYYY-MM-DD` round-trip technique in both `src/pages/Dashboard.tsx` (`isValidDateValue`) and `supabase/functions/dashboard-whatsapp/index.ts` (`isValidDate`).

**Authentication:** Supabase Auth (email/password) via `src/contexts/AuthContext.tsx`; session persisted/restored by the Supabase SDK; route protection via `ProtectedRoute`/`PublicRoute` wrapper components in `src/App.tsx`. Authorization (beyond "is logged in") is enforced only server-side in the Edge Function via `DASHBOARD_ALLOWED_EMAILS` — there is no client-side role/permission system.

---

*Architecture analysis: 2026-10-06*
