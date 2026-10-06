# Codebase Concerns

**Analysis Date:** 2026-10-06

## Tech Debt

**Unapplied data-consistency fix package (highest priority):**
- Issue: A fully-prepared SQL/Edge Function fix package exists at `supabase/consistency-v1/` (`01-apply.sql`, `02-rollback.sql`, `baseline-functions.sql`, `edge-original.ts`) that addresses six documented data-integrity bugs in the production Supabase functions/views. Per `supabase/consistency-v1/README.md`, this package has **not been applied to the remote Supabase project**. The live dashboard (`supabase/functions/dashboard-whatsapp/index.ts` in production and the 8 SQL functions/5 views behind it) still runs the old, buggy logic.
- Files: `AUDITORIA-DADOS.md`, `supabase/consistency-v1/README.md`, `supabase/consistency-v1/01-apply.sql`, `supabase/consistency-v1/baseline-functions.sql`
- Impact: Dashboard numbers shown to the client (Adonay) may currently be wrong in up to six distinct ways (see Known Bugs below) until this package is reviewed and deployed.
- Fix approach: Follow the apply sequence in `supabase/consistency-v1/README.md` — snapshot current functions, run `03-validate.sql` before/after, apply `01-apply.sql` in a test copy of the Supabase project first, verify `core_totals_match` and channel sums, then promote to production and deploy the revised Edge Function (`supabase/functions/dashboard-whatsapp/index.ts` is already the revised version; `edge-original.ts` is kept only for rollback).

**Duplicated date-validation logic:**
- Issue: The exact same custom date validator (`isValidDate`) is independently re-implemented in two places with identical regex/logic.
- Files: `supabase/functions/dashboard-whatsapp/index.ts:117-126` (`isValidDate`) and `src/pages/Dashboard.tsx:61-64` (`isValidDateValue`)
- Impact: Any future change to date-validation rules (e.g. timezone handling) must be made in two places; drift between client and server validation is easy to introduce unnoticed.
- Fix approach: Extract to a shared utility (e.g. `src/utils/date.ts`) imported by the frontend, and keep the Edge Function copy in sync manually since it runs in a separate Deno runtime with no shared bundle.

**Monolithic Dashboard page component:**
- Issue: `src/pages/Dashboard.tsx` is 612 lines and mixes URL/query-param parsing, filter state, presentational subcomponents (`MetricCard`, `ChangeIndicator`, `DashboardSkeleton`), and business formatting logic in a single file.
- Files: `src/pages/Dashboard.tsx`
- Impact: Hard to test in isolation (no component-level tests exist for it); increases risk of regressions when adding new dashboard sections; local helper components (`MetricCard`, `ChangeIndicator`) are not reusable elsewhere even though they are generic.
- Fix approach: Extract `MetricCard`, `ChangeIndicator`, `DashboardSkeleton`, and the preset/attribution option tables into `src/components/dashboard/` as standalone files; move the `isValidDateValue`/query-param parsing into a dedicated hook (e.g. `useDashboardFilters`).

**No shared email in frontend/backend authorization flow:**
- Issue: Authorization is entirely env-var based (`DASHBOARD_ALLOWED_EMAILS` in the Edge Function, comma-separated). There is no admin UI, database table, or audit trail for who has access.
- Files: `supabase/functions/dashboard-whatsapp/index.ts:41-48`
- Impact: Adding/removing authorized users requires redeploying Edge Function environment variables; no logging of allowlist changes; scaling to "vários clientes" (per `PLANEJAMENTO-GTD.md` future expansion) will require a real access-control model.
- Fix approach: Move allowlist to a Supabase table with RLS, referenced by the Edge Function via the service-role client, as already flagged as pending work in `AUDITORIA-DADOS.md` item 5 ("Revisão das permissões da tabela base").

## Known Bugs

**(All six items below are documented in `AUDITORIA-DADOS.md` as findings from a static review of the production SQL functions/views, not yet confirmed against live data, and not yet fixed in the deployed Supabase project.)**

**Attribution mixes fields from different contact touches:**
- Symptoms: A contact whose first touch was organic (source=google, medium=organic, no campaign) can be misclassified as "Meta Ads" if a later UTM campaign value leaks into the first-touch fields via independent `COALESCE` per field.
- Files: `vw_whatsapp_leads_normalized` (Supabase view, not in this repo — see `AUDITORIA-DADOS.md` section "1. Atribuição mistura campos de contatos diferentes")
- Trigger: Visitor has multiple touches where first touch has no campaign but a subsequent touch does; the `metaads-%` classification rule runs before the organic rule.
- Workaround: None currently implemented.

