# Revisão da camada de dados da Adonay

Data: 28/09/2026. Revisão estática dos códigos enviados pelo usuário: Edge Function `dashboard-whatsapp`, oito funções SQL e cinco views. Não houve conexão administrativa, execução de migrações ou alteração do Supabase. O impacto quantitativo dos achados ainda não foi medido no banco atual.

## Permissões verificadas nos resultados enviados

- Oito funções: `anon` e `authenticated` sem EXECUTE; `service_role` com EXECUTE.
- Cinco views: `anon` e `authenticated` sem SELECT.
- A Edge Function valida sessão e exige e-mail na lista autorizada; a lista vazia bloqueia consultas.
- Essas evidências não comprovam as permissões, políticas RLS ou constraints da tabela `whatsapp_leads`, nem todos os caminhos de acesso ao banco.

## Fluxo observado

`whatsapp_leads` → `vw_whatsapp_leads_normalized` → `vw_whatsapp_leads_dashboard` → `vw_whatsapp_leads_semantic` → `vw_whatsapp_leads_final` → `vw_whatsapp_leads_keywords_safe`.

Os KPIs, campanhas e séries usam `final`; os breakdowns usam `keywords_safe`. A última view apenas projeta campos e deriva palavras-chave, sem JOIN ou filtro de linhas. Portanto, no código fornecido, usar essas duas views não causa por si só uma diferença no número de eventos.

## Achados prioritários

### 1. Atribuição mistura campos de contatos diferentes

Em `normalized`, cada campo de first/last touch usa COALESCE individual com a UTM geral. Não há condição baseada em `first_touch_at` ou `last_touch_at`. Um primeiro contato registrado como source=google e medium=organic, sem campanha, pode herdar uma campanha Meta posterior presente em `utm_campaign`. A regra final `metaads-%` precede a regra orgânica e pode classificar esse primeiro contato como Meta Ads.

Correção proposta: escolher a fonte do conjunto de campos por touch, preservando campos vazios em um touch efetivamente capturado. Usar fallback histórico apenas quando aquele touch não foi capturado. Identificar explicitamente fallback em vez de apresentá-lo como observação histórica completa.

### 2. Comparação não respeita cobertura histórica em todos os blocos

`dashboard_comparisons` possui `available`, mas `dashboard_kpis` e `dashboard_timeseries` calculam variação mesmo quando o banco não cobre todo o período anterior. A interface atualmente usa os KPIs para os indicadores principais e comparações por origem.

Correção proposta: compartilhar a disponibilidade histórica entre blocos e suprimir variações quando o comparador não tiver cobertura suficiente. O primeiro evento observado é apenas um indicador conservador de cobertura, não prova de funcionamento contínuo do rastreamento.

### 3. Conceito de clique válido é apenas ausência de duplicidade

Em `dashboard`, `is_valid_click = NOT is_technical_duplicate`. A view não exige `whatsapp_clicked IS TRUE`. Se eventos falsos/nulos entrarem na tabela, podem ser contados. O CSV histórico anteriormente analisado tinha todos os valores desse campo verdadeiros; isso não comprova a situação atual nem a existência de uma constraint.

Correção proposta: documentar quais eventos representam contatos e validar essa condição antes da contagem. Não restringir automaticamente todos os contatos a WhatsApp: o painel também apresenta outros botões e a semântica do campo precisa ser preservada.

### 4. Deduplicação tem cobertura limitada e acontece antes da exclusão de testes

A regra compara eventos adjacentes do mesmo visitante, página sem query string, texto normalizado do botão e URL de destino. Intervalo de até três segundos marca duplicidade. Eventos sem visitante nunca são marcados como duplicados por essa regra.

`is_test_record` só é calculado depois, em `semantic`; assim, um evento de teste pode ser o predecessor que suprime um evento real com a mesma chave. Isso é uma possibilidade demonstrável pela ordem das operações; a frequência no banco não foi medida.

