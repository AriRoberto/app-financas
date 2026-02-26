# Como rodar o app localmente

Este projeto foi estruturado em duas aplicações:
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

A API ficará disponível em:
- `http://localhost:3333/api/health`
- `http://localhost:3333/api/dashboard`
- `http://localhost:3333/api/suggestions`

## 3) Rodar o frontend

No terminal 2:
```bash
cd frontend
npm run dev
```

Abra no navegador:
- `http://localhost:5173`

## 4) Configuração opcional de API

Por padrão, o frontend consome `http://localhost:3333`.
Se precisar alterar, rode com variável:

```bash
VITE_API_URL=http://localhost:3333 npm run dev
```

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
