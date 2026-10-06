# Requisitos sintetizados (PRD)

- Origem: `PLANEJAMENTO-GTD.md` — "Modernização do dashboard Adonay", 27/09/2026 (seções de status adicionadas em 28/09/2026)
- Precedência: 2 (subordinada a `AUDITORIA-DADOS.md`, precedência 1)
- `locked: false`

**Leitura obrigatória antes de rotear:** cada requisito está marcado com `status`:
- `CONFIRMADO` — decisão firme do usuário (seção "Decisões confirmadas" ou prioridade de conteúdo explicitamente confirmada).
- `PROPOSTO` — vem de "Proposta de escopo da primeira versão" ou "Hierarquia proposta da visão geral", **explicitamente sujeito à revisão com o usuário**. Não tratar como travado.
- `A VALIDAR` — vem de "Regras de interpretação a validar" ou "Aguardando informação".
- `FUTURO` — "Expansões futuras (após validação)". Fora de escopo da primeira versão.

Onde um requisito toca a camada de dados, a restrição correspondente em `constraints.md` **governa** a regra de cálculo.

---

## REQ-visao-geral-contatos-origens

- source: `PLANEJAMENTO-GTD.md` ("Decisões confirmadas"; "Hierarquia proposta da visão geral")
- status: **CONFIRMADO** (prioridade de conteúdo) / **PROPOSTO** (disposição)
- escopo: Visão geral

Descrição: priorizar a **quantidade de contatos e suas origens** na visão geral, conforme definição do usuário.

Critérios de aceitação:
- A visão geral destaca a quantidade de contatos do período e as origens.
- A **prioridade de conteúdo está confirmada**; a disposição visual (ordem dos blocos) é proposta e revisável.
- O total e a distribuição devem usar **o mesmo período, modelo de atribuição e regra de contagem**.

---

## REQ-indicador-principal-definicao

