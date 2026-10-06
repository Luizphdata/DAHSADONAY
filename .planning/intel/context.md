# Contexto sintetizado

**Nenhum documento tipo DOC foi ingerido.** O conjunto contém 1 SPEC e 1 PRD. Este arquivo reúne o contexto **não normativo** dos dois documentos — estado observado, pendências e limites de evidência — que não constitui restrição (`constraints.md`), requisito (`requirements.md`) nem decisão (`decisions.md`), mas é necessário para planejar corretamente.

Onde o contexto do PRD divergir do mapa do código em `.planning/codebase/`, o mapa é a verdade observada sobre a implementação atual.

---

## Tópico: Resultado desejado

- source: `PLANEJAMENTO-GTD.md` ("Resultado desejado")

"A Adonay acessa seus resultados em um sistema com navegação clara, indicadores compreensíveis e boa experiência no computador e no celular. A estrutura deve facilitar a reutilização futura, começando por um único cliente."

---

## Tópico: Base técnica encontrada no projeto

- source: `PLANEJAMENTO-GTD.md` ("Base encontrada no projeto") — inspeção estática, sem executar o aplicativo ou acessar o Supabase remoto
- corroborado por: `.planning/codebase/STACK.md`, `.planning/codebase/INTEGRATIONS.md`

- React, TypeScript e Vite; estilos com Tailwind; gráficos com Recharts.
- Login por e-mail e senha via Supabase Auth, restauração de sessão e rotas protegidas na interface.
- Consulta dos indicadores pela função Supabase `dashboard-whatsapp`.
- Filtros de período e atribuição por primeiro ou último contato.
- Atualização periódica de 60 segundos enquanto a página está visível, além de atualização manual.
- Componentes separados para campanhas, páginas, canais, botões e detalhes de mídia.
- Interface existente em espanhol.

Limite de evidência registrado no PRD: "O código da função, as regras de acesso do banco e as migrações SQL não foram encontrados na pasta recebida. A proteção das rotas na interface não comprova a autorização aplicada no servidor."

**Reconciliação com a verdade observada:** o mapa do código de 2026-10-06 **encontra** a Edge Function em `supabase/functions/dashboard-whatsapp/index.ts` e as funções SQL exportadas em `supabase/consistency-v1/baseline-functions.sql`. Esse limite de evidência do PRD está desatualizado quanto ao código; permanece válido quanto às **regras de acesso vigentes no Supabase remoto**, que continuam não verificadas.

---

## Tópico: Estado da implementação local

- source: `PLANEJAMENTO-GTD.md` ("Implementação local", 28/09/2026)

- Visão geral integrada à função existente `dashboard-whatsapp`, sem dados demonstrativos no aplicativo.
- Total de contatos, principal origem, distribuição por canal e evolução diária usando a resposta do Supabase.
- Menu com visão geral, atalhos para origens e evolução e acesso às análises detalhadas existentes.
- Identidade Adonay no painel e no login; layout responsivo.
- Filtros existentes preservados; validação de datas e tratamento de troca de período corrigidos para não apresentar resultados antigos sob filtros novos.
- Compilação TypeScript e Vite aprovada.
- Testes de navegador com respostas de rede simuladas cobriram login, acesso protegido, filtros, atribuição, datas personalizadas, navegação, vazio, erro, nova tentativa, larguras de 320 a 1440 px e logout.
- **Pendente:** entrar com uma conta real e validar o retorno remoto, os totais e as permissões do Supabase. **Os testes simulados não comprovam a autorização do servidor ou as regras de cálculo.**
- Aplicativo disponível localmente em `http://127.0.0.1:5173/` enquanto o servidor de desenvolvimento estiver em execução; **publicação não realizada**.

**Reconciliação com a verdade observada** (`.planning/codebase/CONCERNS.md`): os "testes de navegador com respostas de rede simuladas" **não existem como suíte executável no repositório** — não há configuração Playwright/Cypress. Os únicos testes presentes são `tests/channelInsights.test.mjs`, `tests/consistency-edge.test.mjs` e `tests/consistency-sql.mjs`. Tratar essa cobertura de navegador como **não reproduzível** até ser comprometida no repositório.

---

## Tópico: Melhorias de comparação por origem

- source: `PLANEJAMENTO-GTD.md` ("Melhorias implementadas — 28/09/2026")

- Comparação por origem usando os totais anteriores já retornados para Google Ads, Meta Ads, Directo, Referencia e Orgánico agregado.
- Subcanais orgânicos e origens sem referência anterior exibem comparação indisponível. Base anterior zero não produz percentual inventado.
- Origens clicáveis com detalhes do canal, campanhas disponíveis, participação dentro do canal e evolução diária filtrada.
- Campanhas explicitamente identificadas como lista possivelmente limitada pela resposta do servidor. **Páginas por canal seguem pendentes porque o contrato atual não fornece essa relação.**
- Verificações locais de somas de origens e evolução contra o total, categorias e datas duplicadas e contagens inválidas. **Discrepâncias são exibidas, sem corrigir ou ocultar valores recebidos.**
- Quatro testes automatizados das regras, além de testes de navegador simulados.
- **Usuário confirmou que os dados estão apenas no Supabase.** Conferência dos eventos reais, deduplicação, períodos comparáveis e permissões continua pendente de acesso autenticado e revisão da função remota; as verificações da interface não substituem essa etapa.

