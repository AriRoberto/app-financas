import cors from 'cors';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());

const members = [
  { id: 'husband', name: 'marido', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'wife', name: 'esposa', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'family', name: 'familia', createdAt: '2026-01-01T00:00:00.000Z' }
];

const expenseCategories = [
  'Moradia',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Assinaturas',
  'Reserva para investir',
  'Outros'
];

const incomeCategories = ['Salário', 'Renda extra', 'Freelance', 'Bônus'];
const investmentCategories = ['Reserva de emergência', 'Renda fixa', 'Fundos', 'Ações', 'Previdência', 'Cripto', 'Outros investimentos'];

const descriptionTemplatesByCategory = {
  Moradia: ['Aluguel', 'Condomínio', 'Conta de luz', 'Conta de água'],
  Alimentação: ['Supermercado', 'Feira', 'Padaria', 'Delivery'],
  Transporte: ['Combustível', 'Uber/99', 'Ônibus/Metrô', 'Manutenção do carro'],
  Saúde: ['Plano de saúde', 'Farmácia', 'Consulta médica'],
  Educação: ['Escola', 'Curso', 'Material escolar'],
  Lazer: ['Passeio família', 'Cinema', 'Restaurante'],
  Assinaturas: ['Streaming', 'Aplicativo', 'Internet'],
  'Reserva para investir': ['Aporte separado para investimento'],
  'Reserva de emergência': ['Aporte na reserva', 'Transferência para reserva'],
  'Renda fixa': ['Tesouro Selic', 'CDB', 'LCI/LCA'],
  Fundos: ['Fundo multimercado', 'Fundo imobiliário'],
  Ações: ['Compra de ações', 'ETF'],
  Previdência: ['Aporte previdência privada'],
  Cripto: ['Compra de Bitcoin', 'Compra de Ethereum'],
  'Outros investimentos': ['Aporte em investimento alternativo']
};

const sampleTransactions = [
  { id: 't1', memberId: 'husband', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 9200, month: '2026-01', date: '2026-01-05' },
  { id: 't2', memberId: 'wife', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 5400, month: '2026-01', date: '2026-01-05' },
  { id: 't3', memberId: 'family', type: 'expense', category: 'Moradia', description: 'Aluguel', amount: 3100, month: '2026-01', date: '2026-01-06', dueDate: '2026-01-06' },
  { id: 't4', memberId: 'wife', type: 'expense', category: 'Alimentação', description: 'Supermercado', amount: 1500, month: '2026-01', date: '2026-01-08', dueDate: '2026-01-08' },
  { id: 't5', memberId: 'husband', type: 'expense', category: 'Reserva para investir', description: 'Reserva mensal', amount: 800, month: '2026-01', date: '2026-01-15', dueDate: '2027-06-01', isInvestmentReserve: true },
  { id: 't6', memberId: 'family', type: 'income', category: 'Renda extra', description: 'Venda ocasional', amount: 900, month: '2026-02', date: '2026-02-03' },
  { id: 't7', memberId: 'husband', type: 'expense', category: 'Transporte', description: 'Combustível', amount: 620, month: '2026-02', date: '2026-02-09', dueDate: '2026-02-09' },
  { id: 't8', memberId: 'wife', type: 'expense', category: 'Saúde', description: 'Farmácia', amount: 320, month: '2026-02', date: '2026-02-10', dueDate: '2028-05-10' },
  { id: 't9', memberId: 'family', type: 'expense', category: 'Educação', description: 'Curso da família', amount: 900, month: '2026-03', date: '2026-03-11', dueDate: '2026-11-30' }
];

function normalizeMemberId(value) {
  if (!value) return 'family';
  if (value === 'you') return 'husband';
  if (value === 'marido') return 'husband';
  if (value === 'wife' || value === 'esposa') return 'wife';
  if (value === 'familia' || value === 'family') return 'family';
  if (value === 'all') return 'all';
  return value;
}

function cloneSampleTransactions() {
  return sampleTransactions.map((item) => ({
    ...item,
    memberId: normalizeMemberId(item.memberId),
    term: item.type === 'expense' ? classifyTerm(item.dueDate || item.date) : null
  }));
}

