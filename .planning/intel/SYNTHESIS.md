# Síntese da ingestão de documentos

Ponto de entrada único para consumo downstream (`gsd-roadmapper`). Gerado em 2026-10-06. Modo: `new`.

Idioma da intel: português do Brasil, preservando a terminologia de domínio dos originais (atribuição, first/last touch, clique válido, deduplicação, cobertura histórica, cutoff).

---

## Documentos ingeridos (2)

- **SPEC** (1) — `AUDITORIA-DADOS.md`, "Revisão da camada de dados da Adonay", 28/09/2026. Precedência 1 (manifesto). Confiança: high. `locked: false`.
- **PRD** (1) — `PLANEJAMENTO-GTD.md`, "Modernização do dashboard Adonay", 27/09/2026 com seções de status de 28/09/2026. Precedência 2 (manifesto). Confiança: high. `locked: false`.
- **ADR** (0), **DOC** (0).

Detecção de ciclos: executada. 2 nós, 0 arestas documento-para-documento (o SPEC tem `cross_refs` vazio; as três referências do PRD apontam para artefatos de código — `supabase/consistency-v1`, `supabase/functions/dashboard-whatsapp/index.ts`, `supabase/consistency-v1/README` — não para documentos do conjunto). Profundidade máxima 1. **Sem ciclos.**

Referência externa não resolvida: o SPEC cita um "CSV histórico anteriormente analisado" sem caminho. Não ingerido, não verificável.

---

## Decisões (7 firmes, 0 LOCKED)

Arquivo: `.planning/intel/decisions.md`

**Nenhuma decisão LOCKED** — não há ADR no conjunto. As sete decisões abaixo vêm de "Decisões confirmadas" em `PLANEJAMENTO-GTD.md` e foram extraídas como **firmes mas não travadas**, conforme a resolução de ambiguidade da classificação.

- `DEC-planejar-antes-de-implementar`
- `DEC-cliente-unico-adonay`
- `DEC-reuso-utm-tagmanager-supabase`
- `DEC-acesso-individual-ao-cliente`
- `DEC-prioridade-contatos-e-origens` (prioridade de conteúdo confirmada; disposição NÃO)
- `DEC-identidade-visual-adonay`
- `DEC-aperfeicoar-antes-de-expandir`

O arquivo também contém um registro explícito de **8 decisões NÃO tomadas**, para impedir que o planejamento as trate como resolvidas.

---

## Requisitos (19 + 4 itens fora de escopo)

Arquivo: `.planning/intel/requirements.md`

Cada requisito carrega `status`: CONFIRMADO, PROPOSTO (sujeito à revisão com o usuário), A VALIDAR ou FUTURO.

CONFIRMADOS: `REQ-visao-geral-contatos-origens` (prioridade), `REQ-comparacao-periodo-anterior`, `REQ-layout-responsivo`, `REQ-acesso-individual-cliente`, `REQ-identidade-visual-adonay`, `REQ-reuso-rastreamento-existente`, `REQ-documentar-definicoes`, `REQ-reconciliacao-totais`, `REQ-validacao-acesso-servidor`, `REQ-conclusao-primeira-versao`.

PROPOSTOS (não travar): `REQ-filtro-periodo`, `REQ-origens-distribuicao`, `REQ-evolucao-contatos`, `REQ-area-campanhas`, `REQ-area-paginas-contatos`, `REQ-area-qualidade-dados`, `REQ-estrutura-navegacao`.

A VALIDAR: `REQ-indicador-principal-definicao` (**variantes concorrentes — ver conflitos**), `REQ-idioma-interface`.

Implementado localmente, pendente de validação remota: `REQ-origens-clicaveis`.

FUTURO (fora da v1): vários clientes e gestão de acessos; identidade visual configurável por empresa; integração com gastos de mídia e resultados comerciais; relatórios e exportações.

