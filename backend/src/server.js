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

const investmentCategories = [
  'Reserva de emergência',
  'Renda fixa',
  'Fundos',
  'Ações',
  'Previdência',
  'Cripto',
  'Outros investimentos'
];

const descriptionTemplatesByCategory = {
  Moradia: ['Aluguel', 'Condomínio', 'Conta de luz', 'Conta de água'],
  Alimentação: ['Supermercado', 'Feira', 'Padaria', 'Delivery'],
  Transporte: ['Combustível', 'Uber/99', 'Ônibus/Metrô', 'Manutenção do carro'],
  Saúde: ['Plano de saúde', 'Farmácia', 'Consulta médica'],
  Educação: ['Escola', 'Curso', 'Material escolar'],
  Lazer: ['Passeio família', 'Cinema', 'Restaurante'],
  Assinaturas: ['Streaming', 'Aplicativo', 'Internet'],
  'Reserva de emergência': ['Aporte na reserva', 'Transferência para reserva'],
  'Renda fixa': ['Tesouro Selic', 'CDB', 'LCI/LCA'],
  Fundos: ['Fundo multimercado', 'Fundo imobiliário'],
  Ações: ['Compra de ações', 'ETF'],
  Previdência: ['Aporte previdência privada'],
  Cripto: ['Compra de Bitcoin', 'Compra de Ethereum'],
  'Outros investimentos': ['Aporte em investimento alternativo']
};

const sampleTransactions = [
  { id: 't1', memberId: 'you', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 8500, month: '2025-12', date: '2025-12-05' },
  { id: 't2', memberId: 'wife', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 4000, month: '2025-12', date: '2025-12-05' },
  { id: 't3', memberId: 'you', type: 'expense', category: 'Moradia', description: 'Aluguel', amount: 2500, month: '2025-12', date: '2025-12-06' },
  { id: 't4', memberId: 'wife', type: 'expense', category: 'Alimentação', description: 'Supermercado', amount: 1300, month: '2025-12', date: '2025-12-07' },
  { id: 't5', memberId: 'you', type: 'investment', category: 'Renda fixa', description: 'Tesouro Selic', amount: 600, month: '2025-12', date: '2025-12-10' },

  { id: 't6', memberId: 'you', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 8500, month: '2026-01', date: '2026-01-05' },
  { id: 't7', memberId: 'wife', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 4000, month: '2026-01', date: '2026-01-05' },
  { id: 't8', memberId: 'you', type: 'expense', category: 'Moradia', description: 'Aluguel', amount: 2600, month: '2026-01', date: '2026-01-06' },
  { id: 't9', memberId: 'wife', type: 'expense', category: 'Alimentação', description: 'Supermercado', amount: 1450, month: '2026-01', date: '2026-01-07' },
  { id: 't10', memberId: 'wife', type: 'investment', category: 'Previdência', description: 'Aporte previdência privada', amount: 800, month: '2026-01', date: '2026-01-15' },

  { id: 't11', memberId: 'you', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 8500, month: '2026-02', date: '2026-02-05' },
  { id: 't12', memberId: 'wife', type: 'income', category: 'Salário', description: 'Salário mensal', amount: 4000, month: '2026-02', date: '2026-02-05' },
  { id: 't13', memberId: 'you', type: 'expense', category: 'Moradia', description: 'Aluguel', amount: 2600, month: '2026-02', date: '2026-02-06' },
  { id: 't14', memberId: 'wife', type: 'expense', category: 'Alimentação', description: 'Supermercado', amount: 1500, month: '2026-02', date: '2026-02-07' },
  { id: 't15', memberId: 'you', type: 'expense', category: 'Transporte', description: 'Combustível', amount: 620, month: '2026-02', date: '2026-02-08' },
  { id: 't16', memberId: 'wife', type: 'expense', category: 'Educação', description: 'Curso do filho', amount: 1450, month: '2026-02', date: '2026-02-10' },
  { id: 't17', memberId: 'you', type: 'investment', category: 'Renda fixa', description: 'CDB', amount: 1000, month: '2026-02', date: '2026-02-11' },
  { id: 't18', memberId: 'wife', type: 'investment', category: 'Reserva de emergência', description: 'Aporte na reserva', amount: 900, month: '2026-02', date: '2026-02-13' }
];

function cloneSampleTransactions() {
  return sampleTransactions.map((item) => ({ ...item }));
}

let transactions = cloneSampleTransactions();

