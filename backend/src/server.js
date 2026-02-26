import cors from 'cors';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());

const monthlyData = {
  month: '2026-02',
  income: 12500,
  expenses: 9320,
  categories: [
    { name: 'Moradia', amount: 3100 },
    { name: 'Alimentação', amount: 2100 },
    { name: 'Transporte', amount: 980 },
    { name: 'Saúde', amount: 760 },
    { name: 'Educação', amount: 1450 },
    { name: 'Lazer', amount: 930 }
  ]
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'backend', timestamp: new Date().toISOString() });
});

app.get('/api/dashboard', (_req, res) => {
  const { income, expenses, categories, month } = monthlyData;
  const balance = income - expenses;
  const savingsRate = Number(((balance / income) * 100).toFixed(2));

  res.json({
    month,
    income,
    expenses,
    balance,
    savingsRate,
    categories
  });
});

app.get('/api/suggestions', (_req, res) => {
  res.json({
    suggestions: [
      'Você gastou 18% a mais em alimentação fora de casa em comparação à média dos últimos 3 meses.',
      'Ao limitar lazer para R$ 700 neste mês, sua taxa de poupança pode subir para 28%.',
      'Assinaturas recorrentes somam R$ 212/mês. Revise serviços com baixa utilização.'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
