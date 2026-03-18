export class FinanceRepository {
  loadSnapshot(_fallback = { transactions: [], importHistory: [] }) {
    throw new Error('Método loadSnapshot não implementado.');
  }

  saveSnapshot(_nextState) {
    throw new Error('Método saveSnapshot não implementado.');
  }

  resetSnapshot(fallback = { transactions: [], importHistory: [] }) {
    this.saveSnapshot(fallback);
    return this.loadSnapshot(fallback);
  }

  describe() {
    return { kind: 'unknown' };
  }
}

export function normalizeFinanceSnapshot(parsed, fallback) {
  return {
    transactions: Array.isArray(parsed?.transactions) ? parsed.transactions : fallback.transactions,
    importHistory: Array.isArray(parsed?.importHistory) ? parsed.importHistory : fallback.importHistory
  };
}
