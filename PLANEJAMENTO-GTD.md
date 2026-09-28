# Modernização do dashboard Adonay

Planejamento inicial — 27/09/2026.

## Resultado desejado

A Adonay acessa seus resultados em um sistema com navegação clara, indicadores compreensíveis e boa experiência no computador e no celular. A estrutura deve facilitar a reutilização futura, começando por um único cliente.

## Decisões confirmadas

- Planejar antes de implementar.
- Atender somente a Adonay nesta primeira etapa.
- Aproveitar o rastreamento existente por UTM e Tag Manager e o banco Supabase.
- Oferecer acesso individual ao cliente.
- Priorizar a quantidade de contatos e suas origens na visão geral, conforme definição do usuário.
- Usar a identidade visual fornecida da Clínica Dental Adonay: logo original, azul e lilás. Protótipo aprovado e integrado ao aplicativo após autorização do usuário.
- Aperfeiçoar a solução com o uso antes de expandir para outros clientes.

## Base encontrada no projeto

Inspeção estática do código, sem executar o aplicativo ou acessar o Supabase remoto.

- React, TypeScript e Vite; estilos com Tailwind; gráficos com Recharts.
- Login por e-mail e senha via Supabase Auth, restauração de sessão e rotas protegidas na interface.
- Consulta dos indicadores pela função Supabase `dashboard-whatsapp`.
- Filtros de período e atribuição por primeiro ou último contato.
- Atualização periódica de 60 segundos enquanto a página está visível, além de atualização manual.
- Componentes separados para campanhas, páginas, canais, botões e detalhes de mídia.
- Interface existente em espanhol.

O código da função, as regras de acesso do banco e as migrações SQL não foram encontrados na pasta recebida. A proteção das rotas na interface não comprova a autorização aplicada no servidor.

## Proposta de escopo da primeira versão

Esta organização de telas é uma proposta, ainda sujeita à revisão com o usuário.

| Área | Conteúdo |
| --- | --- |
| Visão geral | Quantidade de contatos em destaque, origens e evolução no período |
| Campanhas | Comparação e detalhamento de campanhas e canais |
| Páginas e contatos | Páginas de entrada, páginas do clique e botões acionados |
| Qualidade dos dados | Cobertura de identificação, atribuição e duplicidades, com explicações |

Estrutura visual proposta: menu lateral no computador, navegação adaptada ao celular, cabeçalho com período e atribuição, tipografia legível e componentes consistentes. Manter o espanhol como hipótese inicial, acompanhando o projeto atual.

## Hierarquia proposta da visão geral

A prioridade de conteúdo está confirmada; a disposição abaixo é uma proposta para o protótipo.

1. Filtro de período sempre visível no cabeçalho.
2. Total de contatos do período como principal indicador, com comparação ao período anterior quando disponível.
3. Origens em destaque, com quantidade e participação percentual de cada canal. Usar as categorias retornadas pela função, após validar suas regras: Google Ads, Meta Ads, orgânico, direto e referência. Preservar uma categoria sem identificação quando aplicável; ausência de UTM não deve ser classificada automaticamente como acesso direto.
4. Gráfico de barras por origem para facilitar a comparação entre canais.
5. Evolução dos contatos ao longo do período, abaixo do resumo principal.

O total e a distribuição devem usar o mesmo período, modelo de atribuição e regra de contagem. Exibir uma explicação curta de que os contatos representam cliques válidos registrados, conforme a regra atual a validar. Não apresentar o indicador como pessoas únicas ou conversas confirmadas.

## Próximas ações

1. Preparar a estrutura visual da visão geral com quantidade de contatos e origens como prioridades já definidas; revisar o mapa das demais telas.
2. Obter e revisar o código de `dashboard-whatsapp` e as regras de acesso, sem compartilhar chaves secretas.
3. Documentar as definições de clique válido, duplicidade, atribuição e comparação entre períodos, incluindo o fuso horário.
4. Preparar um protótipo visual da visão geral, mantendo as definições dos indicadores separadas das decisões visuais.
5. Após a revisão do protótipo, modernizar a estrutura de navegação e os componentes existentes.
6. Conferir os totais com a função e os dados de origem no mesmo período, testar acesso, filtros, estados vazios e uso no celular.

As ações 2 e 3 seguem pendentes para a validação dos resultados reais. O usuário aprovou o visual e autorizou a implementação funcional.

## Implementação local

