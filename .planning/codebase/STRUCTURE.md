# Codebase Structure

**Analysis Date:** 2026-10-06

## Directory Layout

```
DashClaude/
├── public/
│   └── brand/
│       └── adonay-logo.jpeg       # Static brand asset, referenced as /brand/adonay-logo.jpeg
├── src/
│   ├── components/
│   │   ├── dashboard/             # Presentational widgets for the dashboard (tables, charts, cards)
│   │   ├── ConfigurationErrorScreen.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── LoadingScreen.tsx
│   ├── config/
│   │   └── dashboard.ts           # Refresh/polling/debounce timing constants
│   ├── contexts/
│   │   └── AuthContext.tsx        # Auth/session React context + useAuth()
│   ├── hooks/
│   │   └── useDashboard.ts        # Data-fetching/polling/staleness hook
│   ├── lib/
│   │   └── supabase.ts            # Supabase client singleton + config-error detection
│   ├── pages/
│   │   ├── Dashboard.tsx          # Main protected route: filters, layout, view switch
│   │   ├── Login.tsx              # Public route: email/password sign-in form
│   │   └── NotFound.tsx           # Catch-all 404 route
│   ├── services/
│   │   └── dashboard.ts           # Supabase Edge Function call (getDashboardSnapshot)
│   ├── types/
│   │   └── dashboard.ts           # DashboardSnapshot/DashboardRequest/* shared types
│   ├── utils/
│   │   ├── channelColors.ts       # Color mapping for channel/source values
│   │   ├── channelInsights.ts     # Comparison/drill-down/integrity-check pure functions
│   │   ├── formatters.ts          # Intl-based number/date/percent formatting (es-CL)
│   │   └── pageUrl.ts             # URL/page-label helper(s)
│   ├── App.tsx                    # Route table (public/protected routes, redirects)
│   ├── index.css                  # Tailwind entry + global/custom CSS (dashboard shell classes)
│   ├── main.tsx                   # React root bootstrap (providers, router, error boundary)
│   └── vite-env.d.ts              # Vite/TS ambient types
├── supabase/
│   ├── consistency-v1/            # Manually-applied SQL migration package + runbook
│   │   ├── 01-apply.sql
│   │   ├── 02-rollback.sql
│   │   ├── 03-validate-data.sql
│   │   ├── 03-validate.sql
│   │   ├── baseline-functions.sql
│   │   ├── edge-original.ts
│   │   └── README.md
│   └── functions/
│       └── dashboard-whatsapp/
│           └── index.ts           # Deno Edge Function: auth, authz, validation, RPC call
├── tests/
│   ├── build-consistency-package.py
│   ├── channelInsights.test.mjs
│   ├── consistency-edge.test.mjs
│   └── consistency-sql.mjs
├── .planning/                     # GSD planning artifacts (not application code)
├── .env.example                   # Documents required env vars (no secrets)
├── index.html                     # Vite HTML entry point
├── package.json / package-lock.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── vite.config.ts                 # Vite build config (manualChunks for recharts/supabase/react)
├── AUDITORIA-DADOS.md              # Data-audit notes (Portuguese, project documentation)
└── PLANEJAMENTO-GTD.md             # Planning notes (Portuguese, project documentation)
```

## Directory Purposes

**`src/components/`:**
- Purpose: Reusable/shared UI pieces not tied to a specific route's business logic (error/loading/config screens).
- Contains: Class and function components; no data fetching.
- Key files: `src/components/ErrorBoundary.tsx`, `src/components/LoadingScreen.tsx`, `src/components/ConfigurationErrorScreen.tsx`

**`src/components/dashboard/`:**
- Purpose: Dashboard-specific visualization components, each rendering one prop-provided slice of a `DashboardSnapshot`.
- Contains: Table components (`CampaignsTable.tsx`, `GoogleKeywordsTable.tsx`, `LandingPagesTable.tsx`, `MetaPlacementsTable.tsx`), chart components built on `recharts` (`ContactsEvolutionChart.tsx`, `ChannelDistributionChart.tsx`, `ConversionPagesChart.tsx` — all code-split via `React.lazy` in `src/pages/Dashboard.tsx`), card components (`ContactButtonsCard.tsx`, `PaidMediaBreakdownCards.tsx` — exports `DevicesCard`/`GoogleNetworkCard`/`MatchTypeCard`), and the channel drill-down view (`Overview.tsx`).
- Key files: `src/components/dashboard/Overview.tsx` (most complex: interactive channel selection + evolution chart)

