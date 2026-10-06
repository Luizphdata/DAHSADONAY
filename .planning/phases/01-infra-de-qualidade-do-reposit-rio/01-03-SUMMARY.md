---
phase: 01-infra-de-qualidade-do-reposit-rio
plan: 03
subsystem: ci
tags: [github-actions, ci, quality]
requires: [01-01]
provides: [".github/workflows/ci.yml"]
key-files:
  created: [.github/workflows/ci.yml]
requirements: [QUAL-04]
status: partial-pending-checkpoint
completed: 2026-10-06
---

# Phase 01 Plan 03: CI pipeline Summary

Workflow do GitHub Actions (push e pull_request) que roda `npm ci`, `npm run build`, `npm run lint` e `npm test` em Node 24.15.0 fixado.

## Tarefas

| Tarefa | Status | Commit |
|---|---|---|
| 1. Criar `.github/workflows/ci.yml` | Concluída | 36082a3 |
| 2. Confirmar execução verde no GitHub (checkpoint:human-verify) | **PENDENTE** | - |

## Evidência de CI verde: PENDENTE

Nenhum push foi feito (a branch `gsd/onboarding` não tem upstream e o `gh` não está instalado). QUAL-04 só está satisfeito quando o usuário publicar a branch e confirmar uma execução verde em https://github.com/Luizphdata/DAHSADONAY/actions.

## Verificações

- 4 passos `run: npm`, na ordem ci, build, lint, test.
- `npm ci` precede `npm test` (cross-env é devDependency).
- `TSX_TSCONFIG_PATH` não duplicado no workflow (já definido via cross-env no script).
- `actions/checkout` e `actions/setup-node`: v7 confirmado como major mais recente via `git ls-remote --tags`.
- Nenhum secret referenciado (T-01-05).

## Desvios

Nenhum. Arquivos do usuário (`src/index.css`, `src/pages/Dashboard.tsx`) e `.claude/` não foram tocados.

## Checkpoint resolvido — evidência da execução verde (2026-10-06)

O checkpoint `human-verify` da Task 2 foi satisfeito com evidência verificada, não com aprovação verbal.

- Branch `gsd/onboarding` publicado com autorização explícita do usuário. SHA: `f61b3aac07fa3a59cb0c1c9bbc840142b0747cf2`
- Execução: https://github.com/Luizphdata/DAHSADONAY/actions/runs/37511878474
- Resultado do job `verify`: **success**
- Passos, todos verdes: `actions/checkout@v7`, `actions/setup-node@v7`, `npm ci`, `npm run build`, `npm run lint`, `npm test`

O resultado foi lido pela API pública do GitHub (`/actions/runs/{id}/jobs`), que responde sem autenticação
porque o repositório é público — o `gh` CLI não está instalado nesta máquina. Isso permitiu confirmar os
passos individualmente em vez de confiar apenas na conclusão agregada do job.

**Valor adicional desta evidência:** a suíte passou em `ubuntu-latest`, não apenas no Windows local.
Isso exercita o caminho que mais preocupava neste setup — o `cross-env TSX_TSCONFIG_PATH=tsconfig.app.json`
e o glob `tests/**/*.test.{mjs,ts,tsx}` são exatamente o tipo de construção que funciona num SO e quebra
no outro. Agora está comprovado nos dois.

QUAL-04 marcado completo. Plano 01-03 fechado.
