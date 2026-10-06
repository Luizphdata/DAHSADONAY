# Dashboard Adonay

## O que é isto

Um painel web de uma página (`adonay-dashboard`, repo `Luizphdata/DAHSADONAY`) que mostra à Clínica Dental Adonay quantos contatos ela recebeu em um período e de quais origens. É uma SPA React 18 + TypeScript + Vite, cujos dados vêm exclusivamente da Edge Function Supabase `dashboard-whatsapp` (Deno) sobre views e funções Postgres. A interface é em espanhol (`es-CL`, `America/Santiago`); os documentos de planejamento são em português.

Atende **um único cliente** nesta etapa. Nunca foi publicada — só rodou em `http://127.0.0.1:5173/`.

## Valor central

A Adonay entra e consulta resultados **em que pode confiar**: o número de maior destaque tem uma regra de contagem definida, validada contra os dados reais do Supabase e explicada na própria tela.

Consequência para priorização: **publicar um número errado é pior do que não publicar**. Sempre que houver conflito entre entregar rápido e saber o que o número significa, ganha saber o que o número significa.

## Requisitos

### Validados

<!-- Entregue e confirmado valioso. -->

(Nenhum — nada foi publicado nem validado contra dados reais ainda.)

### Ativos

Escopo da v1, organizado nas cinco frentes aprovadas. Detalhamento com IDs rastreáveis em `.planning/REQUIREMENTS.md`.

- [ ] **Infra de qualidade do repositório** — `npm test` descobrível, lint/format por área, CI, README.md e CLAUDE.md, cobertura de teste para `useDashboard.ts` e `AuthContext.tsx` (QUAL-01..06)
- [ ] **Aplicar o pacote `consistency-v1`** — achados #2 (cobertura histórica), #5 (cutoff e limite de canais) e #6 (integridade), seguindo os 8 passos do README sem improvisar (CONS-01..07)
- [ ] **Descoberta com acesso autenticado** — definir e validar contra dados reais o conjunto de eventos que representam contato; definir o comportamento pretendido da deduplicação; medir o impacto real dos achados #1, #3 e #4; revisar permissões/RLS da tabela base (DESC-01..05)
- [ ] **Achados abertos da auditoria** — #1 atribuição por touch (ATRI-01..05) e #3/#4 validade do evento e deduplicação (DEDU-01..05)
- [ ] **Reconciliação e documentação das definições** — conferência antes/depois em período fechado e parcial, os 9 critérios de teste da auditoria como suíte reproduzível, definições publicadas de clique válido, duplicidade, atribuição e comparação entre períodos (REC-01..05)
- [ ] **Clareza e visualização** — rótulo e explicação do indicador principal (decididos só depois da regra de contagem), honestidade nas comparações, decomposição de `Dashboard.tsx`, responsivo 320–1440 px (VIS-01..08)
- [ ] **Publicação** — hospedagem, variáveis de ambiente, gate de publicação cumprido, as 4 condições de conclusão da v1 verificadas (PUB-01..05)

### Fora de escopo

<!-- Fronteiras explícitas, com o motivo, para impedir reentrada. -->

- **Vários clientes e gestão centralizada de acessos** — `DEC-cliente-unico-adonay` e `DEC-aperfeicoar-antes-de-expandir`: aperfeiçoar com uso real antes de expandir.
- **Identidade visual configurável por empresa** — consequência da decisão acima; a identidade Adonay é fixa na v1.
- **Investimento, custo por lead e retorno** — não derivam dos dados atuais; exigem fontes adicionais que não existem no conjunto.
- **Relatórios e exportações** — só se houver necessidade confirmada pelo uso.
- **Substituir a camada de ingestão (UTM / Tag Manager)** — `DEC-reuso-utm-tagmanager-supabase`: aproveitar o rastreamento existente.
- **Unificar as convenções de estilo entre `src/` e `supabase/functions/`** — são duas áreas com convenções distintas por desenho (frontend sem ponto-e-vírgula e aspas simples; Edge Function Deno com ponto-e-vírgula e aspas duplas). O lint deve acomodar, não forçar.
- **Alterar o limiar de três segundos ou a semântica de supressão em cadeia sem antes definir o comportamento pretendido** — proibido por `CON-deduplicacao-ordem`.
- **Nomear o indicador principal antes de fixar a regra de contagem** — é exatamente o erro que o SPEC aponta. O rótulo fica deliberadamente em aberto até a Fase 7.
- **`@electric-sql/pglite` em `dependencies`** — é dependência exclusiva de teste, deliberadamente fora das dependências de produção.
- **Testes E2E de navegador (Playwright/Cypress)** na v1 — o `PLANEJAMENTO-GTD.md` cita "testes de navegador com respostas de rede simuladas" que **não existem como suíte executável** no repositório; tratados como cobertura não reproduzível, não como trabalho feito.