**Period comparisons ignore historical coverage in some blocks:**
- Symptoms: `dashboard_kpis` and `dashboard_timeseries` compute percentage change vs. previous period even when the database does not have full coverage for the entire previous period, producing misleading growth percentages. `dashboard_comparisons` already has an `available` flag but it is not shared with the other two blocks.
- Files: SQL functions `dashboard_kpis`, `dashboard_timeseries`, `dashboard_comparisons` (see `supabase/consistency-v1/baseline-functions.sql`); consumed by `src/pages/Dashboard.tsx` and `src/components/dashboard/Overview.tsx`
- Trigger: Any period where the previous-period window extends before the earliest tracked event.
- Workaround: `supabase/consistency-v1/01-apply.sql` adds `previous_available` to KPIs/timeseries so the frontend can suppress comparisons; not yet applied to production. Frontend code already supports reading this flag via `hasPreviousCoverage()` in `src/utils/channelInsights.ts:24-27`.

**"Valid click" definition only means "not a detected duplicate":**
- Symptoms: `is_valid_click = NOT is_technical_duplicate` in the `dashboard` view — it does not require `whatsapp_clicked IS TRUE`. Null/false events that aren't flagged as duplicates could be counted as valid contacts.
- Files: `vw_whatsapp_leads_dashboard` (Supabase view, not in this repo)
- Trigger: Any ingestion path that writes a row with `whatsapp_clicked` false/null that isn't caught by duplicate detection.
- Workaround: None; historical CSV reviewed had this field always true, but that does not guarantee current data integrity.

**Deduplication runs before test-record exclusion and has limited scope:**
- Symptoms: The dedup rule uses `LAG` over the immediately preceding event (same visitor/page/button/destination, ≤3s), but `is_test_record` is computed later in the `semantic` view. A test event can therefore suppress a real event that arrives within the window. Events with no visitor ID are never deduplicated. The 3-second rule chains forward (0s→2s→4s keeps only the first), which is a cumulative-suppression rule, not a fixed window from the first accepted event.
- Files: Dedup logic inside `vw_whatsapp_leads_normalized` / `vw_whatsapp_leads_semantic` (Supabase views, not in this repo)
- Trigger: A `teste` campaign event immediately preceding a real event with the same visitor/page/button/destination key within 3 seconds.
- Workaround: None; proposed fix is to exclude test records before applying the dedup window and prioritize a unique ingestion-side event ID if available.

**Inconsistent time cutoff and channel limits across blocks:**
- Symptoms: `dashboard_breakdowns` uses end-of-day as the cutoff for "today" while `dashboard_kpis`/`campaigns`/`timeseries` use `NOW()`, so numbers for the current day can diverge between KPI cards and channel breakdowns. Channel distribution is also subject to a `LIMIT` even though the full channel list is available in metadata.
- Files: SQL functions `dashboard_breakdowns` vs `dashboard_kpis`/`dashboard_campaigns`/`dashboard_timeseries` (see `supabase/consistency-v1/baseline-functions.sql`); consumed by `src/components/dashboard/ChannelDistributionChart.tsx`
- Trigger: Viewing "today"/current-period data where new events occur between the two cutoffs.
- Workaround: `supabase/consistency-v1/01-apply.sql` unifies the cutoff and removes the channel limit; not yet applied to production.

**Integrity check can report "match" even when required data is missing:**
- Symptoms: `dashboard_snapshot` coerces missing fields to zero before comparing declared totals, so if three blocks are missing their `totals` entirely, `core_totals_match` can still report `true`. The check also does not sum individual list items against the declared total.
- Files: SQL function `dashboard_snapshot` (see `supabase/consistency-v1/baseline-functions.sql`); consumed client-side by `inspectSnapshot()` in `src/utils/channelInsights.ts:39-52` and the Edge Function's own integrity gate at `supabase/functions/dashboard-whatsapp/index.ts:590`
- Trigger: Any RPC response missing required blocks/fields.
- Workaround: `01-apply.sql` requires blocks/fields explicitly and distinguishes "absent" from "zero"; not yet applied to production. Note the Edge Function's integrity check at line 590 is a single very long unformatted conditional — hard to read/maintain and easy to silently break with a one-line edit.

## Security Considerations

**Domain matching via substring instead of hostname parsing (flagged in audit, not verifiable in this repo):**
- Risk: Per `AUDITORIA-DADOS.md` "Outros ajustes", domain comparisons against `%adonay.cl%`, `%facebook.com%`, `%instagram.com%` use substring matching against the full URL, which could misclassify an external domain containing the string as a query parameter (e.g. `evil.com/?ref=adonay.cl`) as internal/owned traffic.
- Files: Not present in this repository's exported SQL (`supabase/consistency-v1/baseline-functions.sql` does not contain this logic in the current export) — applies to the live Supabase views/functions referenced in the audit. Verify directly against the deployed database before treating as resolved or unresolved.
- Current mitigation: None implemented in this repo.
- Recommendations: Parse hostname via URL parsing and compare exact/suffix match rather than substring `LIKE`.

