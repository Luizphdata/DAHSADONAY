# Technology Stack

**Analysis Date:** 2026-10-06

## Languages

**Primary:**
- TypeScript ~5.6.2 - All application source (`src/**/*.ts`, `src/**/*.tsx`), strict mode enabled (`tsconfig.app.json`)
- SQL (PL/pgSQL) - Supabase database functions (`supabase/consistency-v1/*.sql`), ~9,900 lines of PL/pgSQL in `supabase/consistency-v1/baseline-functions.sql`

**Secondary:**
- Deno/TypeScript - Supabase Edge Function runtime (`supabase/functions/dashboard-whatsapp/index.ts`), uses `npm:` specifier imports (Deno's npm compat layer), not Node
- Python - Test tooling script only (`tests/build-consistency-package.py`), not part of the shipped app

## Runtime

**Environment:**
- Browser (client-side SPA) - production app runs entirely in-browser, built by Vite
- Node.js - used for local dev/build tooling (exact version not pinned; no `.nvmrc` or `engines` field found)
- Deno - runtime for the Supabase Edge Function (`dashboard-whatsapp`), version controlled by Supabase platform, not pinned in-repo

**Package Manager:**
- npm (package-lock.json present at `package-lock.json`)
- Lockfile: present (`package-lock.json`, 117KB, lockfileVersion implied by npm 9/10 format)

## Frameworks

**Core:**
- React 18.3.1 - UI framework (`react`, `react-dom` in `package.json`)
- React Router 7.18.3 - client-side routing (`react-router-dom`), routes defined in `src/App.tsx`
- Vite 6.0.5 - build tool and dev server (`vite.config.ts`), uses `@vitejs/plugin-react` 4.3.4

**Testing:**
- Node's built-in test runner (`node --test`) - used for `tests/channelInsights.test.mjs` and `tests/consistency-edge.test.mjs` (documented in `supabase/consistency-v1/README.md`, run with Node 24)
- No test framework declared in `package.json` dependencies (no Jest/Vitest/Mocha) — tests live outside the npm scripts and are run manually via `node --test`
- PGlite 0.3.14 (`@electric-sql/pglite`) - used ad hoc for isolated PostgreSQL testing of PL/pgSQL functions (`tests/consistency-sql.mjs`); NOT an application dependency, installed only in a separate test environment per `supabase/consistency-v1/README.md`

**Build/Dev:**
- TypeScript compiler (`tsc -b`) - project-reference build, runs before Vite build (`package.json` build script: `tsc -b && vite build`)
- PostCSS 8.4.49 + Autoprefixer 10.4.20 (`postcss.config.js`)
- Tailwind CSS 3.4.17 (`tailwind.config.js`) - utility-first styling, custom theme colors `ink` (#10263f) and `cyan` (#199dd5), custom font `Inter`

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.57.4 - Supabase client SDK, used for auth, database RPC calls, and Edge Function invocation (`src/lib/supabase.ts`)
- `recharts` ^2.15.0 - charting library for dashboard visualizations (chunked separately in `vite.config.ts` manualChunks)
- `lucide-react` ^0.468.0 - icon set

**Infrastructure:**
- `react-router-dom` ^7.18.3 - routing/navigation (chunked with react/react-dom in `vite.config.ts`)

## Configuration

**Environment:**
- Vite env vars, prefixed `VITE_` and loaded via `import.meta.env` (`src/lib/supabase.ts`)
- Required vars (declared in `.env.example`, values empty):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- `.env`, `.env.local`, `.env.*.local` are gitignored (`.gitignore`); actual secret values not present in repo
- Edge Function (`supabase/functions/dashboard-whatsapp/index.ts`) reads its own server-side secrets via `Deno.env.get(...)`:
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (required, function throws if missing via `!` assertion)
  - `DASHBOARD_ALLOWED_ORIGINS` (optional, comma-separated CORS allowlist additions)
  - `DASHBOARD_ALLOWED_EMAILS` (required for authorization, comma-separated allowlist of user emails permitted to view the dashboard)
- Missing client env vars degrade gracefully: `supabaseConfigError` is surfaced in UI rather than crashing (`src/lib/supabase.ts:6-9`)

**Build:**
- `vite.config.ts` - manual chunk splitting: `recharts`, `supabase` (`@supabase/*`), and `react` (react/react-dom/react-router) are split into separate bundles
- `tsconfig.json` (solution file) references `tsconfig.app.json` (app source, ES2020 target, strict mode, `noEmit`, bundler module resolution) and `tsconfig.node.json` (tooling/config files)
- `tailwind.config.js` - content scanning on `./index.html` and `./src/**/*.{js,ts,jsx,tsx}`
- `postcss.config.js` - wires Tailwind + Autoprefixer into the CSS pipeline

## Platform Requirements

**Development:**
- Node.js (version unpinned; Node 24 explicitly used for the manual test suite per `supabase/consistency-v1/README.md`)
- npm as package manager
- Supabase CLI/project access for deploying the Edge Function and SQL migrations (no CLI config files like `supabase/config.toml` found in repo)

**Production:**
- Static SPA build (`vite build` output, likely deployed to Vercel — `https://dahsadonay.vercel.app` listed as an allowed CORS origin in `supabase/functions/dashboard-whatsapp/index.ts:21`)
- Supabase project (hosted Postgres + Auth + Edge Functions) as the backend; no self-hosted server component in this repo
- Custom domain `adonay.cl` / `www.adonay.cl` referenced as allowed origins (`supabase/functions/dashboard-whatsapp/index.ts:17-18`)

---

*Stack analysis: 2026-10-06*
