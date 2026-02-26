# App de Finanças Pessoal e Familiar

Projeto full-stack para controlar receitas e despesas da família com foco em:
- cadastro de lançamentos por categoria;
- comparação entre meses;
- projeção de gastos futuros.

## Funcionalidades atuais
- **Tela de cadastro de despesas** com:
  - membro (você/esposa),
  - tipo (despesa/receita),
  - categoria,
  - mês de competência (inclusive meses anteriores),
  - descrição, valor e data opcional.
- **Dashboard por mês selecionado** com cards de receitas, despesas, saldo e variação versus mês anterior.
- **Histórico mensal** para comparação direta dos meses já cadastrados.
- **Projeção de despesas** do próximo mês com base na média dos últimos meses.
- **Botão para zerar dados de exemplo** e iniciar do zero com valores reais.

## Endpoints principais
- `GET /api/dashboard?month=YYYY-MM`
- `GET /api/suggestions?month=YYYY-MM`
- `GET /api/transactions?month=YYYY-MM`
- `POST /api/transactions`
- `GET /api/family-members`
- `GET /api/categories`
- `GET /api/months`
- `DELETE /api/transactions` (zera todos os lançamentos, incluindo dados de modelo)
- `POST /api/transactions/seed` (restaura os dados de modelo)

## Como rodar
Siga `docs/COMO_RODAR_LOCAL.md`.
