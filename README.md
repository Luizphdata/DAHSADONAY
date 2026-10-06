# Dashboard Adonay

Visão geral, consulte também `.planning/PROJECT.md` para contexto de produto.

## 1. Título e visão geral

Dashboard Adonay é uma SPA Vite/React que lê dados de contatos do WhatsApp a partir do Supabase,
por meio de uma única Edge Function (`dashboard-whatsapp`). Para o contexto de produto (valor
central, decisões, roadmap), ver `.planning/PROJECT.md`.

## 2. Requisitos

- Node **24** (versão conhecida e validada localmente: `24.15.0`). Use essa versão fixa — é a
  mesma usada em CI.
- npm (instalado junto com o Node).

## 3. Como rodar

```bash
npm install
npm run dev       # servidor de desenvolvimento (Vite)
npm run build     # tsc -b && vite build
npm run preview   # serve o build de produção localmente
```

A aplicação precisa de um arquivo `.env.local` com `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY` para conseguir se conectar ao Supabase. Veja `.env.example` para o
formato esperado — nunca cole valores reais em README.md, CLAUDE.md ou qualquer arquivo versionado.

## 4. Como testar

O comando único e autoritativo é:

```bash
npm test
```

Ele roda, nessa ordem, toda a suíte automatizada real: `channelInsights.test.mjs`,
`consistency-edge.test.mjs`, `useDashboard.test.ts`, `AuthContext.test.tsx` (via `node --test`) e,
em seguida, `consistency-sql.mjs`. Falha com código de saída diferente de zero se qualquer teste
quebrar. Por baixo dos panos, o script é:

```bash
cross-env TSX_TSCONFIG_PATH=tsconfig.app.json node --import tsx/esm --experimental-test-module-mocks --test "tests/**/*.test.{mjs,ts,tsx}" && node tests/consistency-sql.mjs
```

Para iteração rápida durante o desenvolvimento, rode um único arquivo:

```bash
# single-file quick run, e.g. during development:
node --import tsx/esm --experimental-test-module-mocks --test tests/useDashboard.test.ts
```

**Variável de ambiente `PGLITE_MODULE`:** opcional. Aponta para o caminho absoluto de um
`dist/index.js` pré-compilado do `@electric-sql/pglite`, usado pelo teste SQL
(`tests/consistency-sql.mjs:4`) quando o pacote não é resolvível pela resolução normal do npm.

**`tests/build-consistency-package.py` é uma ferramenta manual, não parte de `npm test`.** Ele é
um gerador de código que recebe, como único argumento de linha de comando, o caminho de um CSV
exportado manualmente do Supabase; não tem asserções próprias; e Python não está instalado nesta
máquina de desenvolvimento. Rode-o manualmente apenas ao ressincronizar `supabase/consistency-v1/`
a partir de uma exportação nova do Supabase. Nunca o inclua em `npm test` ou em CI.

## 5. Convenções por área

- `src/`: sem ponto-e-vírgula (semicolon-free), aspas simples, indentação de 2 espaços.
- `supabase/functions/` (Deno Edge Function): com ponto-e-vírgula, aspas duplas — seguindo a
  convenção própria do Deno.
- Ambas as áreas são verificadas por `npm run lint` (`eslint .`), que usa dois blocos
  `files`-scoped distintos em `eslint.config.js` e não reescreve o estilo de uma área na outra.

## 6. Runbook do pacote `consistency-v1`

`supabase/consistency-v1/` contém correções SQL preparadas para os achados #2/#5/#6 da auditoria
de consistência dos indicadores. Essas correções estão prontas mas **ainda não foram aplicadas**
ao projeto Supabase em produção. A sequência completa de aplicação em 8 passos, com validação
antes/depois e plano de reversão, está documentada em
[`supabase/consistency-v1/README.md`](supabase/consistency-v1/README.md).

Aviso a reproduzir sempre que o pacote for mencionado, sem paráfrase:

> `baseline-functions.sql`: referência exportada e entrada dos testes. **Não executar como migração.**
