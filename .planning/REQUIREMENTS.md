# Requisitos: Dashboard Adonay

**Definidos:** 2026-10-06
**Valor central:** A Adonay entra e consulta resultados em que pode confiar — o indicador de maior destaque tem regra de contagem definida, validada contra os dados reais do Supabase e explicada na tela.

**Fontes:** `.planning/intel/{requirements,constraints,decisions,context}.md`, `.planning/INGEST-CONFLICTS.md` e `.planning/codebase/*`. Onde um requisito toca a camada de dados, a restrição correspondente em `.planning/intel/constraints.md` **governa** a regra de cálculo.

**Coluna `origem`:** cada requisito abaixo aponta para o requisito/restrição sintetizado de onde vem, preservando a rastreabilidade dos slugs da intel.

---

## Requisitos da v1

### QUAL — Infra de qualidade do repositório

Nenhuma dependência de Supabase. Vem primeiro e protege tudo depois.

- [x] **QUAL-01**: `npm test` executa, em um único comando descobrível, as suítes `node --test tests/*.test.mjs` e o script `node tests/consistency-sql.mjs`, com o pré-requisito de ambiente documentado (Node 24, `PGLITE_MODULE` quando aplicável). *(origem: `.planning/codebase/CONCERNS.md` — "No `npm test` script"; `supabase/consistency-v1/README.md`)*
- [x] **QUAL-02**: `@electric-sql/pglite@0.3.14` está declarado como dependência **exclusiva de teste**, fora de `dependencies` de produção, e o script que a exige falha com mensagem clara quando ela não está instalada. *(origem: `supabase/consistency-v1/README.md` — "A dependência não foi adicionada ao aplicativo de produção")*
- [x] **QUAL-03**: Lint e formatação configurados com regras **por área**: `src/` sem ponto-e-vírgula, aspas simples, 2 espaços; `supabase/functions/` com ponto-e-vírgula e aspas duplas. Rodar o lint não reescreve nenhuma das duas áreas no estilo da outra. *(origem: `.planning/codebase/CONVENTIONS.md`; concern adicional do mapa do código)*
- [x] **QUAL-04**: CI executa `tsc -b`, lint e os testes a cada push, e falha visivelmente quando qualquer um quebra. *(origem: `.planning/codebase/CONCERNS.md` — "No automated CI pipeline")*
- [x] **QUAL-05**: `README.md` e `CLAUDE.md` existem e descrevem: como rodar, como testar, as convenções por área, e o runbook de aplicação do pacote de consistência com o aviso de que `baseline-functions.sql` não é migração. *(origem: `.planning/codebase/CONCERNS.md`; `supabase/consistency-v1/README.md`)*
- [x] **QUAL-06**: `src/hooks/useDashboard.ts` e `src/contexts/AuthContext.tsx` têm teste automatizado cobrindo restauração de sessão, troca de filtros, refresh em segundo plano e estado offline. *(origem: `.planning/codebase/CONCERNS.md` — "Test Coverage Gaps", prioridade alta)*

### CONS — Aplicação do pacote `consistency-v1`

A "próxima ação" declarada no `PLANEJAMENTO-GTD.md`, nunca executada. Endereça os achados #2, #5 e #6.

