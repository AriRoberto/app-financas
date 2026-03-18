import { filterFinancialTransactions } from './aggregation-service.js';

function sumByType(items) {
  return items.reduce((acc, item) => {
    if (item.type === 'income') acc.income += item.amount;
    if (item.type === 'expense') acc.expenses += item.amount;
    if (item.type === 'investment') acc.investments += item.amount;
    acc.balance = acc.income - acc.expenses - acc.investments;
    return acc;
  }, { income: 0, expenses: 0, investments: 0, balance: 0 });
}

function topCategories(items, limit = 3) {
  const grouped = new Map();
  for (const item of items) {
    const key = `${item.type}:${item.category}`;
    const current = grouped.get(key) || { label: item.category, type: item.type, amount: 0, transactionCount: 0 };
    current.amount += item.amount;
    current.transactionCount += 1;
    grouped.set(key, current);
  }
  return [...grouped.values()].sort((a, b) => b.amount - a.amount).slice(0, limit);
}

function largestTransactions(items, limit = 5) {
  return [...items].sort((a, b) => b.amount - a.amount).slice(0, limit);
}

function summarizeDimension(items, keyFn, labelFn) {
  const grouped = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        label: labelFn(item),
        transactionCount: 0,
        ...sumByType([]),
        topCategories: [],
        largestTransactions: []
      });
    }
    const bucket = grouped.get(key);
    bucket.transactionCount += 1;
    if (item.type === 'income') bucket.income += item.amount;
    if (item.type === 'expense') bucket.expenses += item.amount;
    if (item.type === 'investment') bucket.investments += item.amount;
    bucket.balance = bucket.income - bucket.expenses - bucket.investments;
  }

  return [...grouped.values()].map((bucket) => {
    const sourceItems = items.filter((item) => keyFn(item) === bucket.id);
    return {
      ...bucket,
      topCategories: topCategories(sourceItems),
      largestTransactions: largestTransactions(sourceItems)
    };
  }).sort((a, b) => b.expenses - a.expenses || b.transactionCount - a.transactionCount);
}

export function buildConsolidatedAnalysis({ transactions, filters, members }) {
  const filtered = filterFinancialTransactions(transactions, filters);
  const totals = sumByType(filtered);
  const byMember = summarizeDimension(filtered, (item) => item.memberId, (item) => members.find((member) => member.id === item.memberId)?.name || item.memberId);
  const byFile = summarizeDimension(filtered, (item) => item.sourceFileName || 'manual-entry', (item) => item.sourceFileName || 'Lançamentos manuais');
  const byPeriod = summarizeDimension(filtered, (item) => item.month, (item) => item.month);

  return {
    totals: {
      ...totals,
      transactionCount: filtered.length,
      files: [...new Set(filtered.map((item) => item.sourceFileName).filter(Boolean))]
    },
    byMember,
    byFile,
    byPeriod,
    topCategories: topCategories(filtered, 8),
    largestExpenses: largestTransactions(filtered.filter((item) => item.type === 'expense'), 8),
    sourceBreakdown: [...new Set(filtered.map((item) => item.sourceFileName || 'manual-entry'))].map((source) => ({
      source,
      transactionCount: filtered.filter((item) => (item.sourceFileName || 'manual-entry') === source).length
    }))
  };
}
