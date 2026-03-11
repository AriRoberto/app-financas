import test from 'node:test';
import assert from 'node:assert/strict';
import {
  __resetOpenFinanceStore,
  app,
  classifyTerm,
  decryptToken,
  encryptToken
} from './server.js';

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