- source: `PLANEJAMENTO-GTD.md` ("Hierarquia proposta"; "Regras de interpretação a validar"), `AUDITORIA-DADOS.md` (achado #3)
- status: **A VALIDAR — variantes concorrentes, ver INGEST-CONFLICTS.md (WARNING)**
- escopo: indicador principal da visão geral

Descrição: o total de contatos do período é o principal indicador, com comparação ao período anterior quando disponível.

Posição do PRD:
- Indicador rotulado `Contactos` na interface atual.
- "Exibir uma explicação curta de que os contatos representam **cliques válidos registrados**, conforme a regra atual **a validar**."
- "**Não apresentar o indicador como pessoas únicas ou conversas confirmadas.**"
- "O indicador visual chamado `Contactos` recebe `valid_clicks` no código atual. **Revisar o nome e a explicação** para refletir a métrica."

Posição governante do SPEC (precedência 1, `CON-clique-valido`):
- `is_valid_click = NOT is_technical_duplicate`; a view **não exige** `whatsapp_clicked IS TRUE`.
- `valid_clicks` são **cliques registrados** — não conversas, não pessoas únicas.
- A regra correta de contagem está **deferida a validação**: "documentar quais eventos representam contatos e validar essa condição antes da contagem"; "não restringir automaticamente todos os contatos a WhatsApp".

Critério de aceitação **não resolvível por precedência** — requer escolha do usuário. Variantes preservadas em `INGEST-CONFLICTS.md`.

---

## REQ-filtro-periodo

- source: `PLANEJAMENTO-GTD.md` ("Hierarquia proposta"; "Base encontrada no projeto"; "Implementação local")
- status: PROPOSTO (disposição) / existente no código
- escopo: cabeçalho, Visão geral

Descrição: filtro de período sempre visível no cabeçalho, junto ao seletor de atribuição.

Critérios de aceitação:
- Filtros de período e atribuição (primeiro ou último contato) disponíveis no cabeçalho.
- Validação de datas e tratamento de troca de período que **não apresente resultados antigos sob filtros novos**.
- Datas personalizadas suportadas.

---

## REQ-comparacao-periodo-anterior

- source: `PLANEJAMENTO-GTD.md` ("Hierarquia proposta"; "Melhorias implementadas"), governado por `CON-cobertura-historica` e `CON-periodo-anterior`
- status: CONFIRMADO (comportamento), governado pelo SPEC (regra)
- escopo: Visão geral, detalhe por origem

Descrição: comparação ao período anterior quando disponível.

Critérios de aceitação:
- Comparação exibida **somente quando há cobertura histórica confirmada**; caso contrário, exibir "comparação indisponível" (`CON-cobertura-historica`).
- Base anterior zero **não produz percentual inventado**.
- Origens sem referência anterior exibem comparação indisponível.
- O período anterior é o intervalo imediatamente anterior de **igual número de dias** (`CON-periodo-anterior`), exibido claramente.

---

## REQ-origens-distribuicao

- source: `PLANEJAMENTO-GTD.md` ("Hierarquia proposta" itens 3–4), governado por `CON-observado-vs-inferido` e `CON-cutoff-limite-canais`
- status: PROPOSTO (disposição) / CONFIRMADO (prioridade)
- escopo: Visão geral

Descrição: origens em destaque, com quantidade e participação percentual de cada canal, mais gráfico de barras por origem.

Critérios de aceitação:
- Usar as categorias retornadas pela função, **após validar suas regras**: Google Ads, Meta Ads, orgânico, direto e referência.
- **Preservar uma categoria sem identificação** quando aplicável.
- **Ausência de UTM não deve ser classificada automaticamente como acesso direto** (alinhado a `CON-observado-vs-inferido`).
- Canais completos somam o total, mesmo com limite pequeno para campanhas (`CON-cutoff-limite-canais`, critério de teste 5).

---

## REQ-evolucao-contatos

- source: `PLANEJAMENTO-GTD.md` ("Hierarquia proposta" item 5; "Implementação local")
- status: PROPOSTO (disposição)
- escopo: Visão geral

Descrição: evolução dos contatos ao longo do período, abaixo do resumo principal; evolução diária usando a resposta do Supabase.

Critérios de aceitação:
- Evolução diária usa o mesmo período, atribuição e regra de contagem do total.
- Soma da evolução confere com o total (verificação local já existente).

---

## REQ-origens-clicaveis

- source: `PLANEJAMENTO-GTD.md` ("Melhorias implementadas — 28/09/2026")
- status: implementado localmente, pendente de validação remota
- escopo: Visão geral

Descrição: origens clicáveis abrindo detalhes do canal.

Critérios de aceitação:
- Detalhes do canal, campanhas disponíveis, participação dentro do canal e evolução diária filtrada.
- A seleção pode ser removida e é reiniciada ao mudar período ou atribuição.
- Campanhas identificadas explicitamente como **lista possivelmente limitada** pela resposta do servidor.

---

## REQ-area-campanhas

- source: `PLANEJAMENTO-GTD.md` ("Proposta de escopo da primeira versão")
- status: **PROPOSTO** — organização de telas sujeita à revisão
- escopo: Campanhas

Descrição: comparação e detalhamento de campanhas e canais.

---

## REQ-area-paginas-contatos

- source: `PLANEJAMENTO-GTD.md` ("Proposta de escopo da primeira versão")
- status: **PROPOSTO** — organização de telas sujeita à revisão
- escopo: Páginas e contatos

Descrição: páginas de entrada, páginas do clique e botões acionados.

Pendência registrada: "Páginas por canal seguem pendentes porque o **contrato atual não fornece essa relação**."

---

## REQ-area-qualidade-dados

- source: `PLANEJAMENTO-GTD.md` ("Proposta de escopo da primeira versão")
- status: **PROPOSTO** — organização de telas sujeita à revisão
- escopo: Qualidade dos dados

Descrição: cobertura de identificação, atribuição e duplicidades, **com explicações**.

Critérios de aceitação:
- Campos de visitante e atribuição têm cobertura parcial; **não tratar ausência como zero ou identificação completa**.
- Discrepâncias são exibidas, **sem corrigir ou ocultar valores recebidos**.

---

## REQ-estrutura-navegacao

- source: `PLANEJAMENTO-GTD.md` ("Proposta de escopo"; "Implementação local")
- status: **PROPOSTO**
- escopo: layout global

Descrição: menu lateral no computador, navegação adaptada ao celular, cabeçalho com período e atribuição, tipografia legível e componentes consistentes.

---

## REQ-layout-responsivo

- source: `PLANEJAMENTO-GTD.md` ("Resultado desejado"; "Implementação local"; "Revisão e conclusão")
- status: CONFIRMADO
- escopo: layout global

Descrição: boa experiência no computador e no celular.

Critérios de aceitação:
- Telas funcionam em computador e celular.
- Cobertura verificada de 320 a 1440 px.

---

## REQ-acesso-individual-cliente

- source: `PLANEJAMENTO-GTD.md` ("Decisões confirmadas"; "Base encontrada no projeto"), governado por `CON-permissoes-rls`
- status: CONFIRMADO
- escopo: Supabase Auth, regras de acesso

Descrição: oferecer acesso individual ao cliente, via login por e-mail e senha no Supabase Auth, com restauração de sessão e rotas protegidas.

Critérios de aceitação:
- Usuário não autorizado **não** consulta a Edge Function; `anon`/`authenticated` não consultam funções e views diretamente (`CON-criterios-teste` item 9).
- **A proteção das rotas na interface não comprova a autorização aplicada no servidor** — a validação no servidor é obrigatória.

---

## REQ-identidade-visual-adonay

- source: `PLANEJAMENTO-GTD.md` ("Decisões confirmadas"; "Implementação local")
- status: CONFIRMADO
- escopo: identidade visual

Descrição: usar a identidade visual fornecida da Clínica Dental Adonay — logo original, azul e lilás.

Critérios de aceitação:
- Identidade Adonay presente no painel e no login.
- Protótipo aprovado e integrado ao aplicativo após autorização do usuário (já ocorrido).

---

## REQ-reuso-rastreamento-existente

- source: `PLANEJAMENTO-GTD.md` ("Decisões confirmadas"; "Implementação local")
- status: CONFIRMADO
- escopo: UTM, Tag Manager, Supabase

Descrição: aproveitar o rastreamento existente por UTM e Tag Manager e o banco Supabase.

Critérios de aceitação:
- Visão geral integrada à função existente `dashboard-whatsapp`, **sem dados demonstrativos no aplicativo**.
- Total de contatos, principal origem, distribuição por canal e evolução diária usando a resposta do Supabase.

---

## REQ-idioma-interface

- source: `PLANEJAMENTO-GTD.md` ("Proposta de escopo"; "Aguardando informação")
- status: **A VALIDAR**
- escopo: interface

Descrição: manter o espanhol como **hipótese inicial**, acompanhando o projeto atual.

Pendência: "Confirmação do idioma e de quem receberá acesso."

---

## REQ-documentar-definicoes

- source: `PLANEJAMENTO-GTD.md` ("Próximas ações" item 3), governado por `CON-clique-valido`, `CON-deduplicacao-ordem`, `CON-atribuicao-por-touch`, `CON-periodo-anterior`
- status: CONFIRMADO (ação pendente)
- escopo: definições de métrica

Descrição: documentar as definições de **clique válido, duplicidade, atribuição e comparação entre períodos, incluindo o fuso horário**.

Critérios de aceitação:
- Cada definição publicada corresponde à regra efetivamente executada na camada de dados.
- Manter as definições dos indicadores **separadas das decisões visuais**.

---

## REQ-reconciliacao-totais

- source: `PLANEJAMENTO-GTD.md` ("Próximas ações" item 6; "Revisão e conclusão"), governado por `CON-criterios-teste` e `CON-ordem-correcao`
- status: CONFIRMADO (pendente)
- escopo: validação de dados

Descrição: conferir os totais com a função e os dados de origem no mesmo período.

Critérios de aceitação:
- Conferência antes/depois em período fechado **e** período parcial, incluindo total, canais, campanhas, duplicidades e cobertura (`CON-ordem-correcao` item 4).
- Testar acesso, filtros, estados vazios e uso no celular.
- O total de linhas do CSV **não** deve ser comparado diretamente com cliques válidos sem conhecer a deduplicação e os filtros da função.
- Os 9 critérios de `CON-criterios-teste` passam.

---

## REQ-validacao-acesso-servidor

- source: `PLANEJAMENTO-GTD.md` ("Implementação local" — Pendente; "Aguardando informação"), governado por `CON-permissoes-rls` e `CON-ordem-correcao` item 5
- status: CONFIRMADO (pendente, bloqueia publicação)
- escopo: Supabase, Edge Function

Descrição: entrar com uma conta real e validar o retorno remoto, os totais e as permissões do Supabase.

Critérios de aceitação:
- **Os testes simulados não comprovam a autorização do servidor ou as regras de cálculo.**
- Regras de acesso vigentes no Supabase revisadas.
- Publicação **somente após** validar o acesso e os resultados reais (`CON-ordem-correcao` item 5).

---

## REQ-conclusao-primeira-versao

- source: `PLANEJAMENTO-GTD.md` ("Revisão e conclusão")
- status: CONFIRMADO — critério de conclusão da v1
- escopo: produto

Descrição: definição de pronto da primeira versão.

Critérios de aceitação (todos obrigatórios):
1. A Adonay consegue **entrar**, **consultar os resultados** e **usar os filtros**.
2. Os **indicadores estão reconciliados**.
3. O **acesso está validado no servidor**.
4. As telas **funcionam em computador e celular**.

Processo: revisar o plano ao concluir cada etapa, registrando decisões, pendências e a próxima ação concreta.

---

## Fora de escopo — expansões futuras (após validação)

- source: `PLANEJAMENTO-GTD.md` ("Expansões futuras (após validação)")
- status: **FUTURO** — não roteável na primeira versão

- Vários clientes e gestão centralizada de seus acessos.
- Identidade visual configurável por empresa.
- Integração com gastos de mídia e resultados comerciais.
- Relatórios e exportações, **se houver necessidade confirmada**.

Nota relacionada (`PLANEJAMENTO-GTD.md`, "Regras de interpretação a validar"): investimento, custo por lead e retorno **precisam de fontes adicionais** — não derivam dos dados atuais.
