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

let transactions = [
  {
    id: 't1',
    memberId: 'you',
    type: 'income',
    category: 'Salário',
    description: 'Salário mensal',
    amount: 8500,
    date: '2026-02-05'
  },
  {
    id: 't2',
    memberId: 'wife',
    type: 'income',
    category: 'Salário',
    description: 'Salário mensal',
    amount: 4000,
    date: '2026-02-05'
  },
  {
    id: 't3',
    memberId: 'you',
    type: 'expense',
    category: 'Moradia',
    description: 'Aluguel',
    amount: 2600,
    date: '2026-02-06'
  },
  {
    id: 't4',
    memberId: 'wife',
    type: 'expense',
    category: 'Alimentação',
    description: 'Supermercado',
    amount: 1500,
    date: '2026-02-07'
  },
  {
    id: 't5',
    memberId: 'you',
    type: 'expense',
    category: 'Transporte',
    description: 'Combustível',
    amount: 620,
    date: '2026-02-08'
  },
  {
    id: 't6',
    memberId: 'wife',
    type: 'expense',
    category: 'Educação',
    description: 'Curso do filho',
    amount: 1450,
    date: '2026-02-10'
  },
  {
    id: 't7',
    memberId: 'you',
    type: 'expense',
    category: 'Saúde',
    description: 'Plano de saúde',
    amount: 760,
    date: '2026-02-11'
  },
  {
    id: 't8',
    memberId: 'wife',
    type: 'expense',
    category: 'Lazer',
    description: 'Passeio família',
    amount: 930,
    date: '2026-02-13'
  }
];

function buildDashboard() {
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0);

  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);

  const expenseCategoriesMap = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {});

  const categories = Object.entries(expenseCategoriesMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const byMember = familyMembers.map((member) => {
    const memberIncome = transactions
      .filter((t) => t.memberId === member.id && t.type === 'income')
      .reduce((sum, item) => sum + item.amount, 0);

    const memberExpenses = transactions
      .filter((t) => t.memberId === member.id && t.type === 'expense')
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      memberId: member.id,
      memberName: member.name,
      income: memberIncome,
      expenses: memberExpenses,
      balance: memberIncome - memberExpenses
    };
  });

  const balance = income - expenses;
  const savingsRate = income > 0 ? Number(((balance / income) * 100).toFixed(2)) : 0;

  return {
    month: '2026-02',
    income,
    expenses,
    balance,
    savingsRate,
    categories,
    byMember
  };
}

function buildSuggestions(dashboard) {
  const topCategory = dashboard.categories[0];
  const topPercent = dashboard.expenses > 0
    ? Math.round((topCategory.amount / dashboard.expenses) * 100)
    : 0;

  return {
    suggestions: [
      `Maior peso de gasto está em ${topCategory.name} (${topPercent}% das despesas). Defina um limite mensal para essa categoria.`,
      'Crie um teto semanal por categoria (alimentação, lazer e transporte) para reduzir desvios no final do mês.',
      'Registre gastos no mesmo dia para melhorar as previsões e alertas de orçamento familiar.'
    ]
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'backend', timestamp: new Date().toISOString() });
});

app.get('/api/family-members', (_req, res) => {
  res.json({ members: familyMembers });
});

app.get('/api/transactions', (_req, res) => {
  const ordered = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ transactions: ordered });
});

app.post('/api/transactions', (req, res) => {
  const { memberId, type, category, description, amount, date } = req.body;

  if (!memberId || !type || !category || !description || !amount || !date) {
    return res.status(400).json({ message: 'Preencha todos os campos da transação.' });
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

  const transaction = {
    id: `t${Date.now()}`,
    memberId,
    type,
    category,
    description,
    amount: parsedAmount,
    date
  };

  transactions = [transaction, ...transactions];
  return res.status(201).json({ transaction });
});

app.get('/api/dashboard', (_req, res) => {
  res.json(buildDashboard());
});

app.get('/api/suggestions', (_req, res) => {
  const dashboard = buildDashboard();
  res.json(buildSuggestions(dashboard));
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
