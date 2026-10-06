# CLAUDE.md

Diretrizes para um agente de IA (Claude) trabalhando neste repositório.

## 1. O que este repositório é

Dashboard Adonay: uma SPA Vite/React que lê dados de contatos do WhatsApp a partir do Supabase,
por meio de uma única Edge Function (`dashboard-whatsapp`). Para contexto completo de produto e
plano, ver `.planning/PROJECT.md`.

## 2. Regras obrigatórias

- Nunca execute `tests/build-consistency-package.py` a partir de `npm test`, CI, ou qualquer
  automação sem supervisão direta do usuário — ele exige um caminho de CSV exportado manualmente
  do Supabase que não existe no repositório, e não tem asserções próprias.
- Nunca execute `supabase/consistency-v1/baseline-functions.sql` como migração. Reproduza o aviso
  exato:
  > `baseline-functions.sql`: referência exportada e entrada dos testes. **Não executar como migração.**
- `@electric-sql/pglite` permanece pinada em `0.3.14`, exclusivamente em `devDependencies` — não
  promova para `dependencies`, não faça bump de versão sem revalidar `tests/consistency-sql.mjs`
  contra a nova versão.
- Não introduza Prettier nem unifique o estilo entre `src/` (sem ponto-e-vírgula, aspas simples) e
  `supabase/functions/` (ponto-e-vírgula, aspas duplas) — são convenções distintas por desenho,
  não um descuido a corrigir.
- Nunca adicione flag de watch mode a nenhum script que rode em CI.
- `gsd-sdk query state.*` handlers (`state.update-progress`, `state.record-metric`,
  `state.add-decision`) esperam cabeçalhos em INGLÊS (`Progress:`, `### Decisions`), mas o corpo
  de `.planning/STATE.md` deste projeto é escrito em português. Como resultado, esses três
  handlers silenciosamente fazem no-op no corpo — eles só ressincronizam o frontmatter. Quem
  atualizar `STATE.md` deve editar as seções do corpo manualmente, em português. Em contraste,
  `roadmap.update-plan-progress` e `requirements.mark-complete` funcionam normalmente (regex sem
  dependência de idioma). Note também que `progress.total_phases` no frontmatter é regenerado
  incorretamente (9 em vez de 8) por esses handlers e precisa ser corrigido manualmente depois
  que eles rodam.

## 3. Como rodar/testar

```bash
npm install
npm run dev       # servidor de desenvolvimento
npm run build     # tsc -b && vite build
npm run preview
npm test          # suíte completa: channelInsights, consistency-edge, useDashboard,
                   # AuthContext (node --test) + consistency-sql.mjs
```

Execução rápida de um único arquivo durante desenvolvimento:

```bash
node --import tsx/esm --experimental-test-module-mocks --test tests/useDashboard.test.ts
```

`PGLITE_MODULE` (opcional): caminho absoluto para um `dist/index.js` pré-compilado do
`@electric-sql/pglite`, usado por `tests/consistency-sql.mjs` quando o pacote não é resolvível
via resolução normal do npm. Detalhes completos em `README.md`.

## 4. Convenções por área

- `src/`: sem ponto-e-vírgula, aspas simples, indentação de 2 espaços.
- `supabase/functions/`: ponto-e-vírgula, aspas duplas (convenção do Deno).
- Regra ao editar: siga sempre o estilo já existente do arquivo/área que está sendo editada,
  nunca o estilo da outra área. `npm run lint` verifica ambas sem reescrever uma na outra.

## 5. Onde estão as definições de produto/plano

Antes de agir sobre uma nova fase, leia:

- `.planning/PROJECT.md` — contexto e valor central do produto.
- `.planning/ROADMAP.md` — roteiro de fases e planos.
- `.planning/REQUIREMENTS.md` — requisitos rastreáveis.
- `.planning/STATE.md` — posição atual, decisões e bloqueios (corpo em português, ver regra
  acima sobre os handlers `state.*`).
