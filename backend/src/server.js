import cors from 'cors';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());

const familyMembers = [
  { id: 'you', name: 'Você' },
  { id: 'wife', name: 'Esposa' }
];

const expenseCategories = [
  'Moradia',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Assinaturas',
  'Outros'
];

let transactions = [
  { id: 't1', memberId: 'you', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 8500, month: '2025-12', date: '2025-12-05' },
  { id: 't2', memberId: 'wife', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 4000, month: '2025-12', date: '2025-12-05' },
  { id: 't3', memberId: 'you', type: 'expense', category: 'Moradia', description: 'Aluguel', amount: 2500, month: '2025-12', date: '2025-12-06' },
  { id: 't4', memberId: 'wife', type: 'expense', category: 'Alimentação', description: 'Supermercado', amount: 1300, month: '2025-12', date: '2025-12-07' },
  { id: 't5', memberId: 'you', type: 'expense', category: 'Transporte', description: 'Combustível', amount: 580, month: '2025-12', date: '2025-12-08' },

  { id: 't6', memberId: 'you', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 8500, month: '2026-01', date: '2026-01-05' },
  { id: 't7', memberId: 'wife', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 4000, month: '2026-01', date: '2026-01-05' },
  { id: 't8', memberId: 'you', type: 'expense', category: 'Moradia', description: 'Aluguel', amount: 2600, month: '2026-01', date: '2026-01-06' },
  { id: 't9', memberId: 'wife', type: 'expense', category: 'Alimentação', description: 'Supermercado', amount: 1450, month: '2026-01', date: '2026-01-07' },
  { id: 't10', memberId: 'wife', type: 'expense', category: 'Lazer', description: 'Passeio família', amount: 780, month: '2026-01', date: '2026-01-13' },

  { id: 't11', memberId: 'you', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 8500, month: '2026-02', date: '2026-02-05' },
  { id: 't12', memberId: 'wife', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 4000, month: '2026-02', date: '2026-02-05' },
  { id: 't13', memberId: 'you', type: 'expense', category: 'Moradia', description: 'Aluguel', amount: 2600, month: '2026-02', date: '2026-02-06' },
  { id: 't14', memberId: 'wife', type: 'expense', category: 'Alimentação', description: 'Supermercado', amount: 1500, month: '2026-02', date: '2026-02-07' },
  { id: 't15', memberId: 'you', type: 'expense', category: 'Transporte', description: 'Combustível', amount: 620, month: '2026-02', date: '2026-02-08' },
  { id: 't16', memberId: 'wife', type: 'expense', category: 'Educação', description: 'Curso do filho', amount: 1450, month: '2026-02', date: '2026-02-10' },
  { id: 't17', memberId: 'you', type: 'expense', category: 'Saúde', description: 'Plano de saúde', amount: 760, month: '2026-02', date: '2026-02-11' },
  { id: 't18', memberId: 'wife', type: 'expense', category: 'Lazer', description: 'Passeio família', amount: 930, month: '2026-02', date: '2026-02-13' }
];

function isValidMonth(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function getAvailableMonths() {
  return [...new Set(transactions.map((item) => item.month))].sort();
}

function getMonthTotals(month) {
  const monthTransactions = transactions.filter((item) => item.month === month);
  const income = monthTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expenses = monthTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  return { monthTransactions, income, expenses };
}

function buildDashboard(selectedMonth) {
  const months = getAvailableMonths();
  const month = selectedMonth && isValidMonth(selectedMonth)
    ? selectedMonth
    : months[months.length - 1];

  const { monthTransactions, income, expenses } = getMonthTotals(month);

  const expenseCategoriesMap = monthTransactions
    .filter((item) => item.type === 'expense')
    .reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {});

  const categories = Object.entries(expenseCategoriesMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const byMember = familyMembers.map((member) => {
    const memberTransactions = monthTransactions.filter((item) => item.memberId === member.id);
    const memberIncome = memberTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const memberExpenses = memberTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);

    return {
      memberId: member.id,
      memberName: member.name,
      income: memberIncome,
      expenses: memberExpenses,
      balance: memberIncome - memberExpenses
    };
  });

  const monthIndex = months.indexOf(month);
  const previousMonth = monthIndex > 0 ? months[monthIndex - 1] : null;
  const previousMonthExpenses = previousMonth ? getMonthTotals(previousMonth).expenses : 0;

  const trailingMonths = months.slice(Math.max(monthIndex - 2, 0), monthIndex + 1);
  const trailingExpenses = trailingMonths.map((monthItem) => getMonthTotals(monthItem).expenses);
  const projectedNextMonthExpenses = trailingExpenses.length
    ? Number((trailingExpenses.reduce((sum, item) => sum + item, 0) / trailingExpenses.length).toFixed(2))
    : expenses;

  const monthlyHistory = months.map((monthItem) => {
    const totals = getMonthTotals(monthItem);
    return {
      month: monthItem,
      income: totals.income,
      expenses: totals.expenses,
      balance: totals.income - totals.expenses
    };
  });

  const balance = income - expenses;
  const savingsRate = income > 0 ? Number(((balance / income) * 100).toFixed(2)) : 0;

  return {
    month,
    income,
    expenses,
    balance,
    savingsRate,
    categories,
    byMember,
    availableMonths: months,
    comparison: {
      previousMonth,
      previousMonthExpenses,
      differenceFromPrevious: Number((expenses - previousMonthExpenses).toFixed(2))
    },
    projection: {
      basedOnMonths: trailingMonths,
      projectedNextMonthExpenses
    },
    monthlyHistory
  };
}

