# Roadmap: Dashboard Adonay

> **Nota de formato:** os rótulos estruturais (`### Phase N:`, `**Goal**`, `**Depends on**`, `**Requirements**`, `**Success Criteria**`, `**Plans**`, `**UI hint**`) permanecem em inglês porque são lidos pelas ferramentas GSD downstream (`/gsd-plan-phase`, `/gsd-progress`). Todo o conteúdo está em português do Brasil.

## Visão geral

O projeto não começa do zero: existe uma SPA funcional que já lê dados reais do Supabase e um pacote de correção SQL preparado e **nunca aplicado**. O que não existe é confiança no número que a dash mostra. A auditoria `AUDITORIA-DADOS.md` levantou seis achados por **revisão estática** — três deles já corrigidos no pacote `consistency-v1` (#2 cobertura histórica, #5 cutoff e limite de canais, #6 integridade) e três ainda abertos sem nenhuma mitigação (#1 atribuição por touch, #3 clique válido, #4 ordem da deduplicação). O impacto quantitativo de todos eles **não foi medido no banco atual**.

A jornada, portanto, é: primeiro construir a rede de proteção que não depende do Supabase (Fase 1); depois aplicar o pacote que já está pronto, na cópia de teste e só então em produção (Fase 2); depois **descobrir**, com acesso autenticado e números reais, o que conta como contato e como a deduplicação deve se comportar (Fase 3); com isso fixado, corrigir a atribuição (Fase 4) e a validade do evento mais a deduplicação (Fases 5); reconciliar e publicar as definições (Fase 6); só então mexer na interface, incluindo dar nome ao indicador (Fase 7); e por último publicar (Fase 8).

**Por que esta ordem.** As cinco frentes aprovadas pelo usuário (F1 infra → F2 consistency-v1 → F3 achados abertos → F4 interface → F5 publicação) formam a espinha dorsal e **não foram reordenadas**. Três razões sustentam a ordem: a F1 não depende do Supabase e protege todo o resto; renomear uma métrica exige saber o que ela mede, logo a interface vem depois dos dados; e publicar um número errado é pior do que não publicar.

**Por que oito fases para cinco frentes.** A F3 foi subdividida em quatro fases porque é a frente mais profunda e porque o próprio SPEC impõe sub-passos ordenados em `CON-ordem-correcao`: a descoberta da definição de contato (resolução Variante C) é trabalho de descoberta com acesso autenticado, não de implementação, e ganha fase própria; o item 2 do SPEC (atribuição) e o item 3 (validade do evento e deduplicação) são passos distintos com critérios de teste distintos; e o item 4 (conferência antes/depois mais documentação das definições) cobre os seis achados, não apenas os dois últimos corrigidos. Manter esses passos separados é o que permite verificar cada um de forma independente. As frentes F1, F2, F4 e F5 ficaram com uma fase cada.

**Regra que atravessa o roadmap inteiro:** nenhuma fase nomeia o indicador principal antes de a Fase 5 fixar a regra de contagem. O rótulo hoje chamado `Contactos` fica deliberadamente em aberto e é decidido na Fase 7. Nomear a métrica antes de definir o que ela mede é exatamente o erro que o SPEC aponta.

## Phases

**Numeração de fases:**
- Fases inteiras (1, 2, 3): trabalho planejado do marco
- Fases decimais (2.1, 2.2): inserções urgentes (marcadas com INSERTED)

Fases decimais aparecem entre as inteiras vizinhas, em ordem numérica.

- [ ] **Phase 1: Infra de qualidade do repositório** - Rede de proteção sem dependência do Supabase: `npm test`, lint por área, CI, documentação e cobertura dos pontos stateful
- [ ] **Phase 2: Aplicar o pacote consistency-v1** - Os achados #2, #5 e #6 saem do papel seguindo os 8 passos do README: cópia de teste primeiro, produção depois
- [ ] **Phase 3: Descoberta — o que conta como contato** - Com acesso autenticado e números reais: definir o conjunto de eventos de contato, o comportamento pretendido da deduplicação e o impacto real dos achados abertos
- [ ] **Phase 4: Atribuição consistente por touch** - Achado #1: cada touch resolve seu próprio conjunto de campos, fallback identificado, hostname extraído em vez de substring
- [ ] **Phase 5: Validade do evento e deduplicação** - Achados #3 e #4: a regra de contagem passa a usar a definição validada, e testes saem antes da janela de deduplicação
- [ ] **Phase 6: Reconciliação e documentação das definições** - Conferência antes/depois em período fechado e parcial, os 9 critérios como suíte reproduzível, definições publicadas
- [ ] **Phase 7: Clareza e visualização** - Agora que se sabe o que o número mede: dar-lhe nome e explicação, deixar as comparações honestas e desmontar o monolito de 612 linhas
- [ ] **Phase 8: Publicar a dash** - Hospedagem, variáveis de ambiente, gate de publicação cumprido e as quatro condições de conclusão da v1 verificadas

## Phase Details

### Phase 1: Infra de qualidade do repositório

**Goal**: Qualquer mudança feita nas fases seguintes é verificada automaticamente, e qualquer pessoa que abra o repositório descobre como rodar, testar e aplicar o pacote de consistência sem precisar de contexto oral.
**Depends on**: Nada (primeira fase; nenhuma dependência de Supabase, por isso vem antes de tudo)
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06
**Success Criteria** (o que deve ser VERDADE):
  1. `npm test` roda, em um comando, as suítes que hoje só existem soltas em `tests/` — `node --test tests/*.test.mjs` e `node tests/consistency-sql.mjs`, conforme QUAL-01 — e falha quando alguma delas quebra.
     *Correção 2026-10-06:* este critério dizia "as quatro suítes", contando os quatro arquivos de `tests/`. A pesquisa da fase verificou que `tests/build-consistency-package.py` **não é suíte de teste**: é um gerador de código que exige como argumento o caminho de um CSV que não existe no repositório, não tem asserções próprias, e o Python não está instalado nesta máquina. Rodá-lo sem supervisão em CI quebraria por definição. Fica documentado como ferramenta manual, fora do `npm test` — que é exatamente o que QUAL-01 pede ao nomear apenas os dois comandos.
  2. O lint roda sobre `src/` e sobre `supabase/functions/` sem reescrever nenhuma das duas áreas no estilo da outra (frontend sem ponto-e-vírgula e aspas simples; Edge Function Deno com ponto-e-vírgula e aspas duplas).
  3. Um push ao repositório dispara CI que executa `tsc -b`, lint e os testes, e o resultado é visível.
  4. `README.md` e `CLAUDE.md` existem e respondem, sem leitura de código: como rodar, como testar, as convenções por área, e qual é o runbook do pacote de consistência — incluindo o aviso de que `baseline-functions.sql` não é migração.
  5. `useDashboard.ts` e `AuthContext.tsx` têm teste automatizado: restauração de sessão, troca de filtros, refresh em segundo plano e estado offline passam a ser verificáveis sem abrir o navegador.
  6. `@electric-sql/pglite@0.3.14` é dependência exclusiva de teste e não aparece em `dependencies`.
**Plans**: 4 plans
Plans:
- [x] 01-01-PLAN.md — Scripts `test`/`lint`, todas as devDependencies e `eslint.config.js` de dois blocos (QUAL-01, QUAL-02, QUAL-03)
- [x] 01-02-PLAN.md — Testes automatizados de `useDashboard.ts` e `AuthContext.tsx` (QUAL-06)
- [ ] 01-03-PLAN.md — Pipeline de CI no GitHub Actions (QUAL-04)
- [ ] 01-04-PLAN.md — `README.md` e `CLAUDE.md` (QUAL-05)

### Phase 2: Aplicar o pacote consistency-v1

**Goal**: Os três achados já corrigidos no pacote (#2 cobertura histórica, #5 cutoff e limite de canais, #6 integridade) passam a valer de fato no banco que alimenta a dash, com reversão testada e sem nenhuma improvisação na sequência.
**Depends on**: Phase 1 (a CI e o `npm test` são a prova antes/depois da troca da Edge Function)
**Requirements**: CONS-01, CONS-02, CONS-03, CONS-04, CONS-05, CONS-06, CONS-07
**Success Criteria** (o que deve ser VERDADE):
  1. Em um período fechado, os contatos são **idênticos** antes e depois da aplicação; listas de canais podem aumentar, porque estavam truncadas.
  2. Com `limit=1`, todos os canais continuam sendo retornados e a soma deles coincide com o total exibido — o limite passa a valer só para as listas detalhadas.
  3. Um período sem cobertura anterior mostra `previous_available=false` e percentuais nulos, em vez de inventar crescimento; nenhum evento com timestamp futuro entra em qualquer bloco do período parcial.
  4. Um snapshot com bloco ou contagem ausente passa a **falhar**, em vez de ser aprovado como zero; `core_totals_match` é verdadeiro quando — e só quando — os totais declarados batem com as somas de canais e da evolução diária.
  5. Uma conta autorizada entra, troca período e atribuição, abre uma origem e vê dados; uma conta não autorizada e uma sessão inválida não obtêm nada — verificado na cópia de teste e repetido em produção.
  6. A reversão foi exercitada ao menos uma vez na cópia de teste, e existe exportação fresca das duas funções e da Edge Function de produção guardada antes da promoção.
  7. A verificação de integridade da Edge Function é legível (condições booleanas nomeadas, não um `if` de ~12 condições em uma linha) e as três variáveis de ambiente obrigatórias falham com erro descritivo em vez de asserção não nula.
**Plans**: TBD

### Phase 3: Descoberta — o que conta como contato

**Goal**: Existe uma definição escrita e **validada contra dados reais** de quais eventos representam contato e de como a deduplicação deve se comportar — de modo que nenhuma fase seguinte precise adivinhar.
**Depends on**: Phase 2 (a cópia de teste e a Edge Function revisada já estão de pé, e a conta autorizada já foi provada no passo 7 do README)
**Requirements**: DESC-01, DESC-02, DESC-03, DESC-04, DESC-05
**Success Criteria** (o que deve ser VERDADE):
  1. Existe um documento que lista explicitamente quais eventos contam como contato, expresso nos campos reais da tabela, **incluindo os outros botões do painel** e não apenas WhatsApp.
  2. Essa condição vem acompanhada de números do banco real: quantos eventos têm `whatsapp_clicked` nulo ou falso, quais valores de botão existem de fato, e se há constraint na tabela base — não de suposições.
  3. O comportamento pretendido da deduplicação está decidido por escrito **antes** de qualquer alteração: o que fazer com o limiar de três segundos, com a supressão em cadeia (0s → 2s → 4s mantém só o primeiro) e com eventos sem visitante.
  4. O impacto dos achados #1, #3 e #4 está medido no banco real — frequência de evento de teste suprimindo evento real, casos de atribuição com campos de touches diferentes, volume de eventos sem visitante — convertendo três riscos estáticos em três números.
  5. As permissões das 8 funções e 5 views, as políticas RLS e as constraints de `whatsapp_leads` estão revisadas e registradas, fechando o limite de evidência que a auditoria declarou em aberto.

**Notas de execução**: esta é a fase de **descoberta** correspondente à resolução Variante C registrada em `.planning/INGEST-CONFLICTS.md`. Ela não altera nenhuma view nem nenhuma função — produz definição, medição e registro. Nenhuma fase posterior pode assumir uma definição de contato antes desta concluir, e nenhum rótulo de interface é decidido aqui.
**Plans**: TBD

### Phase 4: Atribuição consistente por touch

**Goal**: A origem atribuída a um contato reflete o que foi observado naquele touch — e, quando não houve observação, isso aparece identificado como fallback em vez de se passar por histórico completo.
**Depends on**: Phase 3 (o impacto medido em DESC-04 calibra o que precisa mudar; a revisão de permissões em DESC-05 habilita alterar as views)
**Requirements**: ATRI-01, ATRI-02, ATRI-03, ATRI-04, ATRI-05
**Success Criteria** (o que deve ser VERDADE):
  1. Um primeiro contato orgânico sem campanha, seguido depois por uma campanha paga, **não** aparece classificado como Meta Ads nem herda a campanha posterior (critério de teste 1).
  2. Um touch ausente usa fallback histórico e o fallback está **identificado como tal**; um touch capturado com campo vazio preserva o vazio e não recebe fallback silencioso (critério de teste 2).
  3. Um hostname externo que contém `adonay.cl` na query string **não** é classificado como domínio interno; o mesmo vale para `facebook.com` e `instagram.com` (critério de teste 8).
  4. Um registro legado que só tem `gclid` recebe evidência de Google Ads coerente com as regras que usam `first_gclid`/`last_gclid`, respeitando a ausência de touch capturado.
  5. Uma origem sem mídia paga reconhecida não é apresentada como prova de tráfego orgânico — existe categoria sem identificação quando aplicável, e `normalized` e `keywords_safe` resolvem campos pelo mesmo critério de presença de touch.

**Notas de execução**: `CON-ordem-correcao` item 1 exige **preservar as regras de atribuição enquanto sua substituição é testada** — por isso a Fase 2 veio antes. As views afetadas (`vw_whatsapp_leads_normalized`, `vw_whatsapp_leads_dashboard`) **não estão no repositório**: toda mudança passa pela cópia de teste primeiro, na mesma disciplina de `supabase/consistency-v1/README.md`, com os critérios reproduzidos no harness PGlite de `tests/consistency-sql.mjs`.
**Plans**: TBD

### Phase 5: Validade do evento e deduplicação

**Goal**: O que entra na contagem é o que a Fase 3 definiu como contato, e a deduplicação deixa de poder apagar um contato real por causa de um evento de teste.
**Depends on**: Phase 4 (SPEC item 3 vem depois do item 2) e Phase 3 (DESC-01 fornece a condição de contato; DESC-03 fornece o comportamento pretendido da deduplicação)
**Requirements**: DEDU-01, DEDU-02, DEDU-03, DEDU-04, DEDU-05
**Success Criteria** (o que deve ser VERDADE):
  1. A contagem do indicador principal usa a condição de contato definida e validada na Fase 3, e não mais apenas `NOT is_technical_duplicate` — um evento falso ou nulo que não foi marcado como duplicado deixa de ser contado.
  2. Um evento de teste imediatamente anterior a um evento real com a mesma chave **não** suprime o evento real (critério de teste 7): a exclusão de testes acontece **antes** da janela de deduplicação.
  3. Eventos sem visitante se comportam conforme o definido em DESC-03, e visitantes desconhecidos **não** são agrupados como uma única pessoa.
  4. O limiar de três segundos e a supressão em cadeia estão exatamente como DESC-03 definiu — alterados conforme a definição ou preservados intactos —, e o comportamento efetivo está escrito, não inferido.
  5. A exclusão de testes usa marcador explícito da ingestão onde ele existe; se a heurística de campanha contendo `teste` permanecer, ela está documentada como heurística com a justificativa.

**Notas de execução**: nenhum rótulo de interface é decidido aqui. Esta fase fixa a **regra**; o nome visível é tratado na Fase 7.
**Plans**: TBD

### Phase 6: Reconciliação e documentação das definições

**Goal**: Os números da dash conferem com os dados de origem no mesmo período, e cada definição publicada corresponde à regra que a camada de dados realmente executa.
**Depends on**: Phase 5 (e, por tabela, as Fases 2 e 4 — a conferência cobre os seis achados, não apenas os dois últimos)
**Requirements**: REC-01, REC-02, REC-03, REC-04, REC-05
**Success Criteria** (o que deve ser VERDADE):
  1. Existe uma conferência antes/depois registrada em **período fechado e em período parcial**, cobrindo total, canais, campanhas, duplicidades e cobertura — com os novos eventos do período em andamento considerados, em vez de toda diferença ser lida como regressão.
  2. Os **9 critérios de teste** da auditoria rodam como suíte reproduzível (`npm test`) e passam, construídos sobre os harnesses PGlite e `node:vm` que já existem.
  3. A distribuição por canal e a evolução diária usam o mesmo período, modelo de atribuição e regra de contagem do total, e somam o total.
  4. As definições de clique válido, duplicidade, atribuição e comparação entre períodos — incluindo o fuso horário — estão publicadas, e quem ler a definição e depois o SQL encontra a mesma regra.
  5. Essas definições estão em documento separado das decisões visuais: mudar o rótulo não exige mudar a definição, e vice-versa.
**Plans**: TBD

### Phase 7: Clareza e visualização

**Goal**: A Adonay olha a tela e entende o que cada número significa — o indicador principal tem nome e explicação coerentes com a regra fixada, as comparações dizem quando não sabem, e o código por trás deixa de ser um arquivo de 612 linhas.
**Depends on**: Phase 6 (renomear uma métrica exige saber o que ela mede e ter os números reconciliados)
**Requirements**: VIS-01, VIS-02, VIS-03, VIS-04, VIS-05, VIS-06, VIS-07, VIS-08
**Success Criteria** (o que deve ser VERDADE):
  1. O indicador principal tem um rótulo decidido **nesta fase** e uma explicação curta, aplicados consistentemente nos seis pontos onde `Contactos` aparece hoje (`Overview.tsx:28`, `Dashboard.tsx:180`, e os cabeçalhos de coluna em `CampaignsTable.tsx:80`, `GoogleKeywordsTable.tsx:39`, `MetaPlacementsTable.tsx:37`, `LandingPagesTable.tsx:49`) — um renome, não seis edições — e em nenhum lugar ele é apresentado como pessoas únicas ou conversas confirmadas.
  2. A visão geral destaca quantidade de contatos e origens, com participação por canal, evolução no período e origens clicáveis que abrem o detalhe do canal; a seleção pode ser removida e reinicia ao mudar período ou atribuição; campanhas aparecem identificadas como lista possivelmente limitada.
  3. Quando não há cobertura histórica, a tela diz "comparação indisponível" em vez de mostrar um percentual; base anterior zero não produz percentual; o período anterior é exibido como o intervalo imediatamente anterior de igual número de dias.
  4. Discrepâncias de dados continuam visíveis e explicadas, sem corrigir nem ocultar os valores recebidos; a pendência "páginas por canal" aparece como limite do contrato atual, não como dado faltando.
  5. O cabeçalho mantém período e atribuição sempre visíveis, datas personalizadas funcionam, e trocar de período **não** mostra resultados antigos sob filtros novos.
  6. `src/pages/Dashboard.tsx` deixa de concentrar layout, filtros e composição: `MetricCard`, `ChangeIndicator` e `DashboardSkeleton` existem como arquivos próprios, o parsing de query-param e o estado de filtros vivem em um hook, a composição reusa os 11 componentes de `src/components/dashboard/` e os helpers de `src/utils/`, e a validação de data existe uma vez no frontend — com a cópia da Edge Function marcada como espelho a manter em sincronia.
  7. Existe verificação **reproduzível no repositório** de que as telas funcionam de 320 a 1440 px (a cobertura de navegador citada no PRD não existe como suíte e não conta).
  8. A interface segue em espanhol e a identidade Adonay (logo original, azul e lilás) está no painel e no login.

**Notas de execução**: a hierarquia da visão geral do `PLANEJAMENTO-GTD.md` é **proposta** — apenas a prioridade de conteúdo (contatos e origens) está confirmada. O trabalho aqui é **verificar o que já está implementado contra a proposta e confirmar com o usuário**, não redesenhar. O mesmo vale para as áreas de campanhas, páginas/contatos, qualidade dos dados e navegação, todas com status PROPOSTO na intel.
**Plans**: TBD
**UI hint**: yes

### Phase 8: Publicar a dash

**Goal**: A Adonay acessa a dash em um endereço publicado, entra com a própria conta, consulta os resultados e usa os filtros — e as quatro condições de conclusão da v1 estão verificadas por escrito.
**Depends on**: Phase 7 (e o gate de `CON-ordem-correcao` item 5: publicação somente após validar o acesso e os resultados reais)
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, PUB-05
**Success Criteria** (o que deve ser VERDADE):
  1. A dash está acessível em um endereço publicado — não mais apenas em `127.0.0.1:5173` — com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configurados no ambiente de build e `npm run build` passando.
  2. A Adonay entra com a própria conta no ambiente publicado, consulta os resultados, usa os filtros, e os estados vazios e o uso no celular foram testados.
  3. O gate de publicação está cumprido e registrado: acesso e resultados reais foram validados com conta real **antes** de publicar — e consta que testes simulados não servem como prova.
  4. As origens CORS do ambiente efetivamente publicado estão na allowlist da Edge Function, e `DASHBOARD_ALLOWED_EMAILS` contém a conta da Adonay, com o aviso registrado de que lista vazia bloqueia todas as consultas.
  5. Existe um registro escrito confirmando as quatro condições da v1: a Adonay entra/consulta/filtra; os indicadores estão reconciliados; o acesso está validado no servidor; as telas funcionam em computador e celular.

**Notas de execução**: a allowlist da Edge Function já contém `dahsadonay.vercel.app`, `adonay.cl` e `www.adonay.cl` embora nada tenha sido publicado — a decisão de hospedagem deve ser tomada e registrada, não herdada de uma configuração antiga. A decisão de **quem receberá acesso** continua pendente na intel e precisa ser resolvida aqui.
**Plans**: TBD

## Progress

**Ordem de execução:**
As fases executam em ordem numérica: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infra de qualidade do repositório | 2/4 | In Progress|  |
| 2. Aplicar o pacote consistency-v1 | 0/TBD | Not started | - |
| 3. Descoberta — o que conta como contato | 0/TBD | Not started | - |
| 4. Atribuição consistente por touch | 0/TBD | Not started | - |
| 5. Validade do evento e deduplicação | 0/TBD | Not started | - |
| 6. Reconciliação e documentação das definições | 0/TBD | Not started | - |
| 7. Clareza e visualização | 0/TBD | Not started | - |
| 8. Publicar a dash | 0/TBD | Not started | - |

## Cobertura de requisitos

| Fase | Requisitos | Quantidade |
|------|------------|------------|
| 1 | QUAL-01..06 | 6 |
| 2 | CONS-01..07 | 7 |
| 3 | DESC-01..05 | 5 |
| 4 | ATRI-01..05 | 5 |
| 5 | DEDU-01..05 | 5 |
| 6 | REC-01..05 | 5 |
| 7 | VIS-01..08 | 8 |
| 8 | PUB-01..05 | 5 |

**46 de 46 requisitos da v1 mapeados. Nenhum órfão, nenhum duplicado.** Detalhamento em `.planning/REQUIREMENTS.md`.

## Mapa dos achados da auditoria para as fases

| Achado | Estado inicial | Fase que resolve |
|--------|----------------|------------------|
| #1 atribuição mistura campos de touches diferentes | ABERTO | Fase 4 (medido na Fase 3) |
| #2 comparação ignora cobertura histórica | corrigido no pacote, não aplicado | Fase 2 |
| #3 clique válido é só ausência de duplicidade | ABERTO | Fase 3 define, Fase 5 aplica |
| #4 deduplicação antes da exclusão de testes | ABERTO | Fase 3 define, Fase 5 aplica |
| #5 cutoff e limite de canais inconsistentes | corrigido no pacote, não aplicado | Fase 2 |
| #6 integridade pode aprovar dados ausentes | corrigido no pacote, não aplicado | Fase 2 |

## Mapa dos 9 critérios de teste para as fases

| Critério | Fase que o satisfaz |
|----------|---------------------|
| 1. Touch orgânico sem campanha não herda campanha posterior | Fase 4 |
| 2. Touch ausente usa fallback identificado; touch capturado vazio não usa fallback silencioso | Fase 4 |
| 3. Período anterior sem cobertura não gera percentual | Fase 2 |
| 4. Nenhum evento futuro entra em bloco de período parcial | Fase 2 |
| 5. Canais completos somam o total, mesmo com limite pequeno para campanhas | Fase 2 |
| 6. Bloco ausente não equivale a zero contatos | Fase 2 |
| 7. Evento de teste não suprime evento real próximo com a mesma chave | Fase 5 |
| 8. Hostname externo com `adonay.cl` na query string não vira domínio interno | Fase 4 |
| 9. Usuário não autorizado não consulta a Edge Function; `anon`/`authenticated` não consultam funções e views diretamente | Fase 2, reconfirmado na Fase 8 |

Os nove rodam juntos como suíte reproduzível na **Fase 6** (REC-02).

---
*Roadmap criado: 2026-10-06, a partir de `.planning/intel/` e `.planning/codebase/`*
