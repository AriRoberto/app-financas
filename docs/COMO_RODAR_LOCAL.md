# Como rodar o app localmente

## Pré-requisitos
- Node.js 20+
- npm 10+

## 1) Instalar dependências

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd ../frontend
npm install
```

## 2) Rodar backend e frontend

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

Acesse: `http://localhost:5173`

## 3) Como cadastrar despesas (inclusive meses anteriores)
Na tela **"Tela de cadastro de despesas"**:
1. Escolha o membro (Você ou Esposa).
2. Escolha o tipo (Despesa/Receita).
3. Selecione a categoria.
4. Defina o **Mês de competência** (`YYYY-MM`) para lançar meses anteriores.
5. Informe descrição e valor.
6. Clique em **Salvar lançamento**.


## 3.1) Zerar os valores de modelo e começar com dados reais
Você pode fazer isso de duas formas:

### Pelo navegador (recomendado)
1. Na tela **"Tela de cadastro de despesas"**, clique em **Zerar dados de exemplo**.
2. Confirme a ação.
3. Cadastre seus valores reais usando o formulário.

### Pela API
```bash
curl -X DELETE http://localhost:3333/api/transactions
```

Se quiser restaurar os dados de exemplo depois:
```bash
curl -X POST http://localhost:3333/api/transactions/seed
```

## 4) Comparação e projeção
- No card azul do topo, selecione o **Mês analisado**.
- O painel recalcula:
  - despesas do mês,
  - comparação com mês anterior,
  - histórico mensal,
  - projeção do próximo mês.

## Rotas da API
- `GET /api/health`
- `GET /api/family-members`
- `GET /api/categories`
- `GET /api/months`
- `GET /api/transactions?month=YYYY-MM`
- `POST /api/transactions`
- `DELETE /api/transactions`
- `POST /api/transactions/seed`
- `GET /api/dashboard?month=YYYY-MM`
- `GET /api/suggestions?month=YYYY-MM`