- [ ] **CONS-01**: O pacote foi aplicado na **cópia de teste** seguindo os 8 passos do `supabase/consistency-v1/README.md` sem improvisar: exportação fresca para reversão, `03-validate.sql` antes, `01-apply.sql` inteiro em transação, `03-validate.sql` depois, resultados dos dois momentos guardados e comparados. *(origem: `CON-estado-consistency-v1`, `CON-ordem-correcao` item 1)*
- [ ] **CONS-02**: Achado #2 resolvido no snapshot — `kpis.period.previous_available` e `timeseries.meta.previous_available` tornam a cobertura explícita, e **período anterior sem cobertura não gera percentual de crescimento** em nenhum bloco. *(origem: `CON-cobertura-historica`; `CON-criterios-teste` critério 3)*
- [ ] **CONS-03**: Achado #5 resolvido — o limite superior de horário é o mesmo em todos os blocos (**nenhum evento futuro entra em qualquer bloco do período parcial**) e **todos os canais são retornados**, somando o total mesmo com `limit=1` para as listas de campanhas. *(origem: `CON-cutoff-limite-canais`; critérios 4 e 5)*
- [ ] **CONS-04**: Achado #6 resolvido — o snapshot exige blocos e contagens inteiras não negativas, **ausência deixa de passar como zero** (`bloco ausente ≠ zero contatos`), e a integridade compara os totais declarados contra as somas de canais e da evolução diária. Campanhas limitadas são identificadas como **amostra**, não obrigadas a somar o total. *(origem: `CON-integridade-snapshot`; critério 6)*
- [ ] **CONS-05**: Com a Edge Function revisada em operação, uma **conta autorizada** entra, troca período e atribuição, abre uma origem e obtém dados; uma **conta não autorizada** e uma **sessão inválida** não obtêm nenhum dado. Verificado na cópia de teste e repetido em produção. *(origem: `CON-criterios-teste` critério 9; README passo 7)*
- [ ] **CONS-06**: A sequência foi repetida no projeto de produção com exportação fresca para reversão, e a reversão (`02-rollback.sql` + `edge-original.ts`) foi exercitada ao menos uma vez na cópia de teste antes da promoção. *(origem: `supabase/consistency-v1/README.md` passo 8 e seção "Reversão")*
- [ ] **CONS-07**: A Edge Function fica legível e à prova de configuração ausente: a verificação de integridade de `supabase/functions/dashboard-whatsapp/index.ts:590` é reescrita em condições booleanas nomeadas, e `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` passam a ser validadas explicitamente com erro descritivo em vez de asserção não nula. *(origem: `.planning/codebase/CONCERNS.md` — "Fragile Areas" e "Security Considerations"; `CON-edge-function-validacao`)*

### DESC — Descoberta com acesso autenticado (Variante C)

**Trabalho de descoberta, não de implementação.** Nenhuma fase posterior pode assumir uma definição de contato antes desta concluir.

- [ ] **DESC-01**: Existe um documento que lista **explicitamente quais eventos representam contato**, incluindo os outros botões do painel e não apenas WhatsApp, com a condição expressa em termos dos campos reais da tabela. *(origem: `REQ-indicador-principal-definicao`, `CON-clique-valido`, resolução Variante C em `.planning/INGEST-CONFLICTS.md`)*
- [ ] **DESC-02**: Essa condição foi **validada contra dados reais no Supabase**: quantos eventos têm `whatsapp_clicked` nulo ou falso, quais valores de botão existem de fato, e se há constraint na tabela base — registrado com números, não com suposições. *(origem: `CON-clique-valido`; limite de evidência do SPEC: o CSV histórico não comprova a situação atual)*
- [ ] **DESC-03**: O **comportamento pretendido da deduplicação** está definido por escrito antes de qualquer alteração: o que fazer com o limiar de três segundos, com a supressão em cadeia (0s → 2s → 4s mantém só o primeiro) e com eventos sem visitante. *(origem: `CON-deduplicacao-ordem` — proíbe mudar sem definir)*
- [ ] **DESC-04**: O **impacto quantitativo** dos achados #1, #3 e #4 foi medido no banco real: frequência de supressão de evento real por evento de teste, casos de atribuição com campos de touches diferentes, e volume de eventos sem visitante. *(origem: limite de evidência do SPEC — revisão estática, impacto não medido)*
- [ ] **DESC-05**: As regras de acesso vigentes no Supabase foram revisadas e registradas: permissões das 8 funções e 5 views, políticas RLS e constraints da tabela `whatsapp_leads`, e os caminhos de acesso ao banco — fechando o limite de evidência declarado. *(origem: `CON-permissoes-rls`; `CON-ordem-correcao` item 5, parte de revisão)*

