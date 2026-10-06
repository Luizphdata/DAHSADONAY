---
phase: 1
slug: infra-de-qualidade-do-reposit-rio
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-06
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derivada de `01-RESEARCH.md` § Validation Architecture. As afirmações marcadas
> VERIFICADO foram reproduzidas executando código nesta máquina durante a pesquisa,
> não inferidas da documentação.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in `node:test` (Node 24.15.0 local), via `npm test` — mantido, não substituído por Vitest |
| **Config file** | Nenhum exigido pelo `node:test`. O loader `tsx/esm` lê `"jsx": "react-jsx"` do `tsconfig.app.json`, que já existe |
| **Quick run command** | `node --import tsx/esm --experimental-test-module-mocks --test tests/<arquivo>` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30s local (o teste PGlite domina: instancia Postgres real em memória) |

**Duas restrições de runtime que a pesquisa verificou executando:**

1. O type-stripping nativo do Node **recusa `.tsx`** — JSX não é sintaxe de tipo e não pode ser apagado por espaços em branco. Por isso `AuthContext.test.tsx` exige `--import tsx/esm`. Sem isso, `node --test` falha de saída.
2. `t.mock.module()` exige a flag `--experimental-test-module-mocks` no Node 24.15.0 pinado aqui, apesar de a documentação upstream atual sugerir o contrário para linhas mais novas do Node. Mock parcial precisa espalhar os exports reais do módulo primeiro: `exports` substitui, não mescla.

---

## Sampling Rate

- **Após cada commit de tarefa:** o arquivo de teste novo/alterado pelo quick run command, mais `npm run lint`
- **Após cada wave:** `npm test` completo mais `npm run build` (`tsc -b && vite build`)
- **Antes de `/gsd-verify-work`:** `npm test`, `npm run lint` e `npm run build` verdes localmente **e** um commit publicado com execução verde no GitHub Actions
- **Max feedback latency:** ~30s local

---

## Per-Task Verification Map

Mapeamento por requisito. O detalhamento por tarefa é preenchido pelo `gsd-planner`;
toda tarefa precisa herdar o comando automatizado da sua linha aqui.

| Requirement | Behavior | Test Type | Automated Command | File Exists |
|-------------|----------|-----------|-------------------|-------------|
| QUAL-01 | `npm test` roda as suítes reais num comando e falha se qualquer uma quebrar | integration (meta) | `npm test` | ❌ W0 — falta o script `test` |
| QUAL-02 | `@electric-sql/pglite@0.3.14` é exclusiva de teste; falha com mensagem clara quando ausente | config check | `npm ls @electric-sql/pglite --omit=dev` (não deve listar nada) | ❌ W0 — falta entrada no `package.json` |
| QUAL-03 | `eslint .` cobre as duas áreas sem contaminar o estilo de uma com o da outra | lint (static) | `npm run lint` | ❌ W0 — falta `eslint.config.js` |
| QUAL-04 | CI roda `tsc -b`, lint e testes a cada push, e falha visivelmente | CI (externo) | status da execução do GitHub Actions num commit publicado | ❌ W0 — falta `.github/workflows/ci.yml` |
| QUAL-05 | `README.md` e `CLAUDE.md` respondem como rodar/testar, as convenções por área e o runbook do pacote de consistência — incluindo o aviso de que `baseline-functions.sql` não é migração | doc content check | revisão manual (ver Manual-Only abaixo) | ❌ W0 — faltam os dois arquivos |
| QUAL-06 | `useDashboard.ts`: troca de filtros, refresh em segundo plano, estado offline. `AuthContext.tsx`: restauração de sessão | unit/integration (jsdom + Testing Library) | `node --import tsx/esm --experimental-test-module-mocks --test tests/useDashboard.test.ts tests/AuthContext.test.tsx` | ❌ W0 — faltam os dois arquivos |

---

## Wave 0 Requirements

- [ ] `package.json` — scripts `test` e `lint`; devDependencies do § Standard Stack da pesquisa
- [ ] `package.json` — `@electric-sql/pglite@0.3.14` como devDependency explícita (hoje ausente por completo)
- [ ] `eslint.config.js` — flat config com dois blocos `files`-scoped (`src/` e `supabase/functions/`), usando o export `denoBuiltin` do pacote `globals` para o bloco Deno
- [ ] `.github/workflows/ci.yml` — pipeline rodando `tsc -b`, lint e testes
- [ ] `tests/useDashboard.test.ts` — filtros, refresh em segundo plano, offline
- [ ] `tests/AuthContext.test.tsx` — restauração de sessão
- [ ] `README.md`, `CLAUDE.md`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Conteúdo da documentação responde às quatro perguntas | QUAL-05 | Nenhum teste automatizado de conteúdo de doc é proposto — verificar prosa automaticamente produziria asserção frágil sobre texto, não sobre comportamento | Ler `README.md` e `CLAUDE.md` sem abrir código e confirmar que respondem: como rodar, como testar, as convenções de cada área, e o runbook do `consistency-v1`. Confirmar presença literal do aviso de que `baseline-functions.sql` não é migração |
| CI verde num push real | QUAL-04 | Depende de infraestrutura externa ao repositório | Publicar um commit no branch e conferir a execução no GitHub Actions |
| `tests/build-consistency-package.py` | — (fora de escopo do `npm test`) | Gerador de código, não suíte: exige um CSV que não está no repositório e Python não está instalado localmente | Documentar como ferramenta manual no `README.md`. Deliberadamente **não** incluído no `npm test` nem na CI |

---

## Validation Sign-Off

- [ ] Toda tarefa tem comando automatizado ou dependência declarada de Wave 0
- [ ] Continuidade de amostragem: sem 3 tarefas consecutivas sem verificação automatizada
- [ ] Wave 0 cobre todas as referências MISSING
- [ ] Nenhuma flag de watch mode (quebraria a CI por nunca terminar)
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` no frontmatter

**Approval:** pending

---

## Decisões registradas nas três questões abertas da pesquisa

1. **`build-consistency-package.py` fica fora do `npm test`**, documentado como ferramenta manual. QUAL-01 nomeia apenas dois comandos; o script exige um CSV ausente do repositório, não tem asserções próprias e o Python não está instalado. O critério 1 da Fase 1 no `ROADMAP.md` foi corrigido para refletir isso. *Pendência futura, não bloqueante:* o arquivo provavelmente não deveria morar em `tests/`, já que não é teste.
2. **`@electric-sql/pglite` permanece pinada em `0.3.14`**, não sobe para `0.5.8`. É a versão contra a qual o harness e o `supabase/consistency-v1/README.md` foram escritos e testados, e a compatibilidade da API do `0.5.8` com o uso exato de `tests/consistency-sql.mjs` não foi testada. Avaliar o bump é trabalho de follow-up.
3. **Arquivos de teste não entram em `tsconfig` para `tsc -b`**, mantendo a consistência com as suítes `.mjs` existentes, que nunca foram type-checked. Sem adicionar `@types/node` por isso.
