# Restrições sintetizadas (SPEC)

Fonte de maior precedência do conjunto ingerido (`precedence: 1`). Todas as restrições abaixo governam sobre requisitos de produto conflitantes.

- Origem: `AUDITORIA-DADOS.md` — "Revisão da camada de dados da Adonay", 28/09/2026
- Natureza: revisão **estática** do código enviado. Não houve conexão administrativa, execução de migrações nem alteração do Supabase. **O impacto quantitativo dos achados não foi medido no banco atual.**
- `locked: false` (reservado a ADRs Accepted), mas precedência 1 sobre o PRD.

---

## CON-fluxo-views — Pipeline de views observado

- source: `AUDITORIA-DADOS.md` ("Fluxo observado")
- tipo: schema

`whatsapp_leads` → `vw_whatsapp_leads_normalized` → `vw_whatsapp_leads_dashboard` → `vw_whatsapp_leads_semantic` → `vw_whatsapp_leads_final` → `vw_whatsapp_leads_keywords_safe`.

KPIs, campanhas e séries usam `final`; os breakdowns usam `keywords_safe`. A última view apenas projeta campos e deriva palavras-chave, sem JOIN ou filtro de linhas. Portanto, no código fornecido, usar essas duas views **não causa por si só** diferença no número de eventos.

---

## CON-atribuicao-por-touch — Resolução de first/last touch (achado prioritário #1, ABERTO)

- source: `AUDITORIA-DADOS.md` ("1. Atribuição mistura campos de contatos diferentes")
- tipo: schema

Estado atual: em `normalized`, cada campo de first/last touch usa COALESCE individual com a UTM geral. Não há condição baseada em `first_touch_at` ou `last_touch_at`. Um primeiro contato registrado como `source=google` e `medium=organic`, sem campanha, pode herdar uma campanha Meta posterior presente em `utm_campaign`. A regra final `metaads-%` precede a regra orgânica e pode classificar esse primeiro contato como Meta Ads.

Restrição a aplicar:
- Escolher a fonte do **conjunto de campos por touch**, preservando campos vazios em um touch efetivamente capturado.
- Usar **fallback histórico apenas quando aquele touch não foi capturado**.
- Identificar explicitamente o fallback, em vez de apresentá-lo como observação histórica completa.

---

## CON-cobertura-historica — Cobertura histórica compartilhada entre blocos (achado prioritário #2, CORRIGIDO NO PACOTE, NÃO APLICADO)

- source: `AUDITORIA-DADOS.md` ("2. Comparação não respeita cobertura histórica em todos os blocos")
- tipo: schema

Estado atual: `dashboard_comparisons` possui `available`, mas `dashboard_kpis` e `dashboard_timeseries` calculam variação mesmo quando o banco não cobre todo o período anterior. A interface usa os KPIs para os indicadores principais e comparações por origem.

Restrição a aplicar:
- Compartilhar a disponibilidade histórica entre blocos e **suprimir variações quando o comparador não tiver cobertura suficiente**.
- O primeiro evento observado é apenas um indicador **conservador** de cobertura, não prova de funcionamento contínuo do rastreamento.

---

## CON-clique-valido — Definição de clique válido (achado prioritário #3, ABERTO)

- source: `AUDITORIA-DADOS.md` ("3. Conceito de clique válido é apenas ausência de duplicidade")
- tipo: schema
- **Restrição governante do indicador principal do produto. Ver INGEST-CONFLICTS.md (WARNING).**

Estado atual: em `dashboard`, `is_valid_click = NOT is_technical_duplicate`. A view **não exige** `whatsapp_clicked IS TRUE`. Se eventos falsos/nulos entrarem na tabela, podem ser contados. O CSV histórico anteriormente analisado tinha todos os valores desse campo verdadeiros; isso **não comprova** a situação atual nem a existência de uma constraint.

Restrição a aplicar:
- Documentar **quais eventos representam contatos** e validar essa condição antes da contagem.
- **Não** restringir automaticamente todos os contatos a WhatsApp: o painel também apresenta outros botões e a semântica do campo precisa ser preservada.

Consequência semântica para o produto: `valid_clicks` são **cliques registrados** — não conversas confirmadas, não pessoas únicas.

---

## CON-deduplicacao-ordem — Deduplicação técnica e ordem das operações (achado prioritário #4, ABERTO)

- source: `AUDITORIA-DADOS.md` ("4. Deduplicação tem cobertura limitada e acontece antes da exclusão de testes")
- tipo: schema

