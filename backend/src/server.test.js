import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  __resetOpenFinanceStore,
  app,
  classifyTerm,
  decryptToken,
  encryptToken
} from './server.js';
import { createConnection, createConsent, updateConnection, __resetOpenFinanceStore as __resetStoreInternal } from './openfinance/store.js';
import { resolveStateFile } from './persistence/local-store.js';

async function withServer(run) {
  const server = app.listen(0);
  const port = await new Promise((resolve) => server.on('listening', () => resolve(server.address().port)));
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

test('classifyTerm classifica short/medium/long corretamente', () => {
  const now = new Date();
  const endYear = `${now.getUTCFullYear()}-12-31`;
  const mediumDate = `${now.getUTCFullYear() + 1}-06-15`;
  const longDate = `${now.getUTCFullYear() + 3}-01-10`;

  assert.equal(classifyTerm(endYear), 'short');
  assert.equal(classifyTerm(mediumDate), 'medium');
  assert.equal(classifyTerm(longDate), 'long');
});

test('criptografia e decriptação de token funciona com AES-GCM', () => {
  const key = 'my-super-secret-key';
  const value = 'access-token-sensitive';
  const enc = encryptToken(value, key);
  const dec = decryptToken(enc, key);
  assert.equal(dec, value);
  assert.notEqual(enc, value);
});

test('callback rejeita state inválido (CSRF/state validation)', async () => {
  await withServer(async (baseUrl) => {
    __resetOpenFinanceStore();
    const response = await fetch(`${baseUrl}/api/banks/callback?code=fake&state=invalid`);
    assert.equal(response.status, 400);
  });
});

test('idempotência de transações sincronizadas por account_id + external_tx_id', async () => {
  await withServer(async (baseUrl) => {
    __resetOpenFinanceStore();

    const connect = await fetch(`${baseUrl}/api/banks/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institution: 'BB', scopes: ['accounts', 'transactions'] })
    });
    const connectData = await connect.json();
    const redirectUrl = connectData.redirectUrl;

    const callbackUrl = new URL(redirectUrl);
    const callbackResponse = await fetch(callbackUrl.toString());
    const callbackData = await callbackResponse.json();

    assert.equal(callbackResponse.status, 200);

    const sync1 = await fetch(`${baseUrl}/api/banks/${callbackData.connectionId}/sync`, { method: 'POST' });
    assert.equal(sync1.status, 200);

    await new Promise((r) => setTimeout(r, 5500));
    const sync2 = await fetch(`${baseUrl}/api/banks/${callbackData.connectionId}/sync`, { method: 'POST' });
    assert.equal(sync2.status, 200);

    const accountsRes = await fetch(`${baseUrl}/api/banks/accounts`);
    const accountsData = await accountsRes.json();
    const acc = accountsData.accounts[0];

    const txRes = await fetch(`${baseUrl}/api/banks/accounts/${acc.id}/transactions`);
    const txData = await txRes.json();

    const uniqueKeys = new Set(txData.transactions.map((x) => `${x.account_id}:${x.external_tx_id}`));
    assert.equal(uniqueKeys.size, txData.transactions.length);
  });
});

test('integração mock AISP: connect -> callback -> sync -> list transactions', async () => {
  await withServer(async (baseUrl) => {
    __resetOpenFinanceStore();

    const connect = await fetch(`${baseUrl}/api/banks/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institution: 'ITAU', scopes: ['accounts', 'transactions'], days: 30 })
    });
    assert.equal(connect.status, 200);
    const connectData = await connect.json();

    const callbackRes = await fetch(connectData.redirectUrl);
    assert.equal(callbackRes.status, 200);
    const callbackData = await callbackRes.json();

    const syncRes = await fetch(`${baseUrl}/api/banks/${callbackData.connectionId}/sync`, { method: 'POST' });
    assert.equal(syncRes.status, 200);

    const accountsRes = await fetch(`${baseUrl}/api/banks/accounts`);
    const accountsData = await accountsRes.json();
    assert.ok(accountsData.accounts.length > 0);

    const txRes = await fetch(`${baseUrl}/api/banks/accounts/${accountsData.accounts[0].id}/transactions`);
    const txData = await txRes.json();
    assert.ok(txData.transactions.length > 0);
  });
});