**Environment variables use non-null assertions with no startup validation in the Edge Function:**
- Risk: `supabase/functions/dashboard-whatsapp/index.ts:7-9` reads `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` with `!` (non-null assertion). If any is unset in the Supabase project configuration, the function will throw an unhandled error at cold start rather than returning a clear `dashboard_access_not_configured`-style response (contrast with the explicit, well-handled check for `DASHBOARD_ALLOWED_EMAILS` a few lines later at line 266).
- Files: `supabase/functions/dashboard-whatsapp/index.ts:7-9`
- Current mitigation: None.
- Recommendations: Validate these three env vars the same way `allowedEmails.size === 0` is validated, returning a clear 503 with a descriptive error code instead of crashing.

**No request throttling/rate limiting on the Edge Function:**
- Risk: Authentication + email allowlist are the only gates; a compromised or shared authorized account could poll the endpoint at high frequency (frontend already polls every interval — see `DASHBOARD_REFRESH_INTERVAL` in `src/config/dashboard.ts`) with no server-side rate limit, which could increase load on `dashboard_snapshot` RPC calls or Supabase costs.
- Files: `supabase/functions/dashboard-whatsapp/index.ts`
- Current mitigation: Client-side debounce/stale-time logic in `src/hooks/useDashboard.ts` (`DASHBOARD_REFRESH_DEBOUNCE`, `DASHBOARD_STALE_TIME`), which only limits well-behaved clients, not malicious ones.
- Recommendations: Add server-side rate limiting (e.g. per-user-id sliding window) if usage expands beyond a single trusted client.

**CORS check is skipped entirely when no `Origin` header is present:**
- Risk: `supabase/functions/dashboard-whatsapp/index.ts:143-155` only rejects requests when `origin` is present and not allowlisted. Non-browser clients (e.g. `curl`, Postman, server-to-server calls) send no `Origin` header and bypass this check entirely, relying solely on the Bearer token + email allowlist for protection.
- Files: `supabase/functions/dashboard-whatsapp/index.ts:143-155`
- Current mitigation: Bearer token authentication and email allowlist still apply regardless of CORS, so this is not a bypass of auth — only a bypass of the browser-origin restriction layer.
- Recommendations: Acceptable if the auth/allowlist layer is considered the real security boundary (as it is here); document this explicitly so future maintainers don't assume CORS is an additional access-control layer.

## Performance Bottlenecks

**Polling-based refresh with no backoff on repeated failures:**
- Problem: `src/hooks/useDashboard.ts` polls every `DASHBOARD_REFRESH_INTERVAL` regardless of whether previous requests failed, and retries on focus/visibility/online events without exponential backoff.
- Files: `src/hooks/useDashboard.ts:163-171` (interval effect), `src/config/dashboard.ts` (interval constants)
- Cause: Fixed-interval polling design; acceptable at current single-client scale but will not scale gracefully if backend errors persist (e.g. Supabase outage) — every tab keeps retrying at full frequency.
- Improvement path: Add exponential backoff after consecutive `backgroundError` states before resuming the normal interval.

## Fragile Areas

**Edge Function integrity-check conditional (single-line, unreadable):**
- Files: `supabase/functions/dashboard-whatsapp/index.ts:590`
- Why fragile: A single `if` statement with ~12 chained conditions across `data.period`, `data.kpis`, `data.breakdowns`, `data.campaigns`, `data.timeseries`, and `data.integrity` on one line. A future field rename or added validation requirement is easy to get wrong without introducing a bug invisible at a glance (contrast with the clearly formatted code around it).
- Safe modification: Reformat into named boolean checks (e.g. `hasValidPeriod`, `hasValidKpis`) before adding further validation, matching the style used in `supabase/consistency-v1/01-apply.sql`'s stricter validation approach.
- Test coverage: `tests/consistency-edge.test.mjs` (24 lines) covers some integrity-check scenarios for the *revised* package, but there is no equivalent dedicated test file for the long conditional as it exists in the currently-deployed `index.ts`.

**Supabase views/functions pipeline (`whatsapp_leads` → 5 chained views):**
- Files: Not present in this repository — only exported/audited copies exist in `supabase/consistency-v1/baseline-functions.sql` and `AUDITORIA-DADOS.md`. The chain is `whatsapp_leads` → `vw_whatsapp_leads_normalized` → `vw_whatsapp_leads_dashboard` → `vw_whatsapp_leads_semantic` → `vw_whatsapp_leads_final` → `vw_whatsapp_leads_keywords_safe`.
- Why fragile: Five layers of views each adding attribution/dedup/semantic logic; a change at any layer (e.g. `normalized`) silently propagates to all downstream views and every KPI/breakdown/campaign query that reads `final`/`keywords_safe`. No single source of truth or schema diagram exists in this repo — understanding behavior requires reading `AUDITORIA-DADOS.md` and `baseline-functions.sql` together.
- Safe modification: Any change must be validated with `supabase/consistency-v1/03-validate.sql`/`03-validate-data.sql` before/after on a test copy per the documented sequence in `supabase/consistency-v1/README.md`, never directly against production.
- Test coverage: `tests/consistency-sql.mjs` exercises the revised functions against PGlite with fixture data; the currently-deployed (unpatched) functions have no automated test coverage in this repo.

