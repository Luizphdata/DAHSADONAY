---
status: resolved
phase: 01-infra-de-qualidade-do-reposit-rio
depth: standard
reviewed: 2026-10-06
critical: 0
warnings: 3
info: 4
---

# Fase 1 — Revisão de código

Escopo: os 7 arquivos de código/documentação alterados em `origin/main..HEAD`.
Fora de escopo: `package-lock.json` (gerado), `.planning/` (artefatos de planejamento), e as
alterações não commitadas do usuário em `src/index.css` e `src/pages/Dashboard.tsx`.

## Achado central: a suíte não era falsificável

O revisor apontou que dois dos três testes do `useDashboard` passariam com o comportamento quebrado.
**A verificação por mutação mostrou que era pior: todos os três passavam.** Removendo
`void request('filter')` do hook, a suíte seguia 3/3 verde.

Isso não era um defeito cosmético. A Fase 1 existe para ser a rede de proteção das Fases 2 a 6, que
alteram a camada de dados em produção. Uma suíte que aprova a remoção completa de um comportamento
oferece confiança falsa — pior que nenhuma suíte, porque seria confiada.

### Causa raiz

O efeito de polling do hook lista `filters` nas dependências, e o intervalo está mockado em 20 ms.
Removido o refetch de filtro, **o próprio poller** re-subscreve com os filtros novos e busca em 20 ms.
Consequência: nem `callCount > anterior` nem indexar o fake por `params.preset` distinguem os dois
caminhos — ambos terminam requisitando `'ayer'`. A primeira tentativa de correção falhou por isso.

O único discriminador é **o instante**: o efeito de filtro requisita sincronamente; o poller, só após
20 ms. As asserções decisivas passaram a ser síncronas, antes de qualquer `await`.

### Matriz de mutação (executada, não inferida)

| Estado do código | Resultado esperado | Resultado obtido |
|---|---|---|
| Íntegro | 3/3 passam | 3/3 passam |
| Sem `void request('filter')` | teste de filtros falha | **falha** |
| Sem `void request('online')` | teste de offline falha | **falha** |

Antes da correção, as duas mutações passavam silenciosamente.

## Warnings

| ID | Arquivo | Achado | Situação |
|---|---|---|---|
| WR-01 | `tests/useDashboard.test.ts` | Teste de troca de filtros não falsificável | **Corrigido** — asserção síncrona sobre `receivedParams` |
| WR-02 | `tests/useDashboard.test.ts` | Teste de offline satisfeito pelo poller | **Corrigido** — afirma que `callCount` não muda em 80 ms; handler `'online'` verificado sem `await` |
| WR-03 | `eslint.config.js`, `tsconfig.app.json` | `tests/` não é coberto por nenhum bloco de lint nem pelo `tsc -b` | **Aceito como dívida** — ver abaixo |

## Info

| ID | Achado | Situação |
|---|---|---|
| IN-01 | Asserção vazia em `AuthContext.test.tsx`: `authStateCalls.count === 0` com cliente mockado como `null` nunca poderia falhar | **Corrigido** — removida; nome do teste ajustado ao que ele verifica |
| IN-02 | `AuthContext` não cobre `unsubscribe` no unmount, `signIn`, `signOut`, nem a rejeição de `getSession` | **Dívida registrada** — QUAL-06 nomeia restauração de sessão, que está coberta |
| IN-03 | Workflow de CI sem bloco `permissions`; `on: [push, pull_request]` roda duas vezes em PR do mesmo repo | **Parcial** — `permissions: contents: read` adicionado; execução dupla aceita (custo trivial, e PR de fork precisa do gatilho) |
| IN-04 | Comentário sobre a limitação do mock de config está correto, sem ação | Nenhuma ação |

## Verificado e considerado sólido

- **Costuras de mock corretas.** `useDashboard.test.ts` mocka `src/services/dashboard.ts`, que é exatamente o que o hook importa. Não mocka o cliente Supabase, que o hook nunca usa.
- **Sem vazamento de estado entre testes.** `node --test` roda cada arquivo em processo próprio; o teste do `AuthContext` usa `t.mock.module` por teste mais import com cache-bust (`?case=...`), de modo que cada caso recebe grafo de módulos novo.
- **Ambos os ramos de nulidade do `AuthContext` cobertos** — o `supabase === null` e o configurado com restauração de sessão.
- **`package.json`**: `@electric-sql/pglite` em `0.3.14` exato e só em `devDependencies`. Nada novo em `dependencies`. Nenhuma flag de watch.
- **`README.md` e `CLAUDE.md`**: comandos, caminhos e contagens conferem com o repositório. O aviso obrigatório sobre `baseline-functions.sql` está reproduzido literalmente. Nenhum erro factual.
- A redução deliberada do preset `react-hooks` **não** foi tratada como achado, por ser decisão já revisada.

## Dívida aceita nesta fase

**WR-03 — `tests/` fora do lint e do type-check.** Os globs do ESLint cobrem `src/**/*.{ts,tsx}` e
`supabase/functions/**/*.ts`; `tests/`, `vite.config.ts` e `eslint.config.js` não são verificados.
O `tsc -b` inclui apenas `src`, então os testes `.ts`/`.tsx` novos nunca são type-checked — os casts
`as unknown as` nos fixtures existem por isso.

Não corrigido aqui por decisão de escopo: QUAL-03 pede lint sobre as duas áreas de código-fonte, e
é o que foi entregue. Adicionar um terceiro bloco para `tests/` é trabalho pequeno e de valor real,
mas mudaria o contrato da fase depois da sua verificação. Candidato natural à Fase 7, que já vai
mexer na configuração do frontend.

**IN-02 — cobertura adicional do `AuthContext`.** `signIn`, `signOut` e o ramo de rejeição de
`getSession` seguem sem teste. QUAL-06 nomeia restauração de sessão, troca de filtros, refresh em
segundo plano e estado offline — todos cobertos. O resto é ampliação, não lacuna do requisito.