let transactions = cloneSampleTransactions();
let investments = [];

function endOfCurrentYear() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59));
}

function addMonths(dateInput, months) {
  const date = new Date(dateInput);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 23, 59, 59));
}

export function classifyTerm(dueDate) {
  if (!dueDate) return 'short';
  const target = new Date(`${dueDate}T00:00:00Z`);
  if (target <= endOfCurrentYear()) return 'short';
  if (target <= addMonths(new Date(), 24)) return 'medium';
  return 'long';
}

function seedInvestmentsFromTransactions() {
  const mirrored = transactions
    .filter((item) => item.type === 'expense' && item.isInvestmentReserve)
    .map((item) => ({
      id: `inv-${item.id}`,
      memberId: item.memberId,
      date: item.date,
      amount: item.amount,
      type: 'reserve',
      sourceTransactionId: item.id,
      createdAt: new Date().toISOString()
    }));
  investments = mirrored;
}

seedInvestmentsFromTransactions();

function isValidMonth(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function getMonthFromDate(date) {
  return date.slice(0, 7);
}

function getAvailableMonths(filteredTransactions = transactions) {
  return [...new Set(filteredTransactions.map((item) => item.month))].sort();
}

function isMemberMatch(transaction, member) {
  const safe = normalizeMemberId(member || 'all');
  if (safe === 'all') return true;
  return normalizeMemberId(transaction.memberId) === safe;
}

function inPeriod(transaction, from, to) {
  if (!from && !to) return true;
  const txDate = new Date(`${transaction.date}T00:00:00Z`);
  const fromDate = from ? new Date(`${from}T00:00:00Z`) : null;
  const toDate = to ? new Date(`${to}T00:00:00Z`) : null;
  if (fromDate && txDate < fromDate) return false;
  if (toDate && txDate > toDate) return false;
  return true;
}

function filterTransactions({ month, member = 'all', from, to, term }) {
  return transactions.filter((item) => {
    if (month && isValidMonth(month) && item.month !== month) return false;
    if (!isMemberMatch(item, member)) return false;
    if (!inPeriod(item, from, to)) return false;
    if (term && term !== 'all' && item.type === 'expense' && item.term !== term) return false;
    return true;
  });
}

function calculateSummary(filteredTransactions) {
  const income = filteredTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expenses = filteredTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  const investmentsFromReserves = filteredTransactions.filter((item) => item.type === 'expense' && item.isInvestmentReserve).reduce((sum, item) => sum + item.amount, 0);
  const investmentsDirect = investments
    .filter((item) => isMemberMatch(item, 'all') && filteredTransactions.find((tx) => tx.id === item.sourceTransactionId))
    .reduce((sum, item) => sum + item.amount, 0);
  const investmentsTotal = Math.max(investmentsFromReserves, investmentsDirect);
  const outflow = expenses;
  return { income, expenses, investmentsTotal, outflow, balance: income - outflow };
}

function buildDashboard({ month, member = 'all', from, to, term = 'all' }) {
  const filteredTransactions = filterTransactions({ month, member, from, to, term });
  const months = getAvailableMonths(filteredTransactions);
  const summary = calculateSummary(filteredTransactions);

  const categoryTotals = filteredTransactions
    .filter((item) => item.type === 'expense')
    .reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {});

  const categories = Object.entries(categoryTotals).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);

  const byMember = members.map((memberItem) => {
    const data = filteredTransactions.filter((item) => item.memberId === memberItem.id);
    const income = data.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const expenses = data.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    const investments = data.filter((item) => item.type === 'expense' && item.isInvestmentReserve).reduce((sum, item) => sum + item.amount, 0);
    return { memberId: memberItem.id, memberName: memberItem.name, income, expenses, investments, balance: income - expenses };
  });

  const termTotals = ['short', 'medium', 'long'].map((name) => ({
    term: name,
    total: filteredTransactions
      .filter((item) => item.type === 'expense' && item.term === name)
      .reduce((sum, item) => sum + item.amount, 0)
  }));

  const monthlyHistory = getAvailableMonths(filteredTransactions).map((monthItem) => {
    const data = filteredTransactions.filter((item) => item.month === monthItem);
    const income = data.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const expenses = data.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    return { month: monthItem, income, expenses, balance: income - expenses };
  });

  return {
    filters: { month, member: normalizeMemberId(member), from, to, term },
    income: summary.income,
    expenses: summary.expenses,
    investments: summary.investmentsTotal,
    outflow: summary.outflow,
    balance: summary.balance,
    categories,
    byMember,
    availableMonths: months,
    termTotals,
    projection: {
      basedOnMonths: months.slice(-3),
      projectedNextMonthOutflow: months.length
        ? Number((monthlyHistory.slice(-3).reduce((sum, item) => sum + item.expenses, 0) / Math.min(monthlyHistory.length, 3)).toFixed(2))
        : 0
    },
    monthlyHistory
  };
}