### ATRI — Atribuição consistente por touch (achado #1)

`CON-ordem-correcao` item 2. Explicitamente **não** tocado pelo `consistency-v1`.

- [ ] **ATRI-01**: A resolução de first/last touch escolhe a fonte do **conjunto de campos por touch**, com condição baseada em `first_touch_at`/`last_touch_at`, em vez de COALESCE independente por campo. Um touch orgânico sem campanha seguido de campanha paga **não herda** a campanha posterior. *(origem: `CON-atribuicao-por-touch`; critério 1)*
- [ ] **ATRI-02**: Touch **ausente** usa fallback histórico **identificado explicitamente como fallback**; touch **capturado com campo vazio** preserva o vazio e **não** usa fallback silencioso. *(origem: `CON-atribuicao-por-touch`; critério 2)*
- [ ] **ATRI-03**: Registro legado que só tem `gclid` recebe evidência de Google Ads coerente com as regras que usam `first_gclid`/`last_gclid` e IDs de campanha, respeitando a ausência de touch capturado. *(origem: `CON-gclid-legado`)*
- [ ] **ATRI-04**: A classificação por domínio compara **hostname extraído**, não substring da URL: hostname externo contendo `adonay.cl` na query string **não vira** domínio interno; o mesmo vale para `facebook.com` e `instagram.com`. *(origem: `CON-hostname-dominios`; critério 8)*
- [ ] **ATRI-05**: A resolução de campos está padronizada entre `vw_whatsapp_leads_normalized` e `vw_whatsapp_leads_keywords_safe` (ambas respeitando presença de touch), e o **observado continua distinguível do inferido** — ausência de mídia paga reconhecida não é apresentada como prova de origem orgânica, e existe uma categoria sem identificação quando aplicável. *(origem: `CON-padronizacao-resolucao-campos`, `CON-observado-vs-inferido`, `REQ-origens-distribuicao`)*

### DEDU — Validade do evento e deduplicação (achados #3 e #4)

`CON-ordem-correcao` item 3. Depende da definição fixada em DESC-01/DESC-03.

- [ ] **DEDU-01**: A regra de contagem do indicador principal passa a usar a **condição de contato definida e validada em DESC-01/DESC-02**, substituindo `is_valid_click = NOT is_technical_duplicate`. A semântica permanece honesta: são **cliques válidos registrados**, não conversas confirmadas nem pessoas únicas. *(origem: `CON-clique-valido`, Variante C)*
- [ ] **DEDU-02**: Registros de teste são excluídos **antes** da janela de deduplicação — um evento de teste **não suprime** um evento real próximo com a mesma chave. *(origem: `CON-deduplicacao-ordem`; critério 7)*
- [ ] **DEDU-03**: A exclusão de testes usa um **marcador explícito** da ingestão quando ele existe; se a heurística de campanha contendo `teste` for mantida, isso está documentado como heurística, com a justificativa. *(origem: `CON-exclusao-testes-marcador`)*
- [ ] **DEDU-04**: Eventos **sem visitante** são tratados conforme o comportamento definido em DESC-03, e **visitantes desconhecidos não são agrupados como uma única pessoa**. *(origem: `CON-deduplicacao-ordem`)*
- [ ] **DEDU-05**: O limiar de três segundos e a semântica de supressão em cadeia foram alterados **somente** conforme DESC-03, ou foram preservados intactos — em qualquer caso, com o comportamento efetivo documentado. Identificador único do evento na ingestão é priorizado quando disponível. *(origem: `CON-deduplicacao-ordem`)*

### REC — Reconciliação e documentação das definições

`CON-ordem-correcao` item 4. Cobre todos os seis achados, não apenas os corrigidos na fase anterior.