Uma sequência em 0s, 2s e 4s mantém apenas o primeiro porque usa LAG sobre o evento anterior, incluindo os já duplicados. É uma regra de supressão em cadeia, não uma janela fixa contada a partir do evento aceito. Não mudar o limiar ou essa semântica sem definir o comportamento pretendido.

Correção proposta: separar testes antes da janela e priorizar identificador único do evento na ingestão, se disponível. Não deduplicar visitantes desconhecidos agrupando-os como uma única pessoa.

### 5. Cutoff e limite de canais inconsistentes

`dashboard_breakdowns` usa o fim do dia, enquanto KPIs/campanhas/séries usam NOW quando o período termina hoje. Eventos com timestamps futuros no dia podem divergir. A distribuição de canais recebe LIMIT mesmo que os metadados contem todos os canais.

Correção proposta: unificar o intervalo de tempo e retornar todos os canais, mantendo limites explícitos nas listas de campanhas, páginas e palavras-chave.

### 6. Integridade pode aprovar dados ausentes

`dashboard_snapshot` converte campos ausentes em zero e compara os totais declarados. Três blocos sem totais podem resultar em `core_totals_match=true`. A verificação não soma os itens das listas.

Correção proposta: exigir os blocos e os campos obrigatórios, distinguir ausência de zero e comparar as somas completas. Campanhas limitadas devem ser identificadas como amostra da lista, não obrigadas a somar o total.

## Outros ajustes

- Comparações de domínio com `%adonay.cl%`, `%facebook.com%` e `%instagram.com%` aceitam o texto em qualquer parte da URL. Extrair e comparar hostname evita classificar um domínio externo pela query string ou por um nome parecido.
- `gclid` histórico é carregado, mas as regras finais usam `first_gclid`/`last_gclid` e IDs de campanha. Um registro legado somente com `gclid` não recebe a mesma evidência de Google Ads. O fallback precisa respeitar a ausência de um touch capturado.
- Source=google sem mídia paga reconhecida vira orgânico; ausência de mídia não comprova origem orgânica. Manter distinção entre observado e inferido.
- Exclusão de testes por campanha contendo `teste` é heurística. Um marcador explícito na ingestão é preferível a uma regra ampla sobre nomes.
- `keywords_safe` respeita presença de touch ao selecionar termos; `normalized` não aplica o mesmo critério às UTMs. Padronizar a resolução dos campos.
- A Edge Function deve rejeitar corpo inválido, validar datas sem truncar textos e rejeitar snapshot ausente. O SQL já valida datas invertidas e futuras.
- O período anterior é o intervalo imediatamente anterior de igual número de dias, não necessariamente o mesmo trecho do mês anterior. Exibir o comparador claramente.

## Ordem de correção

1. Comparação histórica, cutoff e integridade, preservando as regras de atribuição enquanto sua substituição é testada.
2. Resolução consistente de first/last touch, fallback legado e classificação por hostname, com exemplos representativos.
3. Validade de evento e deduplicação, documentando o comportamento de três segundos e eventos sem visitante.
4. Conferência antes/depois em período fechado e período parcial, incluindo total, canais, campanhas, duplicidades e cobertura.
5. Revisão das permissões da tabela base e publicação somente após validar o acesso e os resultados reais.

## Critérios de teste

- Touch orgânico sem campanha seguido de campanha paga não herda a campanha posterior.
- Touch ausente usa fallback identificado; touch capturado vazio não usa fallback silencioso.
- Período anterior sem cobertura não gera percentual de crescimento.
- Nenhum evento futuro entra em qualquer bloco do período parcial.
- Canais completos somam o total, mesmo com limite pequeno para campanhas.
- Bloco ausente não equivale a zero contatos.
- Evento de teste não suprime evento real próximo com a mesma chave.
- Hostname externo contendo `adonay.cl` na query string não vira domínio interno.
- Usuário não autorizado não consulta a Edge Function; anon/authenticated não consultam funções e views diretamente, conforme as permissões já enviadas.
