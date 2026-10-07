---
phase: 01-infra-de-qualidade-do-reposit-rio
verified: 2026-10-06T00:00:00Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
gaps: []
---

# Phase 1: Infra de qualidade do repositório — Verification Report

**Phase Goal:** Qualquer mudança feita nas fases seguintes é verificada automaticamente, e qualquer pessoa que abra o repositório descobre como rodar, testar e aplicar o pacote de consistência sem contexto oral.
**Status:** passed (com avisos não bloqueantes)
**Re-verification:** No

## Commands run by the verifier
- `npm test`: exit 0; 14 pass / 0 fail, mais a linha `PASS SQL: ...` do harness PGlite.
- `npm run lint`: exit 0.
- `npm run build` (`tsc -b && vite build`): exit 0.
- Mutation re-run (verifier): removed `void request('filter')` from `src/hooks/useDashboard.ts` -> the filter test FAILED (other two passed); file restored via `git checkout`, tree clean for this file.

## Truths / Requirements

| Req | Status | Evidence |
|---|---|---|
| QUAL-01 | VERIFIED | `package.json` `test` = node --test over `tests/**/*.test.{mjs,ts,tsx}` `&& node tests/consistency-sql.mjs`; ran green; `PGLITE_MODULE` and Node 24 documented in README. `build-consistency-package.py` correctly excluded (ROADMAP carries dated correction). |
| QUAL-02 | VERIFIED (minor caveat) | pglite exactly `0.3.14`, only in `devDependencies`. Caveat: the script has no custom "not installed" message; failure is Node's raw `ERR_MODULE_NOT_FOUND` (names the module, but with a stack trace). Not in ROADMAP SC6. |
| QUAL-03 | VERIFIED (minor caveat) | `eslint.config.js` has two scoped blocks: `src/` semi never/single quotes; `supabase/functions/` semi always/double quotes. No cross-rewriting; lint exit 0. Caveat: "2 espaços" is documented but NOT enforced (no `indent` rule), and no formatter exists (Prettier banned by CLAUDE.md). |
| QUAL-04 | VERIFIED | `.github/workflows/ci.yml`: on push/PR, runs `npm ci`, `npm run build` (includes `tsc -b`), `npm run lint`, `npm test`; `permissions: contents: read`. Green runs 37511878474 and 37529973052 accepted from orchestrator's external evidence (not re-checkable here). |
| QUAL-05 | VERIFIED | README.md sections: overview, requirements, how to run, how to test (command + single-file + PGLITE_MODULE), per-area conventions, consistency-v1 runbook linking the 8-step README, exact warning "`baseline-functions.sql`: referência exportada e entrada dos testes. **Não executar como migração.**" in README and CLAUDE.md rules. Documented test command matches `package.json` verbatim; no stale test counts found. |
| QUAL-06 | VERIFIED | Session restoration (`AuthContext.test.tsx`, configured + unconfigured branches), filter change, background poll, offline/online (`useDashboard.test.ts`). |

## Falsifiability (the load-bearing claim)
Judged genuine. In `useDashboard.test.ts`:
- Filter test asserts synchronously (before any await) that `data === null` after rerender and that `receivedParams` already contains `preset: 'ayer'`; verifier mutation confirmed it fails when the filter refetch is removed.
- Online handler is asserted synchronously (`callCount === before + 1`), so a 20ms poll cannot satisfy it; offline suppression is checked over 80ms (4 poll intervals).
- Residual weakness (not a gap): offline test alone would not catch removal of polling, but the polling test covers that (its `waitFor(callCount > ...)` would time out). I did not re-run the `request('online')` mutation; relied on REVIEW's recorded result plus code reading of the synchronous assertion.
- Residual weakness: the polling test's `loadingHistory.every(...)` is vacuous if empty, but the preceding `waitFor(callCount > before)` guarantees at least one poll, so it is guarded in practice.
- AuthContext test does not exercise `onAuthStateChange` callbacks (fake never fires events), so a regression in session updates after login would not be caught. This is IN-02 territory.

## Accepted debt, judged
- WR-03 (`tests/` outside ESLint and `tsc -b`): defensible as debt. QUAL-03 text scopes lint/format to `src/` and `supabase/functions/`. But it is real: type errors in tests are never caught, and the `as unknown as` casts hide it. Suggest scheduling, not blocking.
- IN-02 (`signIn`, `signOut`, `getSession` rejection untested): defensible. QUAL-06 names four behaviors, all covered as written. It is a coverage limit, not a requirement miss. Honest scope: auth error paths are unprotected going into later phases.

## Other findings (non-blocking)
- REQUIREMENTS.md traceability table (lines 147-152) still says "Pendente" for QUAL-01..06 while the checkboxes are `[x]`. Bookkeeping stale; update on phase close.
- ROADMAP phase checkbox for Phase 1 is still `[ ]`.
- Scope of working tree: only user's out-of-scope `src/index.css`, `src/pages/Dashboard.tsx` modified; untouched.

## Human verification
None required; CI evidence was supplied externally and accepted.

## Orphaned requirements
None: QUAL-01..06 are all claimed by plans (01-01 claims 01-03; remaining by 01-02..01-04) and all map to Phase 1.

_Verified: 2026-10-06 — Verifier: Claude (gsd-verifier)_

## Addendum — post-close review (2026-10-07)

The report above is kept as written; this section records what changed after it.

- **QUAL-02 caveat resolved.** Commit `1a624b8` (after this report) wraps the pglite import in `tests/consistency-sql.mjs`: on `ERR_MODULE_NOT_FOUND` it prints a clear message (test-only dependency, `npm install` or `PGLITE_MODULE`) and exits 1, so `npm test` still fails. QUAL-02 is now VERIFIED without caveat.
- **Bookkeeping findings resolved.** ROADMAP Phase 1 checkbox is `[x]`, progress table row is `4/4 | Complete | 2026-10-06`, and REQUIREMENTS traceability rows QUAL-01..06 read `Completo` (commit `b4507b6`). STATE.md body resynced on 2026-10-07.
- **CI on the closing HEAD.** Run 37530626266 on `b4507b6` concluded `success`, covering the post-report commits `99f4947` and `1a624b8`; no longer relying only on the earlier runs.
- **Re-run locally (Node 24.15.0):** `npm test` exit 0 (14 pass / 0 fail + `PASS SQL`), `npm run lint` exit 0, `npm run build` exit 0.
- **Still open, unchanged:** QUAL-03 indentation not enforced by any rule; WR-03 and IN-02 remain accepted debt; `onAuthStateChange` callbacks not exercised.