---

## Tópico: Limites de evidência da auditoria de dados

- source: `AUDITORIA-DADOS.md` (abertura e "Permissões verificadas nos resultados enviados")

Essencial para calibrar o planejamento — os seis achados são **riscos demonstráveis pela leitura do código, não defeitos medidos**:

- Revisão **estática** dos códigos enviados: Edge Function `dashboard-whatsapp`, oito funções SQL e cinco views.
- **Não houve conexão administrativa, execução de migrações ou alteração do Supabase.**
- **O impacto quantitativo dos achados ainda não foi medido no banco atual.**
- O CSV histórico anteriormente analisado tinha todos os valores de `whatsapp_clicked` verdadeiros; isso **não comprova** a situação atual nem a existência de uma constraint.
- A possibilidade de um evento de teste suprimir um evento real é demonstrável pela ordem das operações; **a frequência no banco não foi medida**.
- As permissões enviadas **não comprovam** as políticas RLS ou constraints da tabela `whatsapp_leads`, nem todos os caminhos de acesso ao banco.

Referência externa sem caminho: a auditoria cita um "CSV histórico anteriormente analisado" que **não foi ingerido** e cujo caminho não é informado. Qualquer conclusão que dependa dele não é verificável neste conjunto.

---

## Tópico: Regras de interpretação a validar

- source: `PLANEJAMENTO-GTD.md` ("Regras de interpretação a validar")
- status: todas pendentes de validação; as de camada de dados são governadas por `constraints.md`

- O CSV recebido registra **eventos de clique**; não comprova conversa iniciada, atendimento ou venda.
- O indicador visual chamado `Contactos` recebe `valid_clicks` no código atual. Revisar o nome e a explicação para refletir a métrica. → ver WARNING em `INGEST-CONFLICTS.md`.
- Campos de visitante e atribuição têm cobertura parcial no CSV; **não tratar ausência como zero ou identificação completa**.
- O total de linhas do CSV não deve ser comparado diretamente com cliques válidos sem conhecer a deduplicação e os filtros da função.
- Investimento, custo por lead e retorno precisam de fontes adicionais.

---

## Tópico: Aguardando informação do usuário

- source: `PLANEJAMENTO-GTD.md` ("Aguardando informação")

- Código e configuração de autorização da função `dashboard-whatsapp`.
- Regras de acesso vigentes no Supabase.
- Confirmação do idioma e de quem receberá acesso.

**Reconciliação:** o primeiro item foi parcialmente satisfeito — o código da Edge Function está no repositório (`supabase/functions/dashboard-whatsapp/index.ts`) e a autorização é por `DASHBOARD_ALLOWED_EMAILS` (variável de ambiente, lista separada por vírgulas, falha fechada se vazia). Os outros dois permanecem abertos.

---

## Tópico: Próximas ações declaradas no PRD

- source: `PLANEJAMENTO-GTD.md` ("Próximas ações")
- nota de sequenciamento: para itens de camada de dados, `CON-ordem-correcao` governa a ordem

1. Preparar a estrutura visual da visão geral com quantidade de contatos e origens como prioridades já definidas; revisar o mapa das demais telas.
2. Obter e revisar o código de `dashboard-whatsapp` e as regras de acesso, **sem compartilhar chaves secretas**. — *pendente*
3. Documentar as definições de clique válido, duplicidade, atribuição e comparação entre períodos, incluindo o fuso horário. — *pendente*
4. Preparar um protótipo visual da visão geral, mantendo as definições dos indicadores separadas das decisões visuais.
5. Após a revisão do protótipo, modernizar a estrutura de navegação e os componentes existentes.
6. Conferir os totais com a função e os dados de origem no mesmo período, testar acesso, filtros, estados vazios e uso no celular.

"As ações 2 e 3 seguem pendentes para a validação dos resultados reais. O usuário aprovou o visual e autorizou a implementação funcional."

---

## Tópico: Dívida técnica adicional observada no código (fora dos dois documentos)

- source: `.planning/codebase/CONCERNS.md` (mapa do código, 2026-10-06)
- nota: não aparece em nenhum dos dois documentos ingeridos; incluído porque afeta o planejamento

- Lógica de validação de data duplicada entre `supabase/functions/dashboard-whatsapp/index.ts` e `src/pages/Dashboard.tsx`.
- `src/pages/Dashboard.tsx` com 612 linhas, misturando parsing de query-param, estado de filtros, subcomponentes e formatação.
- Autorização apenas por variável de ambiente, sem UI de administração, tabela ou trilha de auditoria.
- Verificação de integridade da Edge Function em um único `if` com ~12 condições em uma linha (`index.ts:590`) — frágil.
- Variáveis de ambiente lidas com asserção não nula, sem validação de inicialização.
- Sem rate limiting no servidor; sem CI; sem `npm test`; dependência PGlite fora do `package.json`.
- Sem testes de componente ou hook para `src/` (incluindo `useDashboard.ts` e `AuthContext.tsx`).