Estado atual:
- A regra compara eventos adjacentes do mesmo visitante, página sem query string, texto normalizado do botão e URL de destino. Intervalo de até **três segundos** marca duplicidade.
- Eventos **sem visitante nunca são marcados como duplicados** por essa regra.
- `is_test_record` só é calculado depois, em `semantic`; assim, um evento de teste pode ser o predecessor que **suprime um evento real** com a mesma chave. É possibilidade demonstrável pela ordem das operações; a frequência no banco não foi medida.
- Uma sequência em 0s, 2s e 4s mantém apenas o primeiro, porque usa LAG sobre o evento anterior, **incluindo os já duplicados**. É uma regra de **supressão em cadeia**, não uma janela fixa contada a partir do evento aceito.

Restrição a aplicar:
- **Não mudar o limiar de três segundos nem essa semântica sem definir o comportamento pretendido.**
- Separar testes **antes** da janela de deduplicação.
- Priorizar identificador único do evento na ingestão, se disponível.
- **Não deduplicar visitantes desconhecidos agrupando-os como uma única pessoa.**

---

## CON-cutoff-limite-canais — Cutoff de período e limite de canais (achado prioritário #5, CORRIGIDO NO PACOTE, NÃO APLICADO)

- source: `AUDITORIA-DADOS.md` ("5. Cutoff e limite de canais inconsistentes")
- tipo: schema

Estado atual: `dashboard_breakdowns` usa o fim do dia, enquanto KPIs/campanhas/séries usam NOW quando o período termina hoje. Eventos com timestamps futuros no dia podem divergir. A distribuição de canais recebe LIMIT mesmo que os metadados contem todos os canais.

Restrição a aplicar:
- **Unificar o intervalo de tempo** entre todos os blocos.
- **Retornar todos os canais**, mantendo limites explícitos apenas nas listas de campanhas, páginas e palavras-chave.

---

## CON-integridade-snapshot — Verificação de integridade do snapshot (achado prioritário #6, CORRIGIDO NO PACOTE, NÃO APLICADO)

- source: `AUDITORIA-DADOS.md` ("6. Integridade pode aprovar dados ausentes")
- tipo: protocol

Estado atual: `dashboard_snapshot` converte campos ausentes em zero e compara os totais declarados. **Três blocos sem totais podem resultar em `core_totals_match=true`.** A verificação não soma os itens das listas.

Restrição a aplicar:
- Exigir os blocos e os campos obrigatórios.
- **Distinguir ausência de zero.**
- Comparar as somas completas.
- Campanhas limitadas devem ser identificadas como **amostra** da lista, não obrigadas a somar o total.

---

## CON-hostname-dominios — Classificação por hostname

- source: `AUDITORIA-DADOS.md` ("Outros ajustes")
- tipo: schema

Comparações de domínio com `%adonay.cl%`, `%facebook.com%` e `%instagram.com%` aceitam o texto em qualquer parte da URL. **Extrair e comparar hostname** evita classificar um domínio externo pela query string ou por um nome parecido.

---

## CON-gclid-legado — Evidência de Google Ads em registros legados

- source: `AUDITORIA-DADOS.md` ("Outros ajustes")
- tipo: schema

`gclid` histórico é carregado, mas as regras finais usam `first_gclid`/`last_gclid` e IDs de campanha. Um registro legado somente com `gclid` **não recebe a mesma evidência** de Google Ads. O fallback precisa respeitar a ausência de um touch capturado.

---

## CON-observado-vs-inferido — Distinção entre observado e inferido

- source: `AUDITORIA-DADOS.md` ("Outros ajustes")
- tipo: schema

`source=google` sem mídia paga reconhecida vira orgânico; **ausência de mídia não comprova origem orgânica**. Manter distinção entre observado e inferido.

---

## CON-exclusao-testes-marcador — Exclusão de registros de teste

- source: `AUDITORIA-DADOS.md` ("Outros ajustes")
- tipo: schema

Exclusão de testes por campanha contendo `teste` é **heurística**. Um marcador explícito na ingestão é preferível a uma regra ampla sobre nomes.

---

## CON-padronizacao-resolucao-campos — Padronização entre views

- source: `AUDITORIA-DADOS.md` ("Outros ajustes")
- tipo: schema

`keywords_safe` respeita presença de touch ao selecionar termos; `normalized` **não** aplica o mesmo critério às UTMs. Padronizar a resolução dos campos.

---

## CON-edge-function-validacao — Contrato de entrada da Edge Function

- source: `AUDITORIA-DADOS.md` ("Outros ajustes")
- tipo: api-contract

A Edge Function deve:
- rejeitar corpo inválido;
- validar datas **sem truncar textos**;
- rejeitar snapshot ausente.

O SQL já valida datas invertidas e futuras.

---

## CON-periodo-anterior — Definição do período anterior

- source: `AUDITORIA-DADOS.md` ("Outros ajustes")
- tipo: schema

O período anterior é o **intervalo imediatamente anterior de igual número de dias**, não necessariamente o mesmo trecho do mês anterior. Exibir o comparador claramente.

---

## CON-permissoes-rls — Permissões e limites da evidência

