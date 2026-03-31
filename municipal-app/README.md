# CidadeAtende - MVP executável

Este diretório contém um **MVP funcional** do Aplicativo Municipal de Serviços com:
- cadastro de cidadão (nome, CPF, e-mail);
- abertura de solicitação nas 4 categorias obrigatórias;
- protocolo automático;
- acompanhamento de status (`RECEBIDO`, `EM_ANALISE`, `EM_EXECUCAO`, `CONCLUIDO`);
- endpoint administrativo para atualização de status.

## Estrutura
- `backend/`: API Node.js + Express com persistência em arquivo JSON.
- `frontend/`: interface HTML/JS simples servida pelo backend.

## Como rodar
```bash
cd municipal-app/backend
npm install
npm run dev
```

Acesse em: `http://localhost:3334`

## Endpoints principais
- `POST /api/auth/register`
- `POST /api/requests`
- `GET /api/requests?userId=<id>`
- `PATCH /api/admin/requests/:id/status`
- `GET /api/meta`
- `GET /api/health`

## Exemplo para atualizar status via cURL
```bash
curl -X PATCH http://localhost:3334/api/admin/requests/<REQUEST_ID>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"EM_EXECUCAO","observacao":"Equipe deslocada"}'
```