- Visão geral integrada à função existente `dashboard-whatsapp`, sem dados demonstrativos no aplicativo.
- Total de contatos, principal origem, distribuição por canal e evolução diária usando a resposta do Supabase.
- Menu com visão geral, atalhos para origens e evolução e acesso às análises detalhadas existentes.
- Identidade Adonay no painel e no login; layout responsivo.
- Filtros existentes preservados, validação de datas e tratamento de troca de período corrigidos para não apresentar resultados antigos sob filtros novos.
- Compilação TypeScript e Vite aprovada. Testes de navegador com respostas de rede simuladas cobriram login, acesso protegido, filtros, atribuição, datas personalizadas, navegação, vazio, erro, nova tentativa, larguras de 320 a 1440 px e logout.
- Pendente: entrar com uma conta real e validar o retorno remoto, os totais e as permissões do Supabase. Os testes simulados não comprovam a autorização do servidor ou as regras de cálculo.
- Aplicativo disponível localmente em `http://127.0.0.1:5173/` enquanto o servidor de desenvolvimento estiver em execução; publicação não realizada.

## Aguardando informação

- Código e configuração de autorização da função `dashboard-whatsapp`.
- Regras de acesso vigentes no Supabase.
- Confirmação do idioma e de quem receberá acesso.

## Regras de interpretação a validar

- O CSV recebido registra eventos de clique; não comprova conversa iniciada, atendimento ou venda.
- O indicador visual chamado `Contactos` recebe `valid_clicks` no código atual. Revisar o nome e a explicação para refletir a métrica.
- Campos de visitante e atribuição têm cobertura parcial no CSV; não tratar ausência como zero ou identificação completa.
- O total de linhas do CSV não deve ser comparado diretamente com cliques válidos sem conhecer a deduplicação e os filtros da função.
- Investimento, custo por lead e retorno precisam de fontes adicionais.

## Melhorias implementadas — 28/09/2026

- Comparação por origem usando os totais anteriores já retornados para Google Ads, Meta Ads, Directo, Referencia e Orgánico agregado. Subcanais orgânicos e origens sem referência anterior exibem comparação indisponível. Base anterior zero não produz percentual inventado.
- Origens clicáveis: detalhes do canal, campanhas disponíveis, participação dentro do canal e evolução diária filtrada. A seleção pode ser removida e é reiniciada ao mudar período ou atribuição.
- Campanhas explicitamente identificadas como lista possivelmente limitada pela resposta do servidor. Páginas por canal seguem pendentes porque o contrato atual não fornece essa relação.
- Verificações locais de somas de origens e evolução contra o total, categorias e datas duplicadas e contagens inválidas. Discrepâncias são exibidas, sem corrigir ou ocultar valores recebidos.
- Quatro testes automatizados das regras e testes de navegador com respostas simuladas para seleção de canal, filtragem de campanhas e evolução, além dos fluxos existentes.
- Usuário confirmou que os dados estão apenas no Supabase. Conferência dos eventos reais, deduplicação, períodos comparáveis e permissões continua pendente de acesso autenticado e revisão da função remota; as verificações da interface não substituem essa etapa.

## Pacote de consistência preparado — 28/09/2026

- SQL transacional de aplicação e reversão em `supabase/consistency-v1`, com consulta de validação e guia de aplicação na cópia de teste.
- Edge Function revisada em `supabase/functions/dashboard-whatsapp/index.ts`; original preservada para reversão.
- Interface usa a disponibilidade do histórico para suprimir comparações sem cobertura, incluindo detalhes por origem e gráfico comparativo.
- Validado localmente com PostgreSQL isolado (PGlite), fixtures, testes Node e compilação. Não aplicado ou publicado no Supabase remoto.
- Próxima ação: salvar exportação atual e executar o roteiro do README na cópia de teste antes da produção.

## Expansões futuras (após validação)

- Vários clientes e gestão centralizada de seus acessos.
- Identidade visual configurável por empresa.
- Integração com gastos de mídia e resultados comerciais.
- Relatórios e exportações, se houver necessidade confirmada.

## Revisão e conclusão

Revisar este plano ao concluir cada etapa, registrando decisões, pendências e a próxima ação concreta. A primeira versão estará concluída quando a Adonay conseguir entrar, consultar os resultados e usar os filtros; os indicadores estiverem reconciliados; o acesso estiver validado no servidor; e as telas funcionarem em computador e celular.