function isValidMonth(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function getAvailableMonths() {
  return [...new Set(transactions.map((item) => item.month))].sort();
}

function getCategoryTemplates(type, category) {
  if (category && descriptionTemplatesByCategory[category]) {
    return descriptionTemplatesByCategory[category];
  }

  if (type === 'investment') {
    return investmentCategories.flatMap((item) => descriptionTemplatesByCategory[item] || []);
  }

  if (type === 'expense') {
    return expenseCategories.flatMap((item) => descriptionTemplatesByCategory[item] || []);
  }

  return ['Salário mensal', 'Renda extra', 'Freelance', 'Bônus'];
}

function getMonthTotals(month) {
  const monthTransactions = transactions.filter((item) => item.month === month);
  const income = monthTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expenses = monthTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  const investments = monthTransactions.filter((item) => item.type === 'investment').reduce((sum, item) => sum + item.amount, 0);

  return {
    monthTransactions,
    income,
    expenses,
    investments,
    outflow: expenses + investments
  };
}

function buildDashboard(selectedMonth) {
  const months = getAvailableMonths();
  const month = selectedMonth && isValidMonth(selectedMonth)
    ? selectedMonth
    : months[months.length - 1] || null;

  const { monthTransactions, income, expenses, investments, outflow } = getMonthTotals(month);

  const expenseCategoriesMap = monthTransactions
    .filter((item) => item.type !== 'income')
    .reduce((acc, item) => {
      const key = item.type === 'investment' ? `${item.category} (Investimento)` : item.category;
      acc[key] = (acc[key] || 0) + item.amount;
      return acc;
    }, {});

  const categories = Object.entries(expenseCategoriesMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const byMember = familyMembers.map((member) => {
    const memberTransactions = monthTransactions.filter((item) => item.memberId === member.id);
    const memberIncome = memberTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const memberExpenses = memberTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    const memberInvestments = memberTransactions.filter((item) => item.type === 'investment').reduce((sum, item) => sum + item.amount, 0);

    return {
      memberId: member.id,
      memberName: member.name,
      income: memberIncome,
      expenses: memberExpenses,
      investments: memberInvestments,
      balance: memberIncome - memberExpenses - memberInvestments
    };
  });

  const monthIndex = month ? months.indexOf(month) : -1;
  const previousMonth = monthIndex > 0 ? months[monthIndex - 1] : null;
  const previousTotals = previousMonth ? getMonthTotals(previousMonth) : null;
  const previousMonthOutflow = previousTotals ? previousTotals.outflow : 0;

  const trailingMonths = monthIndex >= 0 ? months.slice(Math.max(monthIndex - 2, 0), monthIndex + 1) : [];
  const trailingOutflows = trailingMonths.map((monthItem) => getMonthTotals(monthItem).outflow);
  const projectedNextMonthOutflow = trailingOutflows.length
    ? Number((trailingOutflows.reduce((sum, item) => sum + item, 0) / trailingOutflows.length).toFixed(2))
    : outflow;

  const monthlyHistory = months.map((monthItem) => {
    const totals = getMonthTotals(monthItem);
    return {
      month: monthItem,
      income: totals.income,
      expenses: totals.expenses,
      investments: totals.investments,
      outflow: totals.outflow,
      balance: totals.income - totals.outflow
    };
  });

  const balance = income - outflow;
  const savingsRate = income > 0 ? Number(((balance / income) * 100).toFixed(2)) : 0;

  return {
    month,
    income,
    expenses,
    investments,
    outflow,
    balance,
    savingsRate,
    categories,
    byMember,
    availableMonths: months,
    comparison: {
      previousMonth,
      previousMonthOutflow,
      differenceFromPrevious: Number((outflow - previousMonthOutflow).toFixed(2))
    },
    projection: {
      basedOnMonths: trailingMonths,
      projectedNextMonthOutflow
    },
    monthlyHistory
  };
}

function buildSuggestions(dashboard) {
  const topCategory = dashboard.categories[0];
  const topPercent = topCategory && dashboard.outflow > 0
    ? Math.round((topCategory.amount / dashboard.outflow) * 100)
    : 0;

  const previous = dashboard.comparison.previousMonthOutflow;
  const diff = dashboard.comparison.differenceFromPrevious;
  const trendText = previous > 0
    ? diff > 0
      ? `As saídas totais (despesas + investimentos) subiram ${Math.abs(diff).toFixed(2)} em relação ao mês anterior.`
      : `As saídas totais caíram ${Math.abs(diff).toFixed(2)} em relação ao mês anterior.`
    : 'Cadastre mais meses para comparação automática.';

  return {
    suggestions: [
      topCategory
        ? `Maior peso de saída está em ${topCategory.name} (${topPercent}% do total). Defina um limite mensal para essa categoria.`
        : 'Cadastre despesas e investimentos para receber sugestões por categoria.',
      trendText,
      `Projeção do próximo mês: ${dashboard.projection.projectedNextMonthOutflow.toFixed(2)} em saídas, com base em ${dashboard.projection.basedOnMonths.join(', ')}.`
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
  res.json({
    categories: expenseCategories,
    expenseCategories,
    investmentCategories
  });
});

app.get('/api/description-templates', (req, res) => {
  const type = req.query.type;
  const category = req.query.category;

  res.json({ templates: getCategoryTemplates(type, category) });
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

app.delete('/api/transactions', (_req, res) => {
  transactions = [];
  res.json({
    message: 'Dados de exemplo removidos. Agora você pode cadastrar somente os seus valores reais.',
    transactionsCount: transactions.length
  });
});

app.post('/api/transactions/seed', (_req, res) => {
  transactions = cloneSampleTransactions();
  res.json({
    message: 'Dados de exemplo restaurados com sucesso.',
    transactionsCount: transactions.length
  });
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

  if (!['income', 'expense', 'investment'].includes(type)) {
    return res.status(400).json({ message: 'Tipo inválido. Use income, expense ou investment.' });
  }

  if (type === 'expense' && !expenseCategories.includes(category)) {
    return res.status(400).json({ message: 'Categoria de despesa inválida.' });
  }

  if (type === 'investment' && !investmentCategories.includes(category)) {
    return res.status(400).json({ message: 'Categoria de investimento inválida.' });
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
