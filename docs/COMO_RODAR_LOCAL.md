# Como rodar o app localmente

## Pré-requisitos
- Node.js 20+
- npm 10+

## Instalação
```bash
cd backend && npm install
cd ../frontend && npm install
```

## Execução
Terminal 1:
```bash
cd backend
npm run dev
```

Terminal 2:
```bash
cd frontend
npm run dev
```

Abra: `http://localhost:5173`

A massa de exemplo já vem com lançamentos de marido e esposa em múltiplos meses, incluindo despesas e investimentos para testes.

## Uso rápido
1. Selecione o membro no filtro global: `all`, `marido`, `esposa` ou `familia`.
2. Ajuste período (mês, 3 meses, ano, custom) e prazo (`short`, `medium`, `long`).
3. Cadastre despesas/receitas no formulário.
4. Para reserva para investir:
   - marque o checkbox **Reserva para investir** ou use categoria `Reserva para investir`;
   - a saída conta em despesas e também aparece em `/api/investments`.
5. No quadro de categorias, clique em uma categoria (despesa, receita ou investimento) para abrir o gráfico de pizza ao lado.
6. Se necessário, clique em **Restaurar dados de exemplo** no formulário para repor os dados de demonstração.

## Testes backend
```bash
cd backend
npm test
```

## Migrações SQL
Arquivos em `backend/migrations`:
- `001_members_and_transactions.sql`
- `002_investments.sql`