**`src/config/`:**
- Purpose: Centralized tunable numeric constants (currently only dashboard refresh timing).
- Key files: `src/config/dashboard.ts`

**`src/contexts/`:**
- Purpose: App-wide React Context providers. Currently only authentication.
- Key files: `src/contexts/AuthContext.tsx`

**`src/hooks/`:**
- Purpose: Custom hooks encapsulating stateful/async logic reused by pages.
- Key files: `src/hooks/useDashboard.ts`

**`src/lib/`:**
- Purpose: Third-party SDK client setup/initialization (as opposed to `services/`, which wraps *calls* using that client).
- Key files: `src/lib/supabase.ts`

**`src/pages/`:**
- Purpose: Route-level components mapped directly in `src/App.tsx`. One file per route.
- Key files: `src/pages/Dashboard.tsx`, `src/pages/Login.tsx`, `src/pages/NotFound.tsx`

**`src/services/`:**
- Purpose: Functions that perform the actual network call to backend (Supabase Edge Functions), isolated from both the SDK client (`src/lib/`) and the consuming hook/component.
- Key files: `src/services/dashboard.ts`

**`src/types/`:**
- Purpose: Shared TypeScript types describing API/data contracts. No runtime code.
- Key files: `src/types/dashboard.ts`

**`src/utils/`:**
- Purpose: Pure, side-effect-free helper functions (formatting, derived calculations, color mapping). No fetching, no React.
- Key files: `src/utils/formatters.ts`, `src/utils/channelInsights.ts`, `src/utils/channelColors.ts`, `src/utils/pageUrl.ts`

**`supabase/functions/dashboard-whatsapp/`:**
- Purpose: The deployed Supabase Edge Function (Deno runtime) — the only backend compute in the repo.
- Key files: `supabase/functions/dashboard-whatsapp/index.ts`

**`supabase/consistency-v1/`:**
- Purpose: A dated, reviewable package of SQL/TS files for a specific database migration (the `dashboard_snapshot` function and its consistency guarantees), meant to be applied manually via Supabase SQL editor/CLI, with rollback and validation scripts. Not auto-executed by the app or CI.
- Key files: `supabase/consistency-v1/01-apply.sql`, `supabase/consistency-v1/02-rollback.sql`, `supabase/consistency-v1/README.md` (runbook)

**`tests/`:**
- Purpose: Standalone Node/Python scripts validating consistency logic and `channelInsights` utilities. Not integrated with a test runner/framework (no Jest/Vitest config present) — executed directly (`.mjs`/`.py`).
- Key files: `tests/channelInsights.test.mjs`, `tests/consistency-edge.test.mjs`, `tests/consistency-sql.mjs`, `tests/build-consistency-package.py`

**`public/`:**
- Purpose: Static assets served as-is by Vite; referenced with root-relative paths (e.g. `/brand/adonay-logo.jpeg`).
- Key files: `public/brand/adonay-logo.jpeg`

## Key File Locations

**Entry Points:**
- `index.html`: Vite HTML entry, loads `src/main.tsx`
- `src/main.tsx`: React root, provider composition
- `src/App.tsx`: Route table

**Configuration:**
- `vite.config.ts`: Build config, manual chunk splitting
- `tailwind.config.js`: Tailwind theme/content globs
- `postcss.config.js`: PostCSS plugins (Tailwind/Autoprefixer)
- `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`: TypeScript project references (app vs. Vite/node config)
- `.env.example`: Documents `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (actual secrets in untracked `.env.local`)
- `src/config/dashboard.ts`: Runtime behavior constants (polling/stale/debounce)

**Core Logic:**
- `src/hooks/useDashboard.ts`: Data-fetch/refresh/offline orchestration
- `src/services/dashboard.ts`: Edge Function invocation
- `src/utils/channelInsights.ts`: Comparison and integrity-check logic
- `supabase/functions/dashboard-whatsapp/index.ts`: Auth, authorization, validation, RPC call

**Testing:**
- `tests/channelInsights.test.mjs`: Tests for `src/utils/channelInsights.ts` logic
- `tests/consistency-edge.test.mjs`, `tests/consistency-sql.mjs`: Validate the `supabase/consistency-v1` migration package
- `tests/build-consistency-package.py`: Builds/packages the consistency-v1 artifacts

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx`, one primary component per file, default-exported (e.g. `src/pages/Dashboard.tsx`, `src/components/dashboard/Overview.tsx`). Some files export additional named components alongside the default/primary one when tightly related (e.g. `src/components/dashboard/PaidMediaBreakdownCards.tsx` exports `DevicesCard`, `GoogleNetworkCard`, `MatchTypeCard`).
- Non-component modules (hooks excepted): `camelCase.ts` (e.g. `src/utils/formatters.ts`, `src/services/dashboard.ts`, `src/lib/supabase.ts`).
- Hooks: `camelCase.ts` prefixed with `use` (e.g. `src/hooks/useDashboard.ts`), matching the exported hook name.
- Test files: `<subject>.test.mjs` for behavioral tests, plain `<subject>.mjs`/`.py` for build/validation scripts (`tests/` directory).