- source: `AUDITORIA-DADOS.md` ("Permissões verificadas nos resultados enviados")
- tipo: nfr

Verificado nos resultados enviados:
- Oito funções: `anon` e `authenticated` sem EXECUTE; `service_role` com EXECUTE.
- Cinco views: `anon` e `authenticated` sem SELECT.
- A Edge Function valida sessão e exige e-mail na lista autorizada; **a lista vazia bloqueia consultas**.

Limite explícito da evidência: essas evidências **não comprovam** as permissões, políticas RLS ou constraints da tabela `whatsapp_leads`, nem todos os caminhos de acesso ao banco.

---

## CON-ordem-correcao — Ordem de correção obrigatória

- source: `AUDITORIA-DADOS.md` ("Ordem de correção")
- tipo: protocol

1. Comparação histórica, cutoff e integridade, **preservando as regras de atribuição** enquanto sua substituição é testada.
2. Resolução consistente de first/last touch, fallback legado e classificação por hostname, com exemplos representativos.
3. Validade de evento e deduplicação, documentando o comportamento de três segundos e eventos sem visitante.
4. Conferência antes/depois em período fechado e período parcial, incluindo total, canais, campanhas, duplicidades e cobertura.
5. Revisão das permissões da tabela base e **publicação somente após validar o acesso e os resultados reais**.

Gate de publicação: o item 5 condiciona qualquer publicação à validação de acesso e resultados reais.

---

## CON-criterios-teste — Critérios de teste falsificáveis (9)

- source: `AUDITORIA-DADOS.md` ("Critérios de teste")
- tipo: nfr

1. Touch orgânico sem campanha seguido de campanha paga **não herda** a campanha posterior.
2. Touch ausente usa fallback **identificado**; touch capturado vazio **não** usa fallback silencioso.
3. Período anterior sem cobertura **não gera** percentual de crescimento.
4. **Nenhum evento futuro** entra em qualquer bloco do período parcial.
5. Canais completos somam o total, mesmo com limite pequeno para campanhas.
6. **Bloco ausente não equivale a zero contatos.**
7. Evento de teste **não suprime** evento real próximo com a mesma chave.
8. Hostname externo contendo `adonay.cl` na query string **não vira** domínio interno.
9. Usuário não autorizado não consulta a Edge Function; `anon`/`authenticated` não consultam funções e views diretamente, conforme as permissões já enviadas.

---

## CON-estado-consistency-v1 — Estado real do pacote de consistência (verdade observada)

- source: `.planning/codebase/CONCERNS.md`, `supabase/consistency-v1/README.md` (mapa do código, 2026-10-06); corroborado por `PLANEJAMENTO-GTD.md` ("Pacote de consistência preparado")
- tipo: protocol
- **Registrar como restrição, não como trabalho concluído.**

O pacote `supabase/consistency-v1/` (`01-apply.sql`, `02-rollback.sql`, `03-validate.sql`, `03-validate-data.sql`, `baseline-functions.sql`, `edge-original.ts`) endereça os achados **#2, #5 e #6**, mas **nunca foi aplicado ao Supabase remoto** (README: "Não aplicado ao Supabase remoto"). O dashboard em produção ainda executa a lógica antiga.

Cobertura do pacote:
- Achado #5 — breakdowns passam a usar o mesmo limite superior de horário; todos os canais são retornados.
- Achado #6 — snapshot exige contagens inteiras não negativas e blocos necessários; ausência deixa de passar como zero; integridade compara totais declarados contra somas de canais e evolução diária.
- Achado #2 — `kpis.period.previous_available` e `timeseries.meta.previous_available` tornam a disponibilidade explícita; ausência de cobertura anula as variações no snapshot.
- Contrato passa de 1.0 para 1.1 **sem remover campos existentes**.

Permanecem **abertos, sem implementação**:
- Achado **#1** (atribuição mistura campos de touches diferentes) — nenhuma mitigação implementada.
- Achado **#3** (clique válido = apenas ausência de duplicidade) — nenhuma mitigação implementada.
- Achado **#4** (deduplicação antes da exclusão de testes; eventos sem visitante) — nenhuma mitigação implementada.

Restrições derivadas:
- Qualquer alteração deve seguir a sequência do `supabase/consistency-v1/README.md`: exportação fresca, `03-validate.sql` antes/depois, aplicação em **cópia de teste** primeiro, verificação de `core_totals_match` e soma dos canais, só então produção.
- `baseline-functions.sql` é referência exportada e entrada dos testes — **não executar como migração**.
- O pacote não altera eventos, views de atribuição, usuários, grants, RLS nem `verify_jwt`.
- Os achados #1, #3 e #4 vivem nas views do Supabase (`vw_whatsapp_leads_normalized`, `vw_whatsapp_leads_dashboard`), **que não estão neste repositório** — qualquer correção exige acesso ao banco.