- [ ] **REC-01**: Conferência antes/depois feita em **período fechado e em período parcial**, cobrindo total, canais, campanhas, duplicidades e cobertura; para períodos em andamento, novos eventos entre as consultas são considerados e nem toda diferença é interpretada como regressão. *(origem: `REQ-reconciliacao-totais`, `CON-ordem-correcao` item 4)*
- [ ] **REC-02**: Os **9 critérios de teste** da auditoria passam como suíte reproduzível, construída sobre o harness PGlite de `tests/consistency-sql.mjs` e o harness `node:vm` de `tests/consistency-edge.test.mjs`. *(origem: `CON-criterios-teste`)*
- [ ] **REC-03**: As definições de **clique válido, duplicidade, atribuição e comparação entre períodos, incluindo o fuso horário**, estão publicadas, e cada definição publicada corresponde à regra **efetivamente executada** na camada de dados. *(origem: `REQ-documentar-definicoes`)*
- [ ] **REC-04**: As definições dos indicadores estão em documento **separado das decisões visuais** — mudar o rótulo não exige mudar a definição e vice-versa. *(origem: `REQ-documentar-definicoes`)*
- [ ] **REC-05**: As somas conferem com o total: distribuição por canal e evolução diária usam o mesmo período, modelo de atribuição e regra de contagem do indicador principal, e somam o total. O total de linhas da fonte **não** é comparado diretamente com cliques válidos sem considerar a deduplicação e os filtros da função. *(origem: `REQ-evolucao-contatos`, `REQ-visao-geral-contatos-origens`, `REQ-reconciliacao-totais`)*

### VIS — Clareza e visualização

Vem depois dos achados porque renomear uma métrica exige saber o que ela mede. Palavras do usuário: "melhorar a visualização dos usuarios e deixar as informações mais claras".

- [ ] **VIS-01**: O **rótulo e a explicação** do indicador principal são decididos agora que a regra de contagem está fixada, e aplicados como **um único renome consistente** nos seis pontos onde `Contactos` aparece hoje (`src/components/dashboard/Overview.tsx:28`, `src/pages/Dashboard.tsx:180`, e os cabeçalhos de coluna em `CampaignsTable.tsx:80`, `GoogleKeywordsTable.tsx:39`, `MetaPlacementsTable.tsx:37`, `LandingPagesTable.tsx:49`), acompanhado de uma explicação curta. O indicador **não** é apresentado como pessoas únicas ou conversas confirmadas. *(origem: `REQ-indicador-principal-definicao`)*
- [ ] **VIS-02**: A visão geral destaca **quantidade de contatos e origens** (prioridade confirmada), com participação percentual por canal, gráfico por origem, evolução ao longo do período e origens clicáveis abrindo o detalhe do canal — e o que **já está implementado foi verificado** contra a hierarquia proposta do PRD, que permanece proposta. Não é um redesenho. A seleção de origem pode ser removida e reinicia ao mudar período ou atribuição; campanhas são identificadas como lista possivelmente limitada. *(origem: `REQ-visao-geral-contatos-origens`, `REQ-origens-distribuicao`, `REQ-evolucao-contatos`, `REQ-origens-clicaveis`)*
- [ ] **VIS-03**: As comparações e a qualidade dos dados são exibidas com honestidade: comparação ao período anterior **só quando há cobertura histórica confirmada**, "comparação indisponível" caso contrário, base anterior zero **sem percentual inventado**, período anterior exibido claramente como o intervalo imediatamente anterior de **igual número de dias**, cobertura parcial de campos de visitante/atribuição **não tratada como zero nem como identificação completa**, e discrepâncias detectadas **exibidas sem corrigir ou ocultar** os valores recebidos. *(origem: `REQ-comparacao-periodo-anterior`, `REQ-area-qualidade-dados`, `CON-periodo-anterior`)*
- [ ] **VIS-04**: As áreas de **campanhas** e de **páginas e contatos** foram verificadas contra o que está implementado e confirmadas com o usuário; a pendência "páginas por canal" está registrada na interface como limite do contrato atual, não como dado faltando. *(origem: `REQ-area-campanhas`, `REQ-area-paginas-contatos` — ambos PROPOSTOS, não escopo fixo)*
- [ ] **VIS-05**: A estrutura de navegação (menu lateral no computador, navegação adaptada ao celular) e o cabeçalho com **período e atribuição sempre visíveis** foram confirmados; os filtros existentes são preservados, datas personalizadas funcionam, datas são validadas, e a troca de período **não apresenta resultados antigos sob filtros novos**. *(origem: `REQ-estrutura-navegacao`, `REQ-filtro-periodo` — PROPOSTOS)*
- [ ] **VIS-06**: `src/pages/Dashboard.tsx` deixa de ser um monolito de 612 linhas: `MetricCard`, `ChangeIndicator` e `DashboardSkeleton` são extraídos, o parsing de query-param e o estado de filtros vão para um hook dedicado, e a composição reusa os 11 componentes de `src/components/dashboard/` e os helpers de `src/utils/{channelInsights,formatters,channelColors}.ts`. A validação de data passa a um utilitário compartilhado no frontend, com a cópia da Edge Function marcada explicitamente como **espelho a manter em sincronia** (runtimes separados, sem bundle comum). *(origem: `.planning/codebase/CONCERNS.md` — "Monolithic Dashboard page component" e "Duplicated date-validation logic")*
- [ ] **VIS-07**: As telas funcionam em computador e celular, com verificação **reproduzível** de 320 a 1440 px comprometida no repositório — a cobertura de navegador citada no PRD não existe como suíte executável e não conta. *(origem: `REQ-layout-responsivo`; reconciliação em `.planning/intel/context.md`)*
- [ ] **VIS-08**: O **espanhol** é mantido na interface salvo decisão explícita do usuário, e a identidade visual Adonay (logo original, azul e lilás) está presente no painel e no login. *(origem: `REQ-idioma-interface` (A VALIDAR), `REQ-identidade-visual-adonay`)*

