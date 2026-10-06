---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-10-06T16:04:11.359Z"
progress:
  total_phases: 8
  completed_phases: 0
  total_plans: 4
  completed_plans: 3
  percent: 75
---

# Estado do projeto

## Referência do projeto

Ver: `.planning/PROJECT.md` (atualizado em 2026-10-06)

**Valor central:** A Adonay entra e consulta resultados em que pode confiar — o indicador de maior destaque tem regra de contagem definida, validada contra os dados reais do Supabase e explicada na tela.
**Foco atual:** Fase 1 — Infra de qualidade do repositório

## Posição atual

Fase: 1 de 8 (Infra de qualidade do repositório)
Plano: 3 de 4 na fase atual
Status: Executing Phase 01
Última atividade: 2026-10-06 — plano 01-04 concluído (README.md e CLAUDE.md na raiz do repositório, QUAL-05). Plano 01-03 (CI) ainda pendente.

Progresso: [███████░░░] 75% (3/4 planos da Fase 1)

## Métricas de desempenho

**Velocidade:**

- Planos concluídos: 3
- Duração média: ~30min
- Tempo total de execução: ~90min

**Por fase:**

| Fase | Planos | Total | Média/plano |
|------|--------|-------|-------------|
| 1 | 3 | ~90min | ~30min |

**Tendência recente:**

- Últimos 5 planos: 01-01 (15min), 01-02 (~55min), 01-04 (~20min)
- Tendência: —

*Atualizado após cada plano concluído*

## Contexto acumulado

### Decisões

O log completo está na tabela "Decisões-chave" de `.planning/PROJECT.md`. As sete decisões do `PLANEJAMENTO-GTD.md` são **firmes mas não travadas** (nenhum ADR foi ingerido). Decisões que afetam o trabalho atual:

- **Variante C** (2026-10-06, escolha do usuário): definir e documentar o conjunto de eventos que representam contato — incluindo os outros botões do painel, não apenas WhatsApp — e validar contra dados reais **antes** de fixar a regra de contagem. É descoberta, não implementação: Fase 3.
- **O rótulo visível do indicador fica em aberto** até a Fase 7, depois de a regra de contagem estar fixada na Fase 5. Nenhuma fase nomeia a métrica antes disso.
- **Ordem das frentes preservada:** F1 infra → F2 consistency-v1 → F3 achados abertos → F4 interface → F5 publicação. A F3 foi subdividida em quatro fases (3 a 6) porque `CON-ordem-correcao` impõe sub-passos ordenados.
- **[Fase 01-01]** `eslint-plugin-react-hooks@7.1.1`'s bundled `recommended`/`recommended-latest` presets ship newer React-Compiler-oriented rules (set-state-in-effect, refs, purity etc.) that flag existing working code with no real bug; `eslint.config.js`'s `src/` block registers only `rules-of-hooks`/`exhaustive-deps` explicitly instead of spreading a preset, to avoid forcing application-logic rewrites out of this plan's scope.
- **[Fase 01-01]** `react-refresh/only-export-components` got an `allowExportNames: ['useAuth']` override so the documented hook+provider co-location in `AuthContext.tsx` (CONVENTIONS.md § Module Design) doesn't fail lint.
- **[Fase 01-02]** `node:test`'s `mock.module()` `exports` getters são avaliados **uma única vez**, no primeiro acesso ao módulo, e depois viram um valor fixo (congelado) — não são reavaliados a cada leitura (verificado empiricamente com um repro mínimo em `node:os`). Isso invalida a técnica literal do plano (mock único no topo do arquivo + getters trocando de cenário por teste) para `AuthContext.test.tsx`. Técnica corrigida: `t.mock.module()` por teste (restaurado automaticamente entre testes) + import do arquivo sob teste com um specifier "cache-busted" (`?case=...`) a cada teste, forçando uma instância de módulo nova cujo próprio import de `../lib/supabase` resolve contra o mock daquele teste.
- **[Fase 01-02]** O script `npm test` herdado da Fase 01-01 quebrava em qualquer arquivo de teste `.tsx`: o `tsx/esm` loader resolve o `tsconfig.json` mais próximo subindo diretórios, e a raiz deste repo é um `tsconfig.json` "solution-style" (`files: []`, só `references`, sem `jsx`), então `AuthContext.tsx` usava o classic transform do JSX e quebrava com `ReferenceError: React is not defined`. Corrigido fixando `TSX_TSCONFIG_PATH=tsconfig.app.json` no script `test` (via `cross-env`, nova devDependency, para funcionar tanto no Windows local quanto no `ubuntu-latest` da CI).
- **[Fase 01-02]** jsdom, por padrão, inicializa `document.visibilityState` como `'prerender'`/`hidden: true` a menos que `pretendToBeVisual: true` seja passado ao construtor — sem isso, o polling e a reconexão automática de `useDashboard.ts` nunca disparam nos testes (falha silenciosa, sem erro explícito). Ambos os novos arquivos de teste usam `pretendToBeVisual: true`.
- **[Fase 01-04]** `gsd-sdk query state.*` (`state.update-progress`, `state.record-metric`, `state.add-decision`) espera cabeçalhos em inglês e faz no-op silencioso no corpo deste `STATE.md`, que é escrito em português — só o frontmatter é resincronizado. Documentado como diretiva em `CLAUDE.md`. Atualizações do corpo deste arquivo continuam manuais.