function buildSuggestions(dashboard) {
  const topCategory = dashboard.categories[0];
  return {
    suggestions: [
      topCategory ? `Maior categoria de saída: ${topCategory.name}.` : 'Cadastre despesas para gerar sugestões.',
      `Saldo atual filtrado: ${dashboard.balance.toFixed(2)}.`
    ]
  };
}

function getCategoryTemplates(type, category) {
  if (category && descriptionTemplatesByCategory[category]) return descriptionTemplatesByCategory[category];
  if (type === 'expense') return expenseCategories.flatMap((item) => descriptionTemplatesByCategory[item] || []);
  if (type === 'income') return ['Salário mensal', 'Renda extra', 'Freelance', 'Bônus'];
  return ['Aporte em investimento'];
}

function validateMember(memberId) {
  return members.some((item) => item.id === normalizeMemberId(memberId));
}

function upsertInvestmentFromReserve(transaction) {
  if (!(transaction.type === 'expense' && transaction.isInvestmentReserve)) {
    investments = investments.filter((item) => item.sourceTransactionId !== transaction.id);
    return;
  }

  const existing = investments.find((item) => item.sourceTransactionId === transaction.id);
  const next = {
    id: existing?.id || `inv-${transaction.id}`,
    memberId: transaction.memberId,
    date: transaction.date,
    amount: transaction.amount,
    sourceTransactionId: transaction.id,
    type: 'reserve',
    createdAt: existing?.createdAt || new Date().toISOString()
  };

  if (existing) {
    investments = investments.map((item) => (item.sourceTransactionId === transaction.id ? next : item));
  } else {
    investments = [next, ...investments];
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'backend', timestamp: new Date().toISOString() });
});

app.get('/api/members', (_req, res) => {
  res.json({ members });
});

app.get('/api/family-members', (_req, res) => {
  res.json({ members });
});

app.get('/api/categories', (_req, res) => {
  res.json({ categories: expenseCategories, expenseCategories, incomeCategories, investmentCategories });
});

app.get('/api/description-templates', (req, res) => {
  res.json({ templates: getCategoryTemplates(req.query.type, req.query.category) });
});

app.get('/api/months', (req, res) => {
  const filtered = filterTransactions({ member: req.query.member || 'all' });
  res.json({ months: getAvailableMonths(filtered) });
});

app.get('/api/transactions', (req, res) => {
  const filtered = filterTransactions({
    month: req.query.month,
    member: req.query.member || 'all',
    from: req.query.from,
    to: req.query.to,
    term: req.query.term || 'all'
  });
  const ordered = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ transactions: ordered });
});

app.delete('/api/transactions', (_req, res) => {
  transactions = [];
  investments = [];
  res.json({ message: 'Todos os lançamentos removidos.', transactionsCount: 0 });
});

app.post('/api/transactions/seed', (_req, res) => {
  transactions = cloneSampleTransactions();
  seedInvestmentsFromTransactions();
  res.json({ message: 'Dados de exemplo restaurados.', transactionsCount: transactions.length });
});