### PUB — Publicar a dash

Última. Publicar um número errado é pior do que não publicar.

- [ ] **PUB-01**: A decisão de hospedagem está registrada, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão configurados no ambiente de build, e `npm run build` (`tsc -b && vite build`) passa gerando o bundle estático. *(origem: `.planning/codebase/STACK.md`; decisão de hospedagem pendente)*
- [ ] **PUB-02**: O **gate de publicação** foi cumprido e registrado: o acesso e os resultados reais foram validados **antes** da publicação, com uma conta real, conferindo retorno remoto, totais e permissões. Testes simulados não contam como prova. *(origem: `CON-ordem-correcao` item 5, `REQ-validacao-acesso-servidor`)*
- [ ] **PUB-03**: As origens CORS do ambiente efetivamente publicado estão alinhadas com a allowlist da Edge Function (hoje ela já contém `dahsadonay.vercel.app`, `adonay.cl` e `www.adonay.cl` embora nada tenha sido publicado), e `DASHBOARD_ALLOWED_EMAILS` contém a conta da Adonay — com o aviso registrado de que **lista vazia bloqueia todas as consultas**. *(origem: `.planning/codebase/STACK.md`, `CON-permissoes-rls`)*
- [ ] **PUB-04**: No ambiente publicado, **a Adonay entra com a própria conta, consulta os resultados e usa os filtros**, com estados vazios e uso no celular testados. *(origem: `REQ-conclusao-primeira-versao` condição 1, `REQ-reconciliacao-totais`)*
- [ ] **PUB-05**: As **quatro condições de conclusão da v1** foram verificadas e registradas por escrito: (1) a Adonay entra, consulta resultados e usa filtros; (2) os indicadores estão reconciliados; (3) o acesso está validado no servidor; (4) as telas funcionam em computador e celular. *(origem: `REQ-conclusao-primeira-versao`)*

---

## Requisitos da v2