function buildSuggestions(dashboard) {
  const topCategory = dashboard.categories[0];
  const topPercent = topCategory && dashboard.expenses > 0
    ? Math.round((topCategory.amount / dashboard.expenses) * 100)
    : 0;

  const previous = dashboard.comparison.previousMonthExpenses;
  const diff = dashboard.comparison.differenceFromPrevious;
  const trendText = previous > 0
    ? diff > 0
      ? `As despesas subiram ${Math.abs(diff).toFixed(2)} em relação ao mês anterior.`
      : `As despesas caíram ${Math.abs(diff).toFixed(2)} em relação ao mês anterior.`
    : 'Cadastre mais meses para comparação automática.';

  return {
    suggestions: [
      topCategory
        ? `Maior peso de gasto está em ${topCategory.name} (${topPercent}% das despesas). Defina um limite mensal para essa categoria.`
        : 'Cadastre despesas para receber sugestões por categoria.',
      trendText,
      `Projeção do próximo mês: ${dashboard.projection.projectedNextMonthExpenses.toFixed(2)} em despesas, com base em ${dashboard.projection.basedOnMonths.join(', ')}.`
    ]
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'backend', timestamp: new Date().toISOString() });
});

app.get('/api/family-members', (_req, res) => {
  res.json({ members: familyMembers });
});

app.get('/api/categories', (_req, res) => {
  res.json({ categories: expenseCategories });
});

app.get('/api/months', (_req, res) => {
  res.json({ months: getAvailableMonths() });
});

app.get('/api/transactions', (req, res) => {
  const month = req.query.month;

  const filtered = month && isValidMonth(month)
    ? transactions.filter((item) => item.month === month)
    : transactions;

  const ordered = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ transactions: ordered });
});

app.post('/api/transactions', (req, res) => {
  const { memberId, type, category, description, amount, month, date } = req.body;

  if (!memberId || !type || !category || !description || !amount || !month) {
    return res.status(400).json({ message: 'Preencha membro, tipo, categoria, descrição, valor e mês.' });
  }

  if (!isValidMonth(month)) {
    return res.status(400).json({ message: 'Mês inválido. Use o formato YYYY-MM.' });
  }

  if (!familyMembers.find((member) => member.id === memberId)) {
    return res.status(400).json({ message: 'Membro da família inválido.' });
  }

  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ message: 'Tipo inválido. Use income ou expense.' });
  }

  const parsedAmount = Number(amount);

  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ message: 'Valor inválido. Informe um número maior que zero.' });
  }

  const safeDate = date || `${month}-01`;

  const transaction = {
    id: `t${Date.now()}`,
    memberId,
    type,
    category,
    description,
    amount: parsedAmount,
    month,
    date: safeDate
  };

  transactions = [transaction, ...transactions];
  return res.status(201).json({ transaction });
});

app.get('/api/dashboard', (req, res) => {
  res.json(buildDashboard(req.query.month));
});

app.get('/api/suggestions', (req, res) => {
  const dashboard = buildDashboard(req.query.month);
  res.json(buildSuggestions(dashboard));
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