app.post('/api/transactions', (req, res) => {
  const {
    memberId,
    type,
    category,
    description,
    amount,
    month,
    date,
    dueDate,
    isInvestmentReserve
  } = req.body;

  const normalizedMemberId = normalizeMemberId(memberId);

  if (!normalizedMemberId || !type || !category || !description || !amount || !month) {
    return res.status(400).json({ message: 'Preencha membro, tipo, categoria, descrição, valor e mês.' });
  }

  if (!validateMember(normalizedMemberId)) {
    return res.status(400).json({ message: 'Membro inválido.' });
  }

  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ message: 'Tipo inválido. Use income ou expense.' });
  }

  const parsedAmount = Number(amount);
  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ message: 'Valor inválido.' });
  }

  const safeDate = date || `${month}-01`;
  const safeDueDate = dueDate || safeDate;

  const transaction = {
    id: `t${Date.now()}`,
    memberId: normalizedMemberId,
    type,
    category,
    description,
    amount: parsedAmount,
    month: isValidMonth(month) ? month : getMonthFromDate(safeDate),
    date: safeDate,
    dueDate: safeDueDate,
    term: type === 'expense' ? classifyTerm(safeDueDate) : null,
    isInvestmentReserve: Boolean(isInvestmentReserve || category === 'Reserva para investir')
  };

  transactions = [transaction, ...transactions];
  upsertInvestmentFromReserve(transaction);
  res.status(201).json({ transaction });
});

app.patch('/api/transactions/:id', (req, res) => {
  const target = transactions.find((item) => item.id === req.params.id);
  if (!target) return res.status(404).json({ message: 'Lançamento não encontrado.' });

  const next = {
    ...target,
    ...req.body,
    memberId: normalizeMemberId(req.body.memberId || target.memberId)
  };

  next.term = next.type === 'expense' ? classifyTerm(next.dueDate || next.date) : null;
  next.isInvestmentReserve = Boolean(next.isInvestmentReserve || next.category === 'Reserva para investir');

  transactions = transactions.map((item) => (item.id === target.id ? next : item));
  upsertInvestmentFromReserve(next);
  return res.json({ transaction: next });
});

app.delete('/api/transactions/:id', (req, res) => {
  const exists = transactions.some((item) => item.id === req.params.id);
  if (!exists) return res.status(404).json({ message: 'Lançamento não encontrado.' });
  transactions = transactions.filter((item) => item.id !== req.params.id);
  investments = investments.filter((item) => item.sourceTransactionId !== req.params.id);
  return res.status(204).send();
});

app.get('/api/dashboard', (req, res) => {
  res.json(buildDashboard({
    month: req.query.month,
    member: req.query.member || 'all',
    from: req.query.from,
    to: req.query.to,
    term: req.query.term || 'all'
  }));
});

app.get('/api/suggestions', (req, res) => {
  const dashboard = buildDashboard({
    month: req.query.month,
    member: req.query.member || 'all',
    from: req.query.from,
    to: req.query.to,
    term: req.query.term || 'all'
  });
  res.json(buildSuggestions(dashboard));
});

app.get('/api/investments', (req, res) => {
  const member = req.query.member || 'all';
  const from = req.query.from;
  const to = req.query.to;
  const filtered = investments.filter((item) => {
    if (!isMemberMatch(item, member)) return false;
    return inPeriod({ date: item.date }, from, to);
  });

  res.json({
    total: filtered.reduce((sum, item) => sum + item.amount, 0),
    investments: filtered
  });
});

app.get('/reports/expenses-by-category', (req, res) => {
  const member = req.query.member || 'all';
  const from = req.query.from;
  const to = req.query.to;

  const filtered = filterTransactions({ member, from, to }).filter((item) => item.type === 'expense');
  const totalExpenses = filtered.reduce((sum, item) => sum + item.amount, 0);

  const rows = Object.entries(filtered.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {})).map(([category, total]) => ({
    category,
    total,
    percentage: totalExpenses > 0 ? Number(((total / totalExpenses) * 100).toFixed(2)) : 0
  })).sort((a, b) => b.total - a.total);

  res.json({ member: normalizeMemberId(member), from, to, totalExpenses, categories: rows });
});

export { app, buildDashboard, filterTransactions, seedInvestmentsFromTransactions, upsertInvestmentFromReserve };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
}