test('aceita conexão com banco BRADESCO', async () => {
  await withServer(async (baseUrl) => {
    __resetOpenFinanceStore();
    const response = await fetch(`${baseUrl}/api/banks/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institution: 'BRADESCO', scopes: ['accounts', 'transactions'] })
    });

    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(data.redirectUrl.includes('/api/banks/callback?code='));
  });
});


test('retorna plano de recuperação financeira com ações por prazo', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/recovery/plan?member=all`);
    assert.equal(response.status, 200);
    const data = await response.json();

    assert.ok(typeof data.severity === 'number');
    assert.ok(data.severityLabel);
    assert.ok(Array.isArray(data.horizons.short));
    assert.ok(Array.isArray(data.horizons.medium));
    assert.ok(Array.isArray(data.horizons.long));
    assert.ok(data.nextBestAction?.title);
  });
});


test('lista instituições bancárias do app para conexão', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/banks/institutions`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(Array.isArray(data.institutions));
    assert.ok(data.institutions.some((item) => item.key === 'BB'));
    assert.ok(data.institutions.some((item) => item.key === 'ITAU'));
  });
});

test('connect aceita institution_key para instituições do app', async () => {
  await withServer(async (baseUrl) => {
    __resetOpenFinanceStore();
    const response = await fetch(`${baseUrl}/api/banks/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institution_key: 'SANTANDER', scopes: ['accounts', 'transactions'] })
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(data.status === 'PENDING' || data.status === 'UNSUPPORTED');
  });
});


test('sync bloqueia conexão ACTIVE sem itemId (não autorizada)', async () => {
  await withServer(async (baseUrl) => {
    __resetOpenFinanceStore();
    __resetStoreInternal();

    const conn = createConnection({
      user_id: 'demo-user',
      institution: 'Banco do Brasil',
      institution_key: 'BB',
      status: 'active',
      provider: 'pluggy',
      connector_id: 'pluggy-bb'
    });

    createConsent({
      connection_id: conn.id,
      consent_id_externo: 'item-123',
      scopes: ['accounts', 'transactions'],
      granted_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      status: 'active'
    });

    updateConnection(conn.id, { status: 'active', item_id: null });

    const response = await fetch(`${baseUrl}/api/banks/${conn.id}/sync`, { method: 'POST' });
    assert.equal(response.status, 400);
    const data = await response.json();
    assert.match(data.message, /Conexão não autorizada/i);
  });
});

test('sync retorna resumo com contagem importada', async () => {
  await withServer(async (baseUrl) => {
    __resetOpenFinanceStore();

    const connect = await fetch(`${baseUrl}/api/banks/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institution_key: 'BB', scopes: ['accounts', 'transactions'] })
    });
    const connectData = await connect.json();
    const callbackRes = await fetch(connectData.redirectUrl);
    const callbackData = await callbackRes.json();

    await new Promise((r) => setTimeout(r, 5500));
    const syncRes = await fetch(`${baseUrl}/api/banks/${callbackData.connectionId}/sync`, { method: 'POST' });
    assert.equal(syncRes.status, 200);
    const syncData = await syncRes.json();

    assert.ok(typeof syncData.accountsImported === 'number');
    assert.ok(typeof syncData.transactionsImported === 'number');
    assert.ok(syncData.from);
    assert.ok(syncData.to);
  });
});


test('import commit persiste transações importadas e associa ao membro correto', async () => {
  await withServer(async (baseUrl) => {
    await fetch(`${baseUrl}/api/transactions/seed`, { method: 'POST' });

    const response = await fetch(`${baseUrl}/api/imports/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'extrato.csv',
        content: 'Data lançamento;Histórico;Valor movimentado;Débito/Crédito\n18/04/2026;Mercado bairro;125,45;Débito',
        importType: 'transaction',
        memberId: 'wife',
        month: '2026-04'
      })
    });

    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.importedRows, 1);
    assert.deepEqual(data.importedMonths, ['2026-04']);

    const txRes = await fetch(`${baseUrl}/api/transactions?member=wife&month=2026-04&from=2026-04-01&to=2026-04-30`);
    const txData = await txRes.json();
    assert.equal(txData.transactions.length, 1);
    assert.equal(txData.transactions[0].memberId, 'wife');
    assert.equal(txData.transactions[0].description, 'Mercado bairro');
    assert.equal(txData.transactions[0].amount, 125.45);

    const historyRes = await fetch(`${baseUrl}/api/imports/history`);
    const historyData = await historyRes.json();
    assert.equal(historyData.imports[0].memberId, 'wife');
    assert.deepEqual(historyData.imports[0].importedMonths, ['2026-04']);

    const persisted = JSON.parse(fs.readFileSync(resolveStateFile(), 'utf8'));
    assert.ok(persisted.transactions.some((item) => item.description === 'Mercado bairro' && item.memberId === 'wife'));
  });
});

