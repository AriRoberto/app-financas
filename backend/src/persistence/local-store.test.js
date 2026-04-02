import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-financas-store-'));
const stateFile = path.join(tempDir, 'finance-state.json');
process.env.APP_FINANCAS_DATA_FILE = stateFile;

const { loadFinanceState, saveFinanceState, resetFinanceState } = await import('./local-store.js');

test('loadFinanceState cria arquivo inicial com fallback', () => {
  const fallback = { transactions: [{ id: 't1' }], importHistory: [{ id: 'i1' }] };
  const state = loadFinanceState(fallback);

  assert.equal(fs.existsSync(stateFile), true);
  assert.deepEqual(state, fallback);
});

test('saveFinanceState persiste transações e histórico de importação', () => {
  saveFinanceState({
    transactions: [{ id: 'persisted-1', amount: 100 }],
    importHistory: [{ id: 'import-1', importedRows: 1 }]
  });

  const raw = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  assert.equal(raw.transactions[0].id, 'persisted-1');
  assert.equal(raw.importHistory[0].id, 'import-1');
});

test('resetFinanceState restaura o snapshot informado', () => {
  const fallback = { transactions: [{ id: 'reset-1' }], importHistory: [] };
  const state = resetFinanceState(fallback);

  assert.deepEqual(state, fallback);
  const raw = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  assert.equal(raw.transactions[0].id, 'reset-1');
});
