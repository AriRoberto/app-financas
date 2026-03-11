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


## Open Finance real (Pluggy / My Pluggy)
- `OPEN_FINANCE_MOCK=true` mantém o mock local atual.
- `OPEN_FINANCE_MOCK=false` ativa integração real com Pluggy usando consentimento (sem scraping e sem senha bancária no app).
- Fluxo real:
  1. backend gera API Key Pluggy com `AISP_CLIENT_ID` + `AISP_CLIENT_SECRET`;
  2. backend cria `connectToken` em `POST /connect_token`;
  3. frontend abre Pluggy Connect Widget;
  4. sucesso do widget finaliza em `GET /api/banks/callback?state&itemId`;
  5. sync traz contas e transações.
- Nota produção: `AISP_REDIRECT_URI` deve ser HTTPS.

### Credenciais My Pluggy
1. Criar conta em My Pluggy.
2. Criar aplicação e copiar `clientId`/`clientSecret`.
3. Configurar `.env`:
   - `OPEN_FINANCE_MOCK=false`
   - `AISP_CLIENT_ID=<clientId>`
   - `AISP_CLIENT_SECRET=<clientSecret>`
   - `AISP_REDIRECT_URI=https://seu-dominio/api/banks/callback`

### Instituições do app e resolução no Pluggy
Source of truth do app:
- BB, ITAU, CEF, SANTANDER, NUBANK, BRADESCO.

O backend tenta resolver automaticamente `institution_key -> connectorId` no Pluggy com heurística por nome/tags e cache local.
Quando não encontrar conector equivalente, a conexão fica com status `UNSUPPORTED`, sem quebrar UI.


### Troubleshooting conexão real
- Se `/api/banks/:connectionId/sync` retornar `Conexão não autorizada`, finalize o Pluggy Connect até receber `itemId` no callback.
- A conexão só fica `ACTIVE` após callback válido com `state` + `itemId`.
- Endpoints de leitura (`/api/dashboard`, `/api/transactions`, etc.) usam `Cache-Control: no-store` para evitar respostas 304 desatualizadas no navegador.
