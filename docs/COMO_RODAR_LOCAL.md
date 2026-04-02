# Como rodar o app localmente

## Pré-requisitos
- Node.js 20+
- npm 10+

## Configuração
1. Copie `.env.example` para `.env`.
2. Preencha credenciais do agregador AISP.
3. Em desenvolvimento, você pode manter `OPEN_FINANCE_MOCK=true` para usar o mock interno.

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

## Open Finance (mock local)
1. Na tela, escolha Banco do Brasil, Itaú, Caixa (CEF), Santander, Nubank ou Bradesco.
2. Clique em **Conectar Banco**.
3. O app faz consentimento + callback + sync inicial automaticamente via mock AISP.
4. Use **Sincronizar** para sync manual e **Revogar** para encerrar consentimento e limpar tokens.

## Uso rápido de finanças
1. Selecione o membro no filtro global: `all`, `marido`, `esposa` ou `familia`.
2. Ajuste período (mês, 3 meses, ano, custom) e prazo (`short`, `medium`, `long`).
3. Cadastre despesas/receitas/investimentos no formulário.
4. Para reserva para investir:
   - marque o checkbox **Reserva para investir** ou use categoria `Reserva para investir`;
   - a saída conta em despesas e também aparece em `/api/investments`.
5. Use **Trazer dados de teste** para repor a massa de demonstração.
6. Use **Limpar dados de teste** para zerar todos os lançamentos do ambiente atual.

## Testes backend
```bash
cd backend
npm test
```


## Pluggy real (sem mock)
1. Defina `OPEN_FINANCE_MOCK=false` no `.env`.
2. Configure `AISP_CLIENT_ID` e `AISP_CLIENT_SECRET` do My Pluggy.
3. Mantenha `AISP_REDIRECT_URI` apontando para callback do backend (HTTPS em produção).
4. No frontend, o botão **Conectar Banco** abre o Pluggy Connect usando `connectToken`.
5. Se um banco não tiver conector no Pluggy, status será `UNSUPPORTED` (sem quebrar a tela).


## Configuração de ambiente (resumo rápido)
Use `backend/.env` (não versionado) com base em `backend/.env.example`.

### MOCK
```env
OPEN_FINANCE_MOCK=true
AISP_BASE_URL=http://localhost:3333/mock-aisp
AISP_CLIENT_ID=mock
AISP_CLIENT_SECRET=mock
AISP_REDIRECT_URI=http://localhost:3333/api/banks/callback
TOKEN_ENCRYPTION_KEY=change-me-32bytes-minimum-secret-key
SYNC_DEFAULT_DAYS=90
```

### REAL (Pluggy)
```env
OPEN_FINANCE_MOCK=false
AISP_BASE_URL=https://api.pluggy.ai
AISP_CLIENT_ID=SEU_CLIENT_ID_REAL
AISP_CLIENT_SECRET=SEU_CLIENT_SECRET_REAL
AISP_REDIRECT_URI=http://localhost:3333/api/banks/callback
TOKEN_ENCRYPTION_KEY=uma-chave-forte-com-32-bytes-ou-mais
SYNC_DEFAULT_DAYS=90
```


## Passo a passo: importação manual de CSV
1. Abra a área **Importação manual de arquivos** na tela principal.
2. Selecione o membro da família que receberá os lançamentos.
3. Selecione o tipo de dado (`Transações / movimentações`, `Receitas`, `Despesas` ou `Investimentos`).
4. Escolha um arquivo CSV/JSON ou cole o conteúdo manualmente.
5. Clique em **Pré-visualizar importação**.
6. Revise as linhas interpretadas, tipos, categorias, descrições, valores e possíveis duplicidades.
7. Clique em **Confirmar importação**.
8. Após a confirmação, o app mostra mensagem com quantidade importada e recarrega dashboard, totais, listagens e histórico de importações.

## Como funciona a sincronização com o backend
1. O frontend lê o arquivo via `File.text()` ou usa o conteúdo colado.
2. O frontend monta um payload com `fileName`, `content`, `memberId`, `importType` e `month`.
3. Esse payload é enviado para `POST /api/imports/preview` para validação e interpretação inicial.
4. Depois da confirmação, o mesmo conteúdo vai para `POST /api/imports/commit`.
5. O backend valida o membro, o conteúdo, o formato e o mapeamento dos campos.
6. O backend persiste o snapshot financeiro em `backend/data/finance-state.json`.
7. Em seguida, o frontend consulta novamente `/api/dashboard`, `/api/transactions`, `/api/investments` e `/api/imports/history`.
8. A interface atualiza cards, totais por membro, listagens e resumos com base nos dados persistidos.