### Pendências e todos

Decisões registradas como **NÃO tomadas** (não tratar como resolvidas):

- Nome e explicação finais do indicador hoje rotulado `Contactos` → Fase 7
- Organização de telas e disposição da visão geral (propostas sujeitas à revisão) → Fase 7
- Idioma da interface (espanhol é hipótese inicial) → Fase 7
- Quem receberá acesso → Fase 8
- Limiar e semântica da deduplicação de três segundos → definido na Fase 3
- Onde hospedar a aplicação publicada → Fase 8

Nenhum todo capturado em `.planning/todos/pending/` ainda.

### Bloqueios e preocupações

- **Camada de dados fora do repositório:** os achados #1, #3 e #4 vivem em `vw_whatsapp_leads_normalized` e `vw_whatsapp_leads_dashboard`, que não estão no repo. Fases 3, 4 e 5 exigem acesso autenticado ao Supabase. O acesso admin **com cópia de teste separada** está disponível, então a sequência "cópia de teste primeiro" é executável.
- **Impacto não medido:** a auditoria foi revisão **estática**. Os seis achados são riscos demonstráveis pela leitura do código, não defeitos medidos. A Fase 3 (DESC-04) converte isso em números antes de qualquer correção.
- **`consistency-v1` nunca aplicado:** a dash em produção ainda executa a lógica antiga nos seis achados. Fase 2.
- **Cobertura de teste declarada que não existe:** os "testes de navegador com respostas de rede simuladas" citados no `PLANEJAMENTO-GTD.md` não existem como suíte executável. Tratar como cobertura não reproduzível (VIS-07 cria a versão reproduzível).
- **Gate de publicação ativo:** `CON-ordem-correcao` item 5 — nada é publicado antes de validar acesso e resultados reais. Publicar um número errado é pior do que não publicar.

## Itens diferidos

| Categoria | Item | Status | Diferido em |
|-----------|------|--------|-------------|
| *(nenhum)* | | | |

## Continuidade de sessão

Última sessão: 2026-10-06
Parou em: Execução do plano 01-04-PLAN.md (README.md e CLAUDE.md na raiz do repositório) — QUAL-05 concluído. Ambos documentam como rodar/testar, convenções por área e o runbook do pacote `consistency-v1` com o aviso verbatim sobre `baseline-functions.sql`.
Arquivo de retomada: Nenhum
Próxima ação: Executar `01-03-PLAN.md` (CI no GitHub Actions: `tsc -b`, lint, testes a cada push — QUAL-04)
