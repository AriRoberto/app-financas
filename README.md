# App de Finanças Pessoal e Familiar

Projeto full-stack para controlar receitas e despesas familiares com foco em:
- multi-membro (`marido`, `esposa`, `familia` + filtro `all`);
- projeções de saídas;
- relatórios por categoria e prazo;
- reserva para investir com espelhamento automático em investimentos.

## Funcionalidades atuais
- Cadastro de lançamentos com: membro, tipo (`despesa`, `investimento`, `receita`), categoria, descrição (modelo + digitação livre), valor, mês, data e vencimento.
- Filtro global por membro (`husband|wife|family|all`), período e prazo (`short|medium|long`).
- Dashboard com receita total, despesas, investimento espelhado, totais por membro e histórico mensal.
- Massa de dados de exemplo ampliada para marido e esposa (vários meses, despesas e investimentos) para validar filtros e relatórios.
- Botões no formulário para **Limpar dados de teste** e **Trazer dados de teste** rapidamente.
- Quadro de categorias + gráfico de pizza por categoria selecionada (despesas, receitas e investimentos).
- Regra de prazo para despesas:
  - `short`: até 31/12 do ano corrente
  - `medium`: até 24 meses
  - `long`: acima de 24 meses
- Regra de **reserva para investir**:
  - continua como despesa no fluxo de caixa;
  - cria/atualiza investimento espelhado em `/api/investments`.

## Endpoints principais
- `GET /api/dashboard?member=&month=&from=&to=&term=`
- `GET /api/transactions?member=&month=&from=&to=&term=`
- `POST /api/transactions`
- `PATCH /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `GET /reports/expenses-by-category?member=&from=&to=`
- `GET /api/investments?member=&from=&to=`
- `GET /api/members`
- `GET /api/categories`
- `GET /api/description-templates?type=&category=`

## Banco e migrações
Foram adicionadas migrações SQL em `backend/migrations`:
- `001_members_and_transactions.sql`
- `002_investments.sql`

## Como rodar
Veja `docs/COMO_RODAR_LOCAL.md`.

> Dica: se você apagou lançamentos sem querer, use o botão **Restaurar dados de exemplo** na tela.