test('import commit rejeita payload sem conteúdo', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/imports/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: 'extrato.csv', importType: 'transaction', memberId: 'wife', month: '2026-04' })
    });

    assert.equal(response.status, 400);
    const data = await response.json();
    assert.match(data.message, /conteúdo/i);
  });
});

test('import commit persiste histórico e permite futura validação via repository', async () => {
  await withServer(async (baseUrl) => {
    await fetch(`${baseUrl}/api/transactions/seed`, { method: 'POST' });

    await fetch(`${baseUrl}/api/imports/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'extrato.csv',
        content: 'data,descricao,valor\n2026-05-02,Freelance,900.00',
        importType: 'income',
        memberId: 'husband',
        month: '2026-05'
      })
    });

    const persisted = JSON.parse(fs.readFileSync(resolveStateFile(), 'utf8'));
    assert.ok(Array.isArray(persisted.importHistory));
    assert.equal(persisted.importHistory[0].memberId, 'husband');
    assert.deepEqual(persisted.importHistory[0].importedMonths, ['2026-05']);
  });
});

test('import commit bloqueia reprocessamento do mesmo arquivo', async () => {
  await withServer(async (baseUrl) => {
    await fetch(`${baseUrl}/api/transactions/seed`, { method: 'POST' });

    const payload = {
      fileName: 'extrato.csv',
      content: 'Data lançamento;Histórico;Valor movimentado;Débito/Crédito\n18/04/2026;Mercado bairro;125,45;Débito',
      importType: 'transaction',
      memberId: 'wife',
      month: '2026-04',
      accountLabel: 'Conta BB teste'
    };

    const first = await fetch(`${baseUrl}/api/imports/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(first.status, 200);

    const second = await fetch(`${baseUrl}/api/imports/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(second.status, 409);
    const secondData = await second.json();
    assert.match(secondData.message, /já foi processado/i);
  });
});

test('limpar histórico remove apenas o histórico visual e preserva deduplicação', async () => {
  await withServer(async (baseUrl) => {
    await fetch(`${baseUrl}/api/transactions/seed`, { method: 'POST' });

    const payload = {
      fileName: 'extrato.csv',
      content: 'data,descricao,valor\n2026-05-02,Freelance,900.00',
      importType: 'income',
      memberId: 'husband',
      month: '2026-05'
    };

    await fetch(`${baseUrl}/api/imports/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const clearRes = await fetch(`${baseUrl}/api/imports/history`, { method: 'DELETE' });
    assert.equal(clearRes.status, 200);

    const historyRes = await fetch(`${baseUrl}/api/imports/history`);
    const historyData = await historyRes.json();
    assert.equal(historyData.imports.length, 0);

    const duplicateRes = await fetch(`${baseUrl}/api/imports/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(duplicateRes.status, 409);
  });
});

test('limpar histórico e dados importados remove transações importadas e libera nova importação', async () => {
  await withServer(async (baseUrl) => {
    await fetch(`${baseUrl}/api/transactions/seed`, { method: 'POST' });

    const payload = {
      fileName: 'extrato.csv',
      content: 'data,descricao,valor\n2026-05-02,Freelance,900.00',
      importType: 'income',
      memberId: 'husband',
      month: '2026-05'
    };

    await fetch(`${baseUrl}/api/imports/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const clearRes = await fetch(`${baseUrl}/api/imports/history-and-data`, { method: 'DELETE' });
    assert.equal(clearRes.status, 200);

    const txRes = await fetch(`${baseUrl}/api/transactions?member=husband&month=2026-05&from=2026-05-01&to=2026-05-31`);
    const txData = await txRes.json();
    assert.equal(txData.transactions.length, 0);

    const retryRes = await fetch(`${baseUrl}/api/imports/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(retryRes.status, 200);
  });
});
