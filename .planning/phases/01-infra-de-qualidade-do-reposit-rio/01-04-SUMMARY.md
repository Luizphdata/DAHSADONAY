---
phase: 01-infra-de-qualidade-do-reposit-rio
plan: 04
subsystem: docs
tags: [readme, claude-md, documentation, consistency-v1, onboarding]

# Dependency graph
requires: ["01-01"]
provides:
  - "Root README.md: how to run, how to test (npm test / single-file / PGLITE_MODULE), per-area style conventions, consistency-v1 runbook with verbatim migration warning"
  - "Root CLAUDE.md: same facts as hard directives for a future AI agent, plus the gsd-sdk state.* Portuguese-STATE.md limitation discovered this phase"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["Prose documentation in Brazilian Portuguese, code identifiers/commands kept in English, matching supabase/consistency-v1/README.md's tone"]

key-files:
  created: ["README.md", "CLAUDE.md"]
  modified: []

key-decisions:
  - "Reproduced the baseline-functions.sql warning verbatim (not paraphrased) in both files, exactly as it appears in supabase/consistency-v1/README.md:10, per the plan's hard requirement"
  - "Linked README.md's runbook section to the literal path supabase/consistency-v1/README.md (not just an allusion) to satisfy the must_haves.key_links acceptance check"
  - "Added a CLAUDE.md directive (beyond the plan's own spec) documenting that gsd-sdk's state.* query handlers expect English headings and silently no-op against this project's Portuguese STATE.md body — discovered the hard way twice during this phase, so future agents don't rediscover it"

requirements-completed: [QUAL-05]

# Metrics
duration: 20min
completed: 2026-10-06
---

# Phase 1 Plan 4: README.md and CLAUDE.md Summary

**Wrote the repository's first root `README.md` (human-facing) and `CLAUDE.md` (agent-facing directives), both documenting how to run/test, per-area style conventions, and the consistency-v1 runbook with the verbatim baseline-functions.sql migration warning.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2 completed
- **Files created:** 2 (`README.md`, `CLAUDE.md`)

## Accomplishments
- `README.md` now answers, without opening any source file: what the app is, requirements (Node `24.15.0`), how to run (`npm install`/`dev`/`build`/`preview`, `.env.local` requirement), how to test (`npm test` as the single authoritative command, the single-file quick-run command, the `PGLITE_MODULE` env var, and `tests/build-consistency-package.py` explicitly flagged as a manual, non-CI tool), per-area style conventions (`src/` semicolon-free/single-quote vs `supabase/functions/` semicolon/double-quote, enforced by `npm run lint`), and the `consistency-v1` runbook linked by literal path with the verbatim migration warning.
- `CLAUDE.md` restates the same facts as imperative directives for a future AI agent: never run `build-consistency-package.py` unattended, never run `baseline-functions.sql` as a migration (verbatim warning), keep `@electric-sql/pglite` pinned at `0.3.14` in devDependencies only, never unify the two areas' styles, never add watch-mode flags to CI scripts, and where to read planning docs before acting on a new phase.
- Added one directive beyond the plan's literal scope: documented that `gsd-sdk query state.*` handlers (`state.update-progress`, `state.record-metric`, `state.add-decision`) expect English section headings and silently no-op against this project's Portuguese-language `STATE.md` body (only the frontmatter gets resynced), while `roadmap.update-plan-progress` and `requirements.mark-complete` work correctly. Also noted the frontmatter's `progress.total_phases` gets regenerated as `9` instead of the correct `8` and needs manual correction after those handlers run.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write README.md** - `b7cbf68` (docs)
2. **Task 2: Write CLAUDE.md** - `ffffc82` (docs)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `README.md` - New. Sections: título/visão geral, requisitos, como rodar, como testar, convenções por área, runbook do pacote consistency-v1 (with literal path link and verbatim warning).
- `CLAUDE.md` - New. Sections: o que este repositório é, regras obrigatórias (including the state.* Portuguese-STATE.md note), como rodar/testar, convenções por área, onde estão as definições de produto/plano.

## Decisions Made
- Documentation facts were sourced from `supabase/consistency-v1/README.md` (tone/structure reference), `.planning/codebase/CONVENTIONS.md`, `package.json` (post-Plan-01 scripts), and this session's own verified state (14 tests passing, exact `npm test` script string, `node 24.15.0`) rather than re-deriving facts from first principles — per the plan's explicit "exact facts to reproduce, not invent" interface contract.
- Extended CLAUDE.md with the `state.*`/Portuguese-STATE.md directive per this plan's own prompt instructions (not in the original 01-04-PLAN.md task list), treated as Rule 2 (missing critical operational knowledge that previously caused silent state-update data loss twice in this phase).

## Deviations from Plan

### Auto-added

**1. [Rule 2 - missing critical functionality] Added gsd-sdk state.* / Portuguese STATE.md directive to CLAUDE.md**
- **Found during:** Task 2
- **Issue:** The 01-04-PLAN.md task list did not include this directive, but the orchestrator's prompt flagged it as having caused silent data loss of state updates twice during this phase (state.update-progress / state.record-metric / state.add-decision no-op against Portuguese section headings).
- **Fix:** Added as a sixth bullet under "Regras obrigatórias" in CLAUDE.md, stating the limitation, which handlers are affected vs. unaffected, and the `progress.total_phases` miscalculation.
- **Files modified:** `CLAUDE.md`
- **Commit:** `ffffc82`

**Total deviations:** 1 auto-added (Rule 2), no auto-fixed bugs, no architectural questions.

## Issues Encountered
None. Both files' acceptance criteria were verified directly via `grep` before committing:
- `grep -n "supabase/consistency-v1/README.md" README.md` → match (line 78)
- `grep -n "Não executar como migração" README.md` → match (line 82)
- `grep -n "Não executar como migração" CLAUDE.md` → match (line 18)
- `grep -n "build-consistency-package.py" CLAUDE.md` → match (line 13, "Nunca execute")
- `grep -n "0.3.14" CLAUDE.md` → match (line 19)
- `grep -n "watch mode" CLAUDE.md` → match (line 25)
- `grep -n ".planning/ROADMAP.md" CLAUDE.md` → match (line 69)

## User Setup Required
None - documentation only, no external service configuration.

## Next Phase Readiness
- QUAL-05 closed. Both README.md and CLAUDE.md exist at repo root and are internally consistent with each other and with the actual current `package.json`/`eslint.config.js` state.
- No blockers identified for 01-03 or later phases.

---
*Phase: 01-infra-de-qualidade-do-reposit-rio*
*Completed: 2026-10-06*

## Self-Check: PASSED
