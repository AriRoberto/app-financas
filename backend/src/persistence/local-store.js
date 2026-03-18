import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FinanceRepository, normalizeFinanceSnapshot } from './finance-repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_STATE_FILE = path.resolve(__dirname, '../../data/finance-state.json');

export function resolveStateFile() {
  return process.env.APP_FINANCAS_DATA_FILE || DEFAULT_STATE_FILE;
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export class JsonFinanceRepository extends FinanceRepository {
  constructor({ stateFile = resolveStateFile() } = {}) {
    super();
    this.stateFile = stateFile;
  }

  describe() {
    return {
      kind: 'json-file',
      stateFile: this.stateFile,
      swapStrategy: 'Substitua esta classe por outro adapter que implemente a mesma interface FinanceRepository.'
    };
  }

  loadSnapshot(fallback = { transactions: [], importHistory: [] }) {
    ensureDirectory(this.stateFile);

    if (!fs.existsSync(this.stateFile)) {
      const initialState = normalizeFinanceSnapshot(fallback, fallback);
      fs.writeFileSync(this.stateFile, `${JSON.stringify(initialState, null, 2)}\n`, 'utf8');
      console.info('[finance-store] initialized state file', { stateFile: this.stateFile, transactions: initialState.transactions.length });
      return initialState;
    }

    try {
      const raw = fs.readFileSync(this.stateFile, 'utf8');
      const parsed = raw.trim() ? JSON.parse(raw) : {};
      const normalized = normalizeFinanceSnapshot(parsed, fallback);
      console.info('[finance-store] loaded state', {
        stateFile: this.stateFile,
        transactions: normalized.transactions.length,
        importHistory: normalized.importHistory.length
      });
      return normalized;
    } catch (error) {
      console.warn('[finance-store] failed to read state file, using fallback', {
        stateFile: this.stateFile,
        message: error?.message
      });
      return normalizeFinanceSnapshot({}, fallback);
    }
  }

  saveSnapshot(nextState) {
    ensureDirectory(this.stateFile);
    const normalized = normalizeFinanceSnapshot(nextState, { transactions: [], importHistory: [] });
    fs.writeFileSync(this.stateFile, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
    console.info('[finance-store] persisted state', {
      stateFile: this.stateFile,
      transactions: normalized.transactions.length,
      importHistory: normalized.importHistory.length
    });
  }

  resetSnapshot(fallback = { transactions: [], importHistory: [] }) {
    this.saveSnapshot(fallback);
    return normalizeFinanceSnapshot(fallback, fallback);
  }
}

export function createJsonFinanceRepository(options = {}) {
  return new JsonFinanceRepository(options);
}

export function loadFinanceState(fallback = { transactions: [], importHistory: [] }) {
  return createJsonFinanceRepository().loadSnapshot(fallback);
}

export function saveFinanceState(nextState) {
  return createJsonFinanceRepository().saveSnapshot(nextState);
}

export function resetFinanceState(fallback = { transactions: [], importHistory: [] }) {
  return createJsonFinanceRepository().resetSnapshot(fallback);
}