## Scaling Limits

**Single-tenant design baked into authorization and config:**
- Current capacity: Designed and authorized for exactly one client ("Adonay") per `PLANEJAMENTO-GTD.md` ("Atender somente a Adonay nesta primeira etapa").
- Limit: Email allowlist (`DASHBOARD_ALLOWED_EMAILS`) and hardcoded brand strings/colors (`src/utils/channelColors.ts`, Tailwind theme in `tailwind.config.js`) assume a single client; "Vários clientes e gestão centralizada" is explicitly listed as a future expansion, not yet started.
- Scaling path: Introduce a tenant/account model in Supabase (table-driven access instead of env-var allowlist), and parameterize branding/config per tenant before onboarding additional clients.

## Dependencies at Risk

Not applicable — dependency set is small and current (`@supabase/supabase-js ^2.57.4`, `react ^18.3.1`, `react-router-dom ^7.18.3`, `recharts ^2.15.0`, `vite ^6.0.5`, `typescript ~5.6.2`). No deprecated or end-of-life packages identified in `package.json`.

## Missing Critical Features

**No automated CI pipeline:**
- Problem: No `.github/workflows/` or other CI configuration exists. Tests (`tests/*.mjs`) and the TypeScript build (`tsc -b`) must be run manually; there is no `npm test` script defined in `package.json` to standardize this.
- Blocks: Regressions in the data-consistency logic or TypeScript errors can be merged/deployed without automated verification.

**No admin/audit trail for dashboard access:**
- Problem: Granting/revoking dashboard access requires editing the `DASHBOARD_ALLOWED_EMAILS` Supabase Edge Function secret directly; there is no record of who was granted access or when.
- Blocks: Auditability of who can view client data; relevant given the dashboard exposes contact/lead data.

## Test Coverage Gaps

**No component or hook tests for the React app:**
- What's not tested: `src/hooks/useDashboard.ts` (216 lines, complex polling/stale/offline/visibility state machine), `src/contexts/AuthContext.tsx`, `src/pages/Dashboard.tsx` (612 lines), `src/pages/Login.tsx`, and all files under `src/components/dashboard/`.
- Files: Entire `src/` tree — the only test files in the repo (`tests/channelInsights.test.mjs`, `tests/consistency-edge.test.mjs`, `tests/consistency-sql.mjs`) cover pure utility functions (`src/utils/channelInsights.ts`) and the Supabase/Edge layer, not React UI code.
- Risk: Regressions in auth state restoration, polling/offline/stale-refresh logic, or filter/URL-param parsing in `Dashboard.tsx` would not be caught automatically.
- Priority: High for `useDashboard.ts` and `AuthContext.tsx` given their stateful complexity; Medium for presentational components.

**No `npm test` script / standardized test runner:**
- What's not tested: There is no `"test"` entry in `package.json` scripts; tests are run via direct `node --test tests/channelInsights.test.mjs tests/consistency-edge.test.mjs` and `node tests/consistency-sql.mjs` per `supabase/consistency-v1/README.md`, with an optional PGlite dependency (`@electric-sql/pglite@0.3.14`) that must be installed manually and is not in `package.json` at all.
- Files: `package.json`, `tests/consistency-sql.mjs`
- Risk: Easy for contributors to forget to run SQL consistency tests since they require a separate, undocumented-in-package.json setup step.
- Priority: Medium — add a `test` script and move the PGlite dependency to `devDependencies` (optionally behind a separate script) so `npm test` is discoverable.

**Browser/E2E tests referenced only in planning docs, not present as runnable suites:**
- What's not tested: `PLANEJAMENTO-GTD.md` references "Testes de navegador com respostas de rede simuladas" (browser tests with simulated network responses) covering login, filters, attribution, responsive widths 320–1440px, and logout — no corresponding test files (e.g. Playwright/Cypress config) exist in this repository.
- Files: None found; checked for `playwright.config.*`, `cypress.config.*` — not present.
- Risk: These tests, if they exist, are not committed/reproducible by other contributors; if they don't exist anymore, the planning doc overstates current verification coverage.
- Priority: Medium — clarify whether these tests exist elsewhere and commit them, or correct the planning doc.

---

*Concerns audit: 2026-10-06*