Reconhecidos e diferidos. Não estão no roadmap atual.

### Expansões declaradas no PRD ("Expansões futuras — após validação")

- **FUT-01**: Vários clientes e gestão centralizada de seus acessos.
- **FUT-02**: Identidade visual configurável por empresa.
- **FUT-03**: Integração com gastos de mídia e resultados comerciais.
- **FUT-04**: Relatórios e exportações, se houver necessidade confirmada.

### Endurecimento técnico observado no código (fora dos dois documentos)

- **FUT-05**: Allowlist de acesso em tabela Supabase com RLS e trilha de auditoria, substituindo `DASHBOARD_ALLOWED_EMAILS` — hoje conceder/revogar acesso exige redeploy de secret e não há registro de quem recebeu acesso.
- **FUT-06**: Rate limiting no servidor da Edge Function (hoje só há debounce no cliente, que limita apenas clientes bem-comportados).
- **FUT-07**: Backoff exponencial no polling de `useDashboard.ts` após erros consecutivos.
- **FUT-08**: Suíte E2E de navegador (Playwright/Cypress) comprometida no repositório.

---

## Fora de escopo

Explicitamente excluído, com o motivo, para prevenir reentrada.

| Item | Motivo |
|------|--------|
| Multi-cliente / multi-tenant na v1 | `DEC-cliente-unico-adonay` + `DEC-aperfeicoar-antes-de-expandir`: aperfeiçoar com uso real primeiro |
| Investimento, custo por lead, retorno | Não derivam dos dados atuais; exigem fontes adicionais inexistentes no conjunto |
| Substituir a camada de ingestão (UTM / Tag Manager) | `DEC-reuso-utm-tagmanager-supabase`: aproveitar o rastreamento existente |
| Unificar convenções de estilo entre `src/` e `supabase/functions/` | Duas áreas com convenções distintas por desenho; o lint deve acomodar, não forçar |
| Alterar o limiar de 3s ou a supressão em cadeia sem definição prévia | Proibido por `CON-deduplicacao-ordem` |
| Restringir automaticamente todos os contatos a WhatsApp | Proibido por `CON-clique-valido`: o painel tem outros botões e a semântica do campo precisa ser preservada |
| Nomear o indicador principal antes de fixar a regra de contagem | É o erro que o SPEC já aponta; o rótulo fica em aberto até a Fase 7 |
| `@electric-sql/pglite` em `dependencies` | Dependência exclusiva de teste, deliberadamente fora da produção |
| Executar `baseline-functions.sql` como migração | É referência exportada e entrada dos testes |
| Tratar a cobertura de navegador citada no PRD como feita | Não existe como suíte executável no repositório |

---

## Rastreabilidade

Cada requisito da v1 mapeia para **exatamente uma** fase.

