# Como rodar o app localmente

Este projeto possui duas aplicações:
- `backend/`: API em Node.js + Express.
- `frontend/`: interface web em React + Vite.

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

## 2) Rodar o backend

No terminal 1:
```bash
cd backend
npm run dev
```

API disponível em:
- `GET /api/health`
- `GET /api/family-members`
- `GET /api/transactions`
- `POST /api/transactions`
- `GET /api/dashboard`
- `GET /api/suggestions`

Base URL: `http://localhost:3333`

## 3) Rodar o frontend

No terminal 2:
```bash
cd frontend
npm run dev
```

Abra no navegador:
- `http://localhost:5173`

## 4) Como cadastrar seus gastos e os da esposa
No frontend, use o formulário **"Lançar receita/despesa"**:
1. Selecione o membro (`Você` ou `Esposa`).
2. Escolha o tipo (`Despesa` ou `Receita`).
3. Preencha categoria, descrição, valor e data.
4. Clique em **Salvar lançamento**.

Após salvar, o painel atualiza automaticamente com:
- resumo geral do mês;
- resumo por membro da família;
- distribuição por categoria;
- últimos lançamentos.

## Estrutura de pastas

```text
app-financas/
├── backend/
│   ├── package.json
│   └── src/
│       └── server.js
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       └── styles.css
├── docs/
│   └── COMO_RODAR_LOCAL.md
└── README.md
```
