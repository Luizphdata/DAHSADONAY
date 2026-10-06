# Decisões sintetizadas

**Nenhum ADR foi ingerido.** O conjunto contém apenas 1 SPEC e 1 PRD, ambos com `locked: false`. Portanto **não existem decisões LOCKED** nesta ingestão, e nenhuma decisão abaixo pode ser tratada como travada no sentido GSD (reservado a ADRs Accepted).

As decisões abaixo vêm da seção "Decisões confirmadas" do PRD. O classificador resolveu explicitamente essa ambiguidade: são **decisões firmes do usuário** e devem ser extraídas como tal, apesar de `locked: false`. Trate-as como **firmes mas não travadas** — podem ser revisitadas pelo usuário, mas não devem ser contrariadas silenciosamente pelo planejamento.

---

## DEC-planejar-antes-de-implementar

- source: `PLANEJAMENTO-GTD.md` ("Decisões confirmadas")
- origem do tipo: PRD (não ADR) — status: firme, não travada
- escopo: processo de trabalho

Decisão: **planejar antes de implementar.**

---

## DEC-cliente-unico-adonay

- source: `PLANEJAMENTO-GTD.md` ("Decisões confirmadas")
- origem do tipo: PRD (não ADR) — status: firme, não travada
- escopo: tenancy, escopo de produto

Decisão: **atender somente a Adonay nesta primeira etapa.**

Consequência observada no código (`.planning/codebase/CONCERNS.md`): desenho monotenante já embutido na autorização (`DASHBOARD_ALLOWED_EMAILS`) e nas cores/marca. Multi-cliente é expansão futura, não escopo da v1.

---

## DEC-reuso-utm-tagmanager-supabase

- source: `PLANEJAMENTO-GTD.md` ("Decisões confirmadas")
- origem do tipo: PRD (não ADR) — status: firme, não travada
- escopo: arquitetura de dados e rastreamento

Decisão: **aproveitar o rastreamento existente por UTM e Tag Manager e o banco Supabase.** Não substituir a camada de ingestão nesta etapa.

---

## DEC-acesso-individual-ao-cliente

- source: `PLANEJAMENTO-GTD.md` ("Decisões confirmadas")
- origem do tipo: PRD (não ADR) — status: firme, não travada
- escopo: autenticação e autorização

Decisão: **oferecer acesso individual ao cliente** (não acesso compartilhado ou link público).

---

## DEC-prioridade-contatos-e-origens

- source: `PLANEJAMENTO-GTD.md` ("Decisões confirmadas"; "Hierarquia proposta da visão geral")
- origem do tipo: PRD (não ADR) — status: firme, não travada
- escopo: conteúdo da visão geral

Decisão: **priorizar a quantidade de contatos e suas origens na visão geral, conforme definição do usuário.**

Delimitação importante: está confirmada a **prioridade de conteúdo**, **não** a disposição visual. A "Hierarquia proposta da visão geral" é proposta para o protótipo e permanece revisável.

Ressalva governante: a **regra de contagem** desse indicador é determinada pelo SPEC (`CON-clique-valido`), não pelo PRD, e permanece aberta — ver `INGEST-CONFLICTS.md` (WARNING).

---

## DEC-identidade-visual-adonay

- source: `PLANEJAMENTO-GTD.md` ("Decisões confirmadas")
- origem do tipo: PRD (não ADR) — status: firme, não travada
- escopo: identidade visual

Decisão: **usar a identidade visual fornecida da Clínica Dental Adonay — logo original, azul e lilás.** Protótipo aprovado e integrado ao aplicativo após autorização do usuário.

---

## DEC-aperfeicoar-antes-de-expandir

- source: `PLANEJAMENTO-GTD.md` ("Decisões confirmadas")
- origem do tipo: PRD (não ADR) — status: firme, não travada
- escopo: estratégia de produto

Decisão: **aperfeiçoar a solução com o uso antes de expandir para outros clientes.**

Consequência: itens de "Expansões futuras" ficam bloqueados até validação da v1 com uso real.

---

## Decisões NÃO tomadas (registro explícito)

Para evitar que o planejamento downstream as trate como resolvidas:

- **Regra de contagem do indicador principal** — aberta; ver `REQ-indicador-principal-definicao` e o WARNING em `INGEST-CONFLICTS.md`.
- **Nome e explicação do indicador `Contactos`** — o PRD determina revisão ("Revisar o nome e a explicação para refletir a métrica"); o nome final não foi decidido.
- **Organização de telas da primeira versão** — "Proposta de escopo da primeira versão" é proposta sujeita à revisão.
- **Disposição da visão geral** — "Hierarquia proposta" é proposta para o protótipo.
- **Idioma da interface** — espanhol é hipótese inicial; confirmação pendente.
- **Quem receberá acesso** — pendente ("Aguardando informação").
- **Limiar e semântica da deduplicação de três segundos** — o SPEC proíbe alterar sem antes definir o comportamento pretendido (`CON-deduplicacao-ordem`).
- **Aplicação do pacote `consistency-v1` em produção** — preparado, não aplicado (`CON-estado-consistency-v1`).
