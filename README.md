# App de Finanças Pessoal e Familiar

Projeto full-stack para controlar receitas, despesas e investimentos da família com foco em:
- cadastro de lançamentos por categoria;
- comparação entre meses;
- projeção de saídas futuras.

## Funcionalidades atuais
- **Tela de cadastro de lançamentos** com:
  - membro (você/esposa),
  - tipo (despesa/investimento/receita),
  - categoria,
  - mês de competência (inclusive meses anteriores),
  - descrição, valor e data opcional.
- **Dashboard por mês selecionado** com cards de receitas, despesas, saldo e variação versus mês anterior.
- **Histórico mensal** para comparação direta dos meses já cadastrados.
- **Projeção de saídas (despesas + investimentos)** do próximo mês com base na média dos últimos meses.
- **Modelos de descrição por tipo/categoria** com opção de digitar livremente.
- **Receita total familiar e receita individual** por membro.
- **Botão para zerar dados de exemplo** e iniciar do zero com valores reais.

## Endpoints principais
- `GET /api/dashboard?month=YYYY-MM`
- `GET /api/suggestions?month=YYYY-MM`
- `GET /api/transactions?month=YYYY-MM`
- `POST /api/transactions`
- `GET /api/family-members`
- `GET /api/categories`
- `GET /api/description-templates?type=expense|investment|income&category=...`
- `GET /api/months`
- `DELETE /api/transactions` (zera todos os lançamentos, incluindo dados de modelo)
- `POST /api/transactions/seed` (restaura os dados de modelo)

## Como rodar
Siga `docs/COMO_RODAR_LOCAL.md`.
