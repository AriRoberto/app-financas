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

## Uso rápido
1. Selecione o membro no filtro global: `all`, `marido`, `esposa` ou `familia`.
2. Ajuste período (mês, 3 meses, ano, custom) e prazo (`short`, `medium`, `long`).
3. Cadastre despesas/receitas no formulário.
4. Para reserva para investir:
   - marque o checkbox **Reserva para investir** ou use categoria `Reserva para investir`;
   - a saída conta em despesas e também aparece em `/api/investments`.

## Testes backend
```bash
cd backend
npm test
```

## Migrações SQL
Arquivos em `backend/migrations`:
- `001_members_and_transactions.sql`
- `002_investments.sql`