Critério de pronto da v1 (`REQ-conclusao-primeira-versao`, 4 condições obrigatórias): a Adonay entra, consulta resultados e usa filtros; indicadores reconciliados; acesso validado no servidor; telas funcionando em computador e celular.

---

## Restrições (18)

Arquivo: `.planning/intel/constraints.md`

Distribuição por tipo: schema 11, protocol 3, nfr 3, api-contract 1.

Seis achados prioritários do SPEC, com estado real de correção:

- `CON-atribuicao-por-touch` — achado #1 — **ABERTO, sem mitigação**
- `CON-cobertura-historica` — achado #2 — corrigido no pacote, **não aplicado**
- `CON-clique-valido` — achado #3 — **ABERTO, sem mitigação** (governa o indicador principal)
- `CON-deduplicacao-ordem` — achado #4 — **ABERTO, sem mitigação**
- `CON-cutoff-limite-canais` — achado #5 — corrigido no pacote, **não aplicado**
- `CON-integridade-snapshot` — achado #6 — corrigido no pacote, **não aplicado**

Demais restrições: `CON-fluxo-views`, `CON-hostname-dominios`, `CON-gclid-legado`, `CON-observado-vs-inferido`, `CON-exclusao-testes-marcador`, `CON-padronizacao-resolucao-campos`, `CON-edge-function-validacao`, `CON-periodo-anterior`, `CON-permissoes-rls`, `CON-ordem-correcao` (5 passos, com gate de publicação no item 5), `CON-criterios-teste` (9 critérios falsificáveis), `CON-estado-consistency-v1`.

**Gate de publicação:** `CON-ordem-correcao` item 5 — publicação somente após validar o acesso e os resultados reais.

**Calibragem obrigatória:** o SPEC é uma revisão **estática**. Os seis achados são riscos demonstráveis pela leitura do código; o impacto quantitativo **não foi medido no banco atual**.

---

## Contexto (10 tópicos)

Arquivo: `.planning/intel/context.md`

Nenhum documento tipo DOC no conjunto. O arquivo reúne o material não normativo dos dois documentos: resultado desejado, base técnica encontrada, estado da implementação local, melhorias de comparação por origem, limites de evidência da auditoria, regras de interpretação a validar, pendências de informação, próximas ações declaradas e dívida técnica observada apenas no código.

Duas reconciliações contra a verdade observada (`.planning/codebase/`) estão registradas ali:
- O limite de evidência do PRD ("código da função e migrações SQL não encontrados") está **desatualizado** — o código está no repositório; permanece válido apenas quanto às regras de acesso do Supabase remoto.
- Os "testes de navegador com respostas de rede simuladas" citados pelo PRD **não existem como suíte executável** no repositório. Tratar como cobertura não reproduzível.

---

## Conflitos

Relatório completo: `.planning/INGEST-CONFLICTS.md`

- **0 blockers** — sem ADR no conjunto (LOCKED-vs-LOCKED impossível), sem UNKNOWN de confiança baixa, sem ciclos, modo `new` sem contexto prévio.
- **1 competing-variant (WARNING)** — regra de contagem de `REQ-indicador-principal-definicao`. Três variantes (A: manter `NOT is_technical_duplicate`; B: exigir `whatsapp_clicked IS TRUE`; C: documentar e validar o conjunto de eventos de contato) preservadas sem mescla. Requer escolha do usuário antes de rotear.
- **5 auto-resolvidos (INFO)** — SPEC > PRD na semântica do indicador principal; seções propostas do PRD não travadas; decisões firmes extraídas de PRD sem ADR; sequenciamento SPEC (dados) vs PRD (interface); estado do `consistency-v1` registrado como restrição e não como trabalho concluído.

---

## Status

**AWAITING USER** — 1 variante concorrente precisa de resolução antes do roteamento. Nenhum blocker.

Arquivos de intel:
- `.planning/intel/decisions.md`
- `.planning/intel/requirements.md`
- `.planning/intel/constraints.md`
- `.planning/intel/context.md`
- `.planning/INGEST-CONFLICTS.md`