## Como confirmar que os dados ficaram salvos
1. Verifique os cards de receita/despesa/investimento logo após importar.
2. Verifique os cartões por membro da família.
3. Verifique a tabela/lista de lançamentos no período/mês correspondente ao CSV importado.
4. Verifique a seção **Últimas importações**.
5. Recarregue a página e confirme que os dados continuam visíveis.
6. Reinicie backend e frontend e confirme que os dados continuam sendo carregados do arquivo `backend/data/finance-state.json`.

## Como debugar se algo der errado
1. Abra o console do navegador e procure logs com o prefixo `[imports]`.
2. Abra a aba **Network** e confira as chamadas para:
   - `POST /api/imports/preview`
   - `POST /api/imports/commit`
   - `GET /api/dashboard`
   - `GET /api/transactions`
   - `GET /api/imports/history`
3. No backend, confira os logs `[imports]` e `[finance-store]` para saber se houve preview, commit e persistência.
4. Inspecione a resposta do endpoint de importação para conferir `importedRows`, `duplicateRows` e `importedMonths`.
5. Verifique se o arquivo `backend/data/finance-state.json` recebeu os registros persistidos.
6. Se os dados não aparecerem, confirme se o filtro de período/mês selecionado corresponde ao mês importado.


## Persistência atual e futura troca para banco relacional
- Hoje o app usa `FinanceRepository` como contrato de persistência.
- O adapter ativo é `JsonFinanceRepository`, que grava em `backend/data/finance-state.json`.
- Para migrar para PostgreSQL/MySQL/etc., crie um novo adapter com os mesmos métodos (`loadSnapshot`, `saveSnapshot`, `resetSnapshot`, `describe`) e troque a factory do servidor.
- O restante do fluxo de importação e dashboard pode permanecer inalterado.

## Testes de integração do endpoint `/api/imports/commit`
- Execute:
  ```bash
  cd backend
  npm test
  ```
- Os testes cobrem:
  - sucesso do commit
  - falha por payload inválido
  - associação ao membro correto
  - persistência do histórico e do snapshot local
- Limitação atual: o ambiente continua usando shims locais de `express`/`cors` para executar os testes sem instalar dependências externas.

## Histórico de importações na UI
- O bloco **Últimas importações** agora mostra:
  - nome do arquivo
  - mês(es) efetivamente importado(s)
  - quantidade importada
  - quantidade duplicada
  - membro associado

## Feedback visual por etapa
- A UI agora exibe etapas da importação:
  - arquivo selecionado
  - arquivo lido
  - pré-visualização gerada
  - envio ao backend
  - persistência concluída
  - interface atualizada
- Também existem toasts/snackbars para sucesso, erro, aviso e informação.

## Docker: subir, rebuildar, parar e persistir dados
### Subir tudo
```bash
docker compose up --build
```

### Parar o ambiente
```bash
docker compose down
```

### Rebuild completo
```bash
docker compose build --no-cache
```

### Persistência local no modo containerizado
- O snapshot continua em `backend/data/finance-state.json`.
- No compose, o volume `./backend/data:/app/data` preserva os dados entre reinícios dos containers.

### Debug básico em containers
- Logs do backend:
  ```bash
  docker compose logs -f backend
  ```
- Logs do frontend:
  ```bash
  docker compose logs -f frontend
  ```


## Importação multi-banco (BB + Itaú)

A camada de importação agora usa uma arquitetura extensível baseada em:

- `backend/src/importers/`
- `backend/src/normalizers/`
- `backend/src/services/import-service.js`
- `backend/src/services/aggregation-service.js`

### Contrato esperado do Banco do Brasil (BB)

Layouts suportados incluem colunas equivalentes a:

- `Data`
- `Lançamento`
- `Detalhes`
- `Valor`
- `Tipo Lançamento`

Observações:

- o parser aceita cabeçalhos entre aspas,
- aceita quebra de linha dentro de cabeçalhos/colunas,
- ignora linhas de saldo como `Saldo Anterior`/`Saldo Final` quando o valor é `0,00`.

### Contrato esperado do Itaú

Layouts suportados incluem colunas equivalentes a:

- `Data`
- `Descrição lançamento`
- `Valor R$`
- `Tipo`
- `Agência`
- `Conta corrente`

Observações:

- `Entrada` é normalizado como receita,
- `Saída` é normalizado como despesa,
- agência + conta são usadas para compor a conta no modelo interno quando não houver hint manual.

### Modelo interno após importação

Cada transação importada é persistida com metadados como:

- `memberId`
- `bankKey` / `bankName`
- `accountId` / `accountLabel`
- `type`
- `category`
- `description`
- `amount`
- `date`
- `month`
- `sourceFileName`
- `importOrigin`
- `referencePeriod`

Isso permite dashboards por banco, conta e membro, além de futura migração para persistência relacional sem refazer a regra de importação.
