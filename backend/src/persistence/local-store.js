import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_STATE_FILE = path.resolve(__dirname, '../../data/finance-state.json');

function resolveStateFile() {
  return process.env.APP_FINANCAS_DATA_FILE || DEFAULT_STATE_FILE;
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function normalizeState(parsed, fallback) {
  return {
    transactions: Array.isArray(parsed?.transactions) ? parsed.transactions : fallback.transactions,
    importHistory: Array.isArray(parsed?.importHistory) ? parsed.importHistory : fallback.importHistory
  };
}

export function loadFinanceState(fallback = { transactions: [], importHistory: [] }) {
  const stateFile = resolveStateFile();
  ensureDirectory(stateFile);

  if (!fs.existsSync(stateFile)) {
    const initialState = normalizeState(fallback, fallback);
    fs.writeFileSync(stateFile, `${JSON.stringify(initialState, null, 2)}\n`, 'utf8');
    console.info('[finance-store] initialized state file', { stateFile, transactions: initialState.transactions.length });
    return initialState;
  }

  try {
    const raw = fs.readFileSync(stateFile, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    const normalized = normalizeState(parsed, fallback);
    console.info('[finance-store] loaded state', {
      stateFile,
      transactions: normalized.transactions.length,
      importHistory: normalized.importHistory.length
    });
    return normalized;
  } catch (error) {
    console.warn('[finance-store] failed to read state file, using fallback', {
      stateFile,
      message: error?.message
    });
    return normalizeState({}, fallback);
  }
}

export function saveFinanceState(nextState) {
  const stateFile = resolveStateFile();
  ensureDirectory(stateFile);
  const normalized = normalizeState(nextState, { transactions: [], importHistory: [] });
  fs.writeFileSync(stateFile, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  console.info('[finance-store] persisted state', {
    stateFile,
    transactions: normalized.transactions.length,
    importHistory: normalized.importHistory.length
  });
}

export function resetFinanceState(fallback = { transactions: [], importHistory: [] }) {
  saveFinanceState(fallback);
  return normalizeState(fallback, fallback);
}