## Contexto

**Como o projeto chegou aqui.** Dois documentos foram ingeridos (`.planning/intel/SYNTHESIS.md`): o SPEC `AUDITORIA-DADOS.md` (precedência 1) e o PRD `PLANEJAMENTO-GTD.md` (precedência 2). O mapa do código em `.planning/codebase/` é a verdade observada sobre a implementação atual e corrige dois pontos desatualizados do PRD.

**Arquitetura atual.** SPA cliente → Edge Function `dashboard-whatsapp` (BFF somente leitura, valida sessão + allowlist de e-mails) → RPC Postgres `dashboard_snapshot` → um único objeto JSON agregado (`DashboardSnapshot`) que alimenta todos os widgets. Pipeline de dados: `whatsapp_leads` → `vw_whatsapp_leads_normalized` → `vw_whatsapp_leads_dashboard` → `vw_whatsapp_leads_semantic` → `vw_whatsapp_leads_final` → `vw_whatsapp_leads_keywords_safe`.

**Seis achados prioritários da auditoria, com estado real:**

| Achado | Tema | Estado |
|--------|------|--------|
| #1 | Atribuição mistura campos de touches diferentes | ABERTO, sem mitigação |
| #2 | Comparação ignora cobertura histórica em alguns blocos | corrigido no pacote, **não aplicado** |
| #3 | Clique válido é apenas ausência de duplicidade | ABERTO, sem mitigação |
| #4 | Deduplicação acontece antes da exclusão de testes | ABERTO, sem mitigação |
| #5 | Cutoff e limite de canais inconsistentes | corrigido no pacote, **não aplicado** |
| #6 | Integridade pode aprovar dados ausentes | corrigido no pacote, **não aplicado** |

**Calibragem obrigatória.** A auditoria foi uma revisão **estática**. Os seis achados são riscos demonstráveis pela leitura do código; **o impacto quantitativo não foi medido no banco atual**. Nenhum plano deve tratá-los como defeitos medidos.

**Onde os achados abertos vivem.** #1, #3 e #4 estão nas views do Supabase (`vw_whatsapp_leads_normalized`, `vw_whatsapp_leads_dashboard`), que **não estão no repositório**. Qualquer correção exige acesso ao banco.

**Dívida técnica observada apenas no código** (não aparece em nenhum dos dois documentos, dobrada nas fases apropriadas):
- Validação de data duplicada entre `supabase/functions/dashboard-whatsapp/index.ts` e `src/pages/Dashboard.tsx` → Fase 7.
- `src/pages/Dashboard.tsx` com 612 linhas misturando layout, filtros e composição → Fase 7.
- Verificação de integridade da Edge Function em um único `if` de ~12 condições em uma linha (`index.ts:590`) → Fase 2.
- Variáveis de ambiente lidas com asserção não nula, sem validação de inicialização → Fase 2.
- Autorização apenas por variável de ambiente (`DASHBOARD_ALLOWED_EMAILS`); lista vazia bloqueia todas as consultas → revisão na Fase 3, verificação na Fase 8.
- Sem cobertura de teste para `useDashboard.ts` e `AuthContext.tsx`; só `src/utils/channelInsights.ts` tem teste unitário real → Fase 1.

**Acesso disponível.** O desenvolvedor tem acesso admin ao Supabase **com uma cópia de teste separada** do projeto. A sequência "cópia de teste primeiro" do `supabase/consistency-v1/README.md` é, portanto, executável como está escrita.

## Restrições

