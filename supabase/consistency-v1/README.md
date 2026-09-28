# Pacote 1 — consistência dos indicadores

Preparado em 28/09/2026 a partir das definições enviadas pelo usuário. **Não aplicado ao Supabase remoto.**

## Conteúdo

- `01-apply.sql`: atualiza apenas `dashboard_breakdowns` e `dashboard_snapshot`, dentro de transação. Não altera eventos, views de atribuição, usuários ou grants.
- `02-rollback.sql`: restaura essas duas funções conforme a exportação fornecida em 28/09/2026. Não é um backup de alterações feitas depois dessa exportação.
- `03-validate.sql`: consultas somente de leitura para salvar resultados antes e depois.
- `baseline-functions.sql`: referência exportada e entrada dos testes. **Não executar como migração.**
- `edge-original.ts`: versão original fornecida para reversão da Edge Function.
- `../functions/dashboard-whatsapp/index.ts`: Edge Function revisada (pasta irmã `functions`).

## Mudanças

1. Breakdowns usam o mesmo limite superior de horário: até NOW quando o período inclui hoje; dias passados permanecem completos.
2. Todos os canais são retornados. `limit` continua valendo para as listas detalhadas existentes.
3. O snapshot exige contagens inteiras não negativas e blocos necessários. Ausência deixa de passar como zero.
4. A integridade compara os totais declarados e as somas dos canais e da evolução diária. Divergência real continua visível; não é corrigida artificialmente.
5. Cobertura anterior usa `comparisons.previous_period.available` já existente: `kpis.period.previous_available` e `timeseries.meta.previous_available` tornam a disponibilidade explícita. Ausência de cobertura anula as variações no snapshot. As contagens históricas observadas são preservadas, e a interface oculta comparação, valores comparativos por canal e linha anterior quando não há cobertura confirmada.
6. A Edge Function rejeita JSON inválido, corpo que não seja objeto, datas impossíveis, invertidas ou com sufixos; snapshots sem estrutura mínima retornam erro em vez de sucesso.

Os KPIs e séries quando chamados diretamente continuam com sua implementação original. A correção de disponibilidade é feita no snapshot consumido pela aplicação. A versão do contrato passa de 1.0 para 1.1 sem remover campos existentes.

## Sequência de aplicação na cópia de teste

1. Salvar uma exportação atual das duas funções e da Edge Function. Confirmar que não houve mudanças desde os arquivos recebidos. Se houve, comparar e atualizar a reversão antes de aplicar.
2. Rodar `03-validate.sql` antes da mudança e guardar o resultado. Acrescentar um período personalizado fechado que conheça bem, usando `dashboard_snapshot('personalizado','last', DATE 'AAAA-MM-DD', DATE 'AAAA-MM-DD', 1)` com datas reais no lugar dos marcadores. O limite 1 é proposital: testa que canais não são truncados.
3. Rodar `01-apply.sql` inteiro no SQL Editor da cópia. A transação deve finalizar com sucesso. Se o editor mantiver uma transação abortada após erro, executar `ROLLBACK` antes de investigar e repetir.
4. Rodar `03-validate.sql` novamente. Para os períodos fechados, os contatos devem permanecer iguais. Listas de canais podem aumentar se estavam truncadas. Para períodos em andamento, considerar novos eventos entre as consultas: não interpretar toda diferença como regressão.
5. Verificar que `core_totals_match` é verdadeiro e que a soma dos canais coincide com o total. Períodos sem cobertura anterior devem mostrar `previous_available=false` e percentuais nulos.
6. Substituir o código de `dashboard-whatsapp` pelo arquivo revisado na cópia de teste, mantendo seus secrets e configuração de autenticação existentes. Este pacote não altera `verify_jwt` e não contém chaves.
7. Testar com uma conta autorizada: entrar, trocar período e atribuição, abrir uma origem e comparar os resultados. Testar conta não autorizada e sessão inválida. Nenhuma deve obter dados.
8. Depois da validação na cópia, repetir a sequência no projeto de produção, com exportação fresca para reversão. Publicar o frontend revisado no mesmo ciclo. Nenhuma publicação foi feita pelo assistente.

## Reversão

Executar `02-rollback.sql` inteiro para restaurar as duas definições SQL recebidas. Se houve alterações externas posteriores, usar a exportação fresca do passo 1. Restaurar `edge-original.ts` no editor da Edge Function, preservando os secrets. A interface nova consegue ler o indicador de cobertura do bloco `comparisons` do contrato antigo e continua compatível após rollback; não precisa ser revertida apenas para voltar ao SQL 1.0.

## Testes executados localmente

- PostgreSQL isolado com PGlite 0.3.14: funções PL/pgSQL reais da exportação; relações de origem substituídas por fixtures. Reproduziu os erros de limite de canais e cutoff; verificou cobertura histórica, ausência de blocos/contagens, grants e rollback.
- Nove testes Node: comparações por canal, cobertura, detalhe e integridade; Edge Function com Auth e RPC simulados, incluindo sessão inválida, usuário não autorizado, origem recusada, corpo inválido, datas e snapshot inválido.
- Compilação TypeScript e build Vite aprovados.

Executar com Node 24:

```text
node --test tests/channelInsights.test.mjs tests/consistency-edge.test.mjs
node tests/consistency-sql.mjs
```

Para o teste SQL, instalar `@electric-sql/pglite@0.3.14` em um ambiente de teste e definir `PGLITE_MODULE` com o caminho absoluto de `dist/index.js` quando o pacote não estiver resolvível a partir do projeto. A dependência não foi adicionada ao aplicativo de produção. O teste Edge usa APIs Web do Node e simulação do Deno/Auth/RPC: não substitui implantação de teste no runtime real do Supabase.

## Limites desta etapa

A disponibilidade histórica é inferida pela primeira data observada, conforme a função existente; não comprova rastreamento ininterrupto. Não foram alteradas atribuição, deduplicação, definição de contato, tabelas ou políticas RLS. O impacto nos dados atuais e o comportamento no Supabase remoto ainda precisam da validação acima.