**Directories:**
- All lowercase, singular-by-domain-concept plural-by-content (`components`, `pages`, `hooks`, `utils`, `types`) — standard Vite/React convention, one directory per architectural layer under `src/`.
- `.gitkeep` files are present in several `src/` subdirectories (`src/components/.gitkeep`, `src/hooks/.gitkeep`, `src/services/.gitkeep`, `src/types/.gitkeep`, `src/utils/.gitkeep`) — a signal that the project scaffold reserves these directories as fixed layer boundaries even when near-empty, not a historical artifact to clean up.

## Where to Add New Code

**New Dashboard Widget (table/chart/card):**
- Implementation: `src/components/dashboard/<WidgetName>.tsx`, following existing props pattern — accept a typed slice of `DashboardSnapshot` (e.g. `campaigns: DashboardCampaign[]`) plus any derived totals needed for percentages, do not fetch data internally.
- If the widget renders a chart, wrap the import with `React.lazy` in `src/pages/Dashboard.tsx` (see `ContactsEvolutionChart`, `ChannelDistributionChart`, `ConversionPagesChart`) and provide a `ChartLoadingCard` fallback via `Suspense`.
- Register in `src/pages/Dashboard.tsx` inside `DashboardContent` (detail view) or `Overview.tsx` (overview view), whichever view it belongs to.

**New Route/Page:**
- Implementation: `src/pages/<PageName>.tsx`
- Register route: `src/App.tsx` (`<Routes>` in `AppRoutes`), wrap with `ProtectedRoute` or `PublicRoute` element depending on auth requirement.

**New Backend Data Field:**
- If it requires a new field on the snapshot: extend the Postgres `dashboard_snapshot` function (change tracked via a new `supabase/consistency-v1`-style package or direct SQL change) and add the corresponding field to `src/types/dashboard.ts`; the Edge Function's shape validation (`supabase/functions/dashboard-whatsapp/index.ts`, the big `if (!data || ...)` guard) should be extended if the field is critical.
- If it requires a new filter param: add to `DashboardRequest` in `src/types/dashboard.ts`, thread through `src/pages/Dashboard.tsx` filter state/URL params, and validate/accept it in `supabase/functions/dashboard-whatsapp/index.ts`'s parameter-parsing section.

**New Derived/Comparison Logic:**
- Add pure functions to `src/utils/channelInsights.ts` (if channel/comparison-related) or a new `src/utils/<name>.ts` file; keep these side-effect-free and snapshot-shape-aware, consumed by components via props/derived values, not via new fetches.

**Utilities:**
- Shared formatting/helpers: `src/utils/formatters.ts` for display formatting (reuse the `es-CL`/`America/Santiago` conventions already established), `src/utils/` generally for any pure, non-React, non-fetching helper.

**Auth-related changes:**
- Extend `src/contexts/AuthContext.tsx` (e.g. new auth methods) and consume via `useAuth()`; do not call `supabase.auth.*` directly from components/pages.

## Special Directories

**`public/`:**
- Purpose: Static assets served verbatim at the site root.
- Generated: No
- Committed: Yes

**`supabase/consistency-v1/`:**
- Purpose: A frozen, dated migration package (SQL apply/rollback/validate scripts + a copy of the edge function as it existed pre-change) documenting one specific database consistency fix.
- Generated: No (hand-authored, treated as an immutable historical record once applied)
- Committed: Yes

**`.planning/`:**
- Purpose: GSD workflow artifacts (phase plans, codebase maps such as this one). Not part of the running application.
- Generated: Partially (written by GSD commands/agents)
- Committed: Not verified — treat as project documentation, not app code.

**`node_modules/` (not listed above):**
- Purpose: Installed dependencies.
- Generated: Yes
- Committed: No (expected to be covered by `.gitignore`)

---

*Structure analysis: 2026-10-06*
