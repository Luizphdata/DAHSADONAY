# External Integrations

**Analysis Date:** 2026-10-06

## APIs & External Services

**Backend-as-a-Service:**
- Supabase - sole external service integration for this app. Provides Postgres database, authentication, and serverless Edge Functions.
  - SDK/Client: `@supabase/supabase-js` ^2.57.4
  - Auth: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (client), `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` (Edge Function server-side)
  - Client instantiation: `src/lib/supabase.ts`
  - Note: despite the Edge Function name `dashboard-whatsapp`, there is no direct WhatsApp Business API/Twilio/Meta Cloud API integration in this repo. WhatsApp contact data appears to already exist in Supabase tables/views (e.g. `vw_whatsapp_leads_keywords_safe` referenced in `supabase/consistency-v1/baseline-functions.sql`), populated by a process outside this codebase. This app only reads/aggregates that data.
  - Marketing attribution fields present in the underlying view (`meta_campaign_id`, `meta_adset_id`, `meta_ad_id`, `google_campaign_id`, `google_adgroup_id`, etc. — see `supabase/consistency-v1/baseline-functions.sql`) suggest upstream ingestion from Meta Ads and Google Ads click data, but no Meta/Google API calls exist in this repo; attribution data is pre-computed in the database.

## Data Storage

**Databases:**
- Supabase Postgres (hosted)
  - Connection: via Supabase client SDK using `VITE_SUPABASE_URL`/`SUPABASE_URL` + keys (no direct Postgres connection string used by the app)
  - Client: `@supabase/supabase-js` (`src/lib/supabase.ts` for frontend; `createClient` from `npm:@supabase/supabase-js@2` in `supabase/functions/dashboard-whatsapp/index.ts` for the Edge Function)
  - Access pattern: frontend never queries tables directly — it invokes the `dashboard-whatsapp` Edge Function, which in turn calls Postgres RPC functions (`dashboard_snapshot`, and internally `dashboard_breakdowns`, `dashboard_kpis`, `dashboard_campaigns`, `dashboard_timeseries`, `dashboard_comparisons`, `dashboard_resolve_period` — defined in `supabase/consistency-v1/baseline-functions.sql`) using the service-role key
  - Row-level security: not modified by this codebase; `supabase/consistency-v1/README.md` explicitly states RLS policies and table/attribution definitions are untouched by the current SQL package

**File Storage:**
- None detected. No Supabase Storage bucket usage found in `src/` or Edge Function code.

**Caching:**
- None server-side. Client-side polling/staleness constants exist (`DASHBOARD_REFRESH_INTERVAL`, `DASHBOARD_STALE_TIME`, `DASHBOARD_REFRESH_DEBOUNCE` in `src/config/dashboard.ts`) but these govern UI refresh cadence, not a caching layer.

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (email/password)
  - Implementation: `src/contexts/AuthContext.tsx` wraps `supabase.auth.signInWithPassword`, `supabase.auth.signOut`, `supabase.auth.getSession`, and `supabase.auth.onAuthStateChange`
  - Session persistence/refresh handled by the Supabase client SDK by default on the frontend
  - Login UI: `src/pages/Login.tsx`
  - Authorization is enforced twice:
    1. Supabase Auth session required to call the Edge Function (Bearer token validated via a short-lived `authClient` in `supabase/functions/dashboard-whatsapp/index.ts`)
    2. Email allowlist enforced server-side via `DASHBOARD_ALLOWED_EMAILS` env var (`supabase/functions/dashboard-whatsapp/index.ts` lines ~254-302) — authenticated users not on this list get `403 access_denied`; if the allowlist env var is unset entirely, the function fails closed with `503 dashboard_access_not_configured`

## Monitoring & Observability

**Error Tracking:**
- None. No Sentry/Bugsnag/Datadog or similar SDK found in dependencies or source.

**Logs:**
- `console.error`/`console.warn` only, within the Edge Function (`supabase/functions/dashboard-whatsapp/index.ts`) for RPC errors, integrity divergence, misconfiguration, and unauthorized access attempts. No log aggregation/shipping configured in this repo.

## CI/CD & Deployment

**Hosting:**
- Frontend: inferred Vercel deployment (`https://dahsadonay.vercel.app` appears in the Edge Function's CORS allowlist, `supabase/functions/dashboard-whatsapp/index.ts:21`); no `vercel.json` found in repo, so configuration is likely managed in the Vercel dashboard
- Custom domain: `adonay.cl` / `www.adonay.cl` (also in CORS allowlist)
- Backend: Supabase hosted project (Postgres + Auth + Edge Functions)

**CI Pipeline:**
- None detected in-repo. No `.github/workflows`, `.gitlab-ci.yml`, or similar found.

## Environment Configuration

**Required env vars (frontend, Vite):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
(declared empty in `.env.example`; real values must live in untracked `.env`/`.env.local`)

**Required env vars (Edge Function, Deno/Supabase secrets):**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DASHBOARD_ALLOWED_EMAILS` (comma-separated lowercase emails; access denied for everyone if empty/unset)
- `DASHBOARD_ALLOWED_ORIGINS` (optional, comma-separated, appended to built-in CORS allowlist)

**Secrets location:**
- Not present in repo. `.env`, `.env.local`, `.env.*.local` are gitignored (`.gitignore`). Edge Function secrets are managed via Supabase project secrets (platform-side), not stored in this codebase.

## Webhooks & Callbacks

**Incoming:**
- `dashboard-whatsapp` Supabase Edge Function (`supabase/functions/dashboard-whatsapp/index.ts`) — not a webhook per se, but the only HTTP endpoint exposed by this codebase. Accepts `GET`/`POST`/`OPTIONS`, requires a Supabase session Bearer token, returns a JSON dashboard snapshot (`{ok, data}`). Query/body params: `preset`, `attribution_model`/`attribution`, `custom_start`/`start`, `custom_end`/`end`, `limit`.

**Outgoing:**
- None. The app does not call any outbound webhooks or third-party APIs beyond Supabase itself.

---

*Integration audit: 2026-10-06*
