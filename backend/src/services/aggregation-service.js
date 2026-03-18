function matchesDate(item, from, to) {
  const target = new Date(`${item.date}T00:00:00Z`);
  if (from && target < new Date(`${from}T00:00:00Z`)) return false;
  if (to && target > new Date(`${to}T00:00:00Z`)) return false;
  return true;
}

export function filterFinancialTransactions(transactions, filters = {}) {
  return transactions.filter((item) => {
    if (filters.month && item.month !== filters.month) return false;
    if (filters.member && filters.member !== 'all' && item.memberId !== filters.member) return false;
    if (filters.bank && filters.bank !== 'all' && item.bankKey !== filters.bank) return false;
    if (filters.accountId && filters.accountId !== 'all' && item.accountId !== filters.accountId) return false;
    if (filters.type && filters.type !== 'all' && item.type !== filters.type) return false;
    if (filters.category && filters.category !== 'all' && item.category !== filters.category) return false;
    if (filters.term && filters.term !== 'all' && item.type === 'expense' && item.term !== filters.term) return false;
    if (filters.search) {
      const haystack = `${item.description} ${item.category} ${item.bankName} ${item.accountLabel}`.toLowerCase();
      if (!haystack.includes(String(filters.search).toLowerCase())) return false;
    }
    return matchesDate(item, filters.from, filters.to);
  });
}

function summarizeByGroup(items, keyFn, labelFn) {
  const grouped = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        label: labelFn(item),
        income: 0,
        expenses: 0,
        investments: 0,
        balance: 0,
        transactionCount: 0
      });
    }
    const bucket = grouped.get(key);
    bucket.transactionCount += 1;
    if (item.type === 'income') bucket.income += item.amount;
    if (item.type === 'expense') bucket.expenses += item.amount;
    if (item.type === 'investment') bucket.investments += item.amount;
    bucket.balance = bucket.income - bucket.expenses - bucket.investments;
  });
  return [...grouped.values()].sort((a, b) => b.transactionCount - a.transactionCount || b.balance - a.balance);
}

export function buildFinancialDashboard({ transactions, members, filters }) {
  const filtered = filterFinancialTransactions(transactions, filters);
  const totals = filtered.reduce((acc, item) => {
    if (item.type === 'income') acc.income += item.amount;
    if (item.type === 'expense') acc.expenses += item.amount;
    if (item.type === 'investment') acc.investments += item.amount;
    return acc;
  }, { income: 0, expenses: 0, investments: 0 });
  totals.outflow = totals.expenses + totals.investments;
  totals.balance = totals.income - totals.outflow;

  const categories = ['expense', 'income', 'investment'].flatMap((type) => {
    const grouped = summarizeByGroup(filtered.filter((item) => item.type === type), (item) => `${type}:${item.category}`, (item) => item.category)
      .map((item) => ({ ...item, type, amount: type === 'income' ? item.income : type === 'investment' ? item.investments : item.expenses }));
    return grouped;
  });

  const byMember = members.map((member) => {
    const memberRows = filtered.filter((item) => item.memberId === member.id);
    return summarizeByGroup(memberRows, () => member.id, () => member.name)[0] || {
      id: member.id,
      label: member.name,
      income: 0,
      expenses: 0,
      investments: 0,
      balance: 0,
      transactionCount: 0
    };
  });

  const byBank = summarizeByGroup(filtered, (item) => item.bankKey || 'UNKNOWN', (item) => item.bankName || item.bankKey || 'Banco não identificado');
  const byAccount = summarizeByGroup(filtered, (item) => item.accountId || 'sem-conta', (item) => `${item.accountLabel || 'Conta'} · ${item.bankName || item.bankKey || ''}`.trim());

  const months = [...new Set(filtered.map((item) => item.month))].sort();
  const monthlyHistory = months.map((month) => {
    const rows = filtered.filter((item) => item.month === month);
    const monthTotals = rows.reduce((acc, item) => {
      if (item.type === 'income') acc.income += item.amount;
      if (item.type === 'expense') acc.expenses += item.amount;
      if (item.type === 'investment') acc.investments += item.amount;
      return acc;
    }, { income: 0, expenses: 0, investments: 0 });
    return {
      month,
      ...monthTotals,
      balance: monthTotals.income - monthTotals.expenses - monthTotals.investments
    };
  });

  return {
    filters,
    ...totals,
    availableMonths: months,
    categories,
    categoryHighlights: categories.slice().sort((a, b) => b.amount - a.amount).slice(0, 8),
    byMember,
    byBank,
    byAccount,
    monthlyHistory,
    transactionCount: filtered.length,
    empty: filtered.length === 0
  };
}

export function listAvailableAccounts(transactions) {
  return summarizeByGroup(transactions, (item) => item.accountId || 'sem-conta', (item) => `${item.accountLabel || 'Conta'} · ${item.bankName || item.bankKey || ''}`.trim())
    .map((item) => ({ id: item.id, label: item.label }));
}

export function listAvailableBanks(transactions) {
  return summarizeByGroup(transactions, (item) => item.bankKey || 'UNKNOWN', (item) => item.bankName || item.bankKey || 'Banco não identificado')
    .map((item) => ({ key: item.id, name: item.label }));
}