| Requisito | Fase | Status |
|-----------|------|--------|
| QUAL-01 | Fase 1 | Completo |
| QUAL-02 | Fase 1 | Completo |
| QUAL-03 | Fase 1 | Completo |
| QUAL-04 | Fase 1 | Completo |
| QUAL-05 | Fase 1 | Completo |
| QUAL-06 | Fase 1 | Completo |
| CONS-01 | Fase 2 | Pendente |
| CONS-02 | Fase 2 | Pendente |
| CONS-03 | Fase 2 | Pendente |
| CONS-04 | Fase 2 | Pendente |
| CONS-05 | Fase 2 | Pendente |
| CONS-06 | Fase 2 | Pendente |
| CONS-07 | Fase 2 | Pendente |
| DESC-01 | Fase 3 | Pendente |
| DESC-02 | Fase 3 | Pendente |
| DESC-03 | Fase 3 | Pendente |
| DESC-04 | Fase 3 | Pendente |
| DESC-05 | Fase 3 | Pendente |
| ATRI-01 | Fase 4 | Pendente |
| ATRI-02 | Fase 4 | Pendente |
| ATRI-03 | Fase 4 | Pendente |
| ATRI-04 | Fase 4 | Pendente |
| ATRI-05 | Fase 4 | Pendente |
| DEDU-01 | Fase 5 | Pendente |
| DEDU-02 | Fase 5 | Pendente |
| DEDU-03 | Fase 5 | Pendente |
| DEDU-04 | Fase 5 | Pendente |
| DEDU-05 | Fase 5 | Pendente |
| REC-01 | Fase 6 | Pendente |
| REC-02 | Fase 6 | Pendente |
| REC-03 | Fase 6 | Pendente |
| REC-04 | Fase 6 | Pendente |
| REC-05 | Fase 6 | Pendente |
| VIS-01 | Fase 7 | Pendente |
| VIS-02 | Fase 7 | Pendente |
| VIS-03 | Fase 7 | Pendente |
| VIS-04 | Fase 7 | Pendente |
| VIS-05 | Fase 7 | Pendente |
| VIS-06 | Fase 7 | Pendente |
| VIS-07 | Fase 7 | Pendente |
| VIS-08 | Fase 7 | Pendente |
| PUB-01 | Fase 8 | Pendente |
| PUB-02 | Fase 8 | Pendente |
| PUB-03 | Fase 8 | Pendente |
| PUB-04 | Fase 8 | Pendente |
| PUB-05 | Fase 8 | Pendente |

**Cobertura:**
- Requisitos da v1: 46 no total
- Mapeados para fases: 46
- Não mapeados: 0 ✓
- Duplicados (em mais de uma fase): 0 ✓

**Mapeamento inverso — requisitos sintetizados da intel para fase:**

| Requisito da intel | Fase | Via |
|--------------------|------|-----|
| `REQ-indicador-principal-definicao` | Fase 3 (definição) → Fase 5 (regra) → Fase 7 (rótulo) | DESC-01/02, DEDU-01, VIS-01 |
| `REQ-visao-geral-contatos-origens` | Fase 7 | VIS-02 (somas em REC-05) |
| `REQ-filtro-periodo` | Fase 7 | VIS-05 |
| `REQ-comparacao-periodo-anterior` | Fase 2 (dado) → Fase 7 (exibição) | CONS-02, VIS-03 |
| `REQ-origens-distribuicao` | Fase 4 (regras) → Fase 7 (exibição) | ATRI-05, VIS-02 |
| `REQ-evolucao-contatos` | Fase 6 | REC-05 |
| `REQ-origens-clicaveis` | Fase 7 | VIS-02 |
| `REQ-area-campanhas` | Fase 7 | VIS-04 |
| `REQ-area-paginas-contatos` | Fase 7 | VIS-04 |
| `REQ-area-qualidade-dados` | Fase 7 | VIS-03 |
| `REQ-estrutura-navegacao` | Fase 7 | VIS-05 |
| `REQ-layout-responsivo` | Fase 7 | VIS-07 |
| `REQ-acesso-individual-cliente` | Fase 2 (critério 9) → Fase 8 (gate) | CONS-05, PUB-02/03/04 |
| `REQ-identidade-visual-adonay` | Fase 7 | VIS-08 |
| `REQ-reuso-rastreamento-existente` | Fase 2 + Fase 7 | CONS-01..07, VIS-02 |
| `REQ-idioma-interface` | Fase 7 | VIS-08 |
| `REQ-documentar-definicoes` | Fase 6 | REC-03, REC-04 |
| `REQ-reconciliacao-totais` | Fase 6 | REC-01, REC-02, REC-05 |
| `REQ-validacao-acesso-servidor` | Fase 3 (revisão) → Fase 8 (validação) | DESC-05, PUB-02 |
| `REQ-conclusao-primeira-versao` | Fase 8 | PUB-04, PUB-05 |

---
*Requisitos definidos: 2026-10-06*
*Última atualização: 2026-10-06, após a definição inicial a partir da intel ingerida*
