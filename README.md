# App de Finanças Pessoal e Familiar

Projeto full-stack para controlar receitas e despesas familiares com foco em:
- multi-membro (`marido`, `esposa`, `familia` + filtro `all`);
- projeções de saídas;
- relatórios por categoria e prazo;
- reserva para investir com espelhamento automático em investimentos;
- conexão bancária via **Open Finance + AISP** (consentimento explícito, sem scraping).

## Funcionalidades atuais
- Cadastro de lançamentos com: membro, tipo (`despesa`, `investimento`, `receita`), categoria, descrição (modelo + digitação livre), valor, mês, data e vencimento.
- Filtro global por membro (`husband|wife|family|all`), período e prazo (`short|medium|long`).
- Dashboard com receita total, despesas, investimento espelhado, totais por membro e histórico mensal.
- Botões no formulário para **Limpar dados de teste** e **Trazer dados de teste** rapidamente.
- Quadro de categorias + gráfico de pizza por categoria selecionada (despesas, receitas e investimentos).
- Conexão bancária com botão **Conectar Banco**, consentimento Open Finance, sincronização manual e revogação.
- Instituições disponíveis no fluxo AISP: BB, ITAU, CEF, SANTANDER, NUBANK e BRADESCO.

- Módulo de **Plano de recuperação financeira** com diagnóstico de severidade e ações por curto/médio/longo prazo na interface.
- Especificação funcional do módulo de recuperação financeira em `docs/ESPEC_RECUPERACAO_FINANCEIRA.md`.

## Open Finance (fluxo)
1. `POST /api/banks/connect` inicia consentimento no AISP e retorna `redirectUrl`.
2. Callback `GET /api/banks/callback?code&state` valida state/CSRF e troca code por token.
3. Sincronização inicial de contas/transações e persistência normalizada.
4. Usuário pode sincronizar manualmente (`POST /api/banks/{connectionId}/sync`) e revogar (`POST /api/banks/{connectionId}/revoke`).

## LGPD e segurança
- Base legal: consentimento explícito com escopos e timestamps.
- Minimização: guarda apenas campos necessários de conta/transação.
- Criptografia de tokens em repouso (AES-GCM) com `TOKEN_ENCRYPTION_KEY`.
- Sem logs de `code`, `access_token`, `refresh_token` ou payload sensível.
- Revogação encerra consentimento, para sync e remove tokens.
- Utilitários de retenção: purge de tokens expirados e logs antigos.

## Endpoints principais
- Financeiro:
  - `GET /api/dashboard?member=&month=&from=&to=&term=`
  - `GET /api/transactions?member=&month=&from=&to=&term=`
  - `POST /api/transactions`
  - `GET /api/investments?member=&from=&to=`
- Open Finance / AISP:
  - `POST /api/banks/connect`
  - `GET /api/banks/callback`
  - `GET /api/banks/connections`
  - `POST /api/banks/{connectionId}/sync`
  - `POST /api/banks/{connectionId}/revoke`
  - `GET /api/banks/accounts`
  - `GET /api/banks/accounts/{id}/transactions?from=&to=`

## Configuração segura
Use `.env.example` e configure no ambiente:
- `AISP_BASE_URL`
- `AISP_CLIENT_ID`
- `AISP_CLIENT_SECRET`
- `AISP_REDIRECT_URI`
- `AISP_WEBHOOK_SECRET`
- `TOKEN_ENCRYPTION_KEY`
- `SYNC_DEFAULT_DAYS`

## Banco e migrações
- `backend/migrations/001_members_and_transactions.sql`
- `backend/migrations/002_investments.sql`
- `backend/migrations/003_open_finance_connections.sql`

## Como rodar
Veja `docs/COMO_RODAR_LOCAL.md`.