- **Camada de dados**: as views com os achados #1, #3 e #4 não estão no repositório — corrigi-las exige acesso autenticado ao Supabase, não edição de arquivo.
- **Protocolo de mudança no banco**: toda alteração segue a sequência do `supabase/consistency-v1/README.md` — exportação fresca para reversão, `03-validate.sql` antes e depois, aplicação na **cópia de teste primeiro**, verificação de `core_totals_match` e da soma dos canais, só então produção. `baseline-functions.sql` é referência exportada e entrada dos testes: **não executar como migração**.
- **Gate de publicação**: `CON-ordem-correcao` item 5 — publicação somente após validar o acesso e os resultados reais.
- **Deduplicação**: não mudar o limiar de três segundos nem a semântica de supressão em cadeia sem antes definir por escrito o comportamento pretendido.
- **Definição de contato**: não restringir automaticamente todos os contatos a WhatsApp — o painel também apresenta outros botões e a semântica do campo precisa ser preservada.
- **Stack**: React 18 + TypeScript ~5.6 + Vite 6, Tailwind 3, Recharts 2, `@supabase/supabase-js` ^2.57; Edge Function em Deno. Sem path aliases, sem barrel files, sem biblioteca de data-fetching (hook próprio em `src/hooks/useDashboard.ts`).
- **Convenções por área**: `src/` sem ponto-e-vírgula, aspas simples, 2 espaços; `supabase/functions/` com ponto-e-vírgula e aspas duplas. Identificadores em inglês; strings de interface em espanhol.
- **Testes**: runner nativo `node:test` + `node:assert/strict`, sem Jest/Vitest. SQL é testado com Postgres embarcado real (PGlite), não com mocks. A Edge Function é testada via `node:vm` com `Deno`/`createClient` falsos.
- **Idioma da interface**: espanhol mantido (hipótese inicial do PRD, pendente de confirmação) salvo decisão explícita do usuário.
- **Monotenância**: allowlist de e-mails e marca estão embutidas no desenho; multi-cliente é expansão futura.

## Decisões-chave

As sete primeiras vêm de "Decisões confirmadas" do `PLANEJAMENTO-GTD.md`. **Nenhum ADR foi ingerido**, então nenhuma delas é LOCKED no sentido GSD: são **firmes mas não travadas** — podem ser revisitadas pelo usuário, não devem ser contrariadas silenciosamente pelo planejamento.

| Decisão | Razão | Resultado |
|---------|-------|-----------|
| Planejar antes de implementar | Decisão de processo do usuário | — Pendente |
| Atender somente a Adonay nesta primeira etapa | Reduzir escopo até haver uso real | — Pendente |
| Aproveitar o rastreamento existente (UTM, Tag Manager, Supabase) | Não substituir a camada de ingestão agora | — Pendente |
| Oferecer acesso individual ao cliente (login por e-mail e senha) | Não acesso compartilhado nem link público | — Pendente |
| Priorizar quantidade de contatos e origens na visão geral | Definição do usuário; **só a prioridade de conteúdo está confirmada**, não a disposição | — Pendente |
| Usar a identidade visual Adonay (logo original, azul e lilás) | Protótipo aprovado e autorizado pelo usuário | — Pendente |
| Aperfeiçoar com o uso antes de expandir para outros clientes | Evitar generalizar sobre uma base não validada | — Pendente |
| **Variante C para a regra de contagem do indicador principal** (2026-10-06, escolha do usuário) | O SPEC declara a regra atual (`is_valid_click = NOT is_technical_duplicate`) não validada; definir e validar o conjunto de eventos de contato — incluindo os outros botões — **antes** de fixar a contagem | — Pendente (Fase 3) |
| **O rótulo visível do indicador fica em aberto até a Fase 7** | Nomear a métrica antes de definir o que ela mede é o erro já apontado pelo SPEC | — Pendente |
| **Ordem das frentes: F1 infra → F2 consistency-v1 → F3 achados abertos → F4 interface → F5 publicação** | F1 não depende do Supabase e protege tudo depois; renomear uma métrica exige saber o que ela mede; publicar número errado é pior que não publicar | — Pendente |

### Decisões explicitamente NÃO tomadas

Registradas para que o planejamento não as trate como resolvidas:

- Nome e explicação finais do indicador hoje rotulado `Contactos`.
- Organização de telas da primeira versão (proposta sujeita à revisão).
- Disposição da visão geral (proposta para o protótipo).
- Idioma da interface (espanhol é hipótese inicial) e **quem receberá acesso**.
- Limiar e semântica da deduplicação de três segundos.
- Onde hospedar a aplicação publicada.

---
*Última atualização: 2026-10-06, após a ingestão de documentos e o mapeamento do código*
