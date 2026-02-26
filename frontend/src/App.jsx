import { useEffect, useMemo, useState } from 'react';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [dashboardRes, suggestionsRes] = await Promise.all([
          fetch(`${API_URL}/api/dashboard`),
          fetch(`${API_URL}/api/suggestions`)
        ]);

        if (!dashboardRes.ok || !suggestionsRes.ok) {
          throw new Error('Não foi possível carregar dados do backend');
        }

        const dashboardData = await dashboardRes.json();
        const suggestionsData = await suggestionsRes.json();

        setDashboard(dashboardData);
        setSuggestions(suggestionsData.suggestions || []);
      } catch (err) {
        setError(err.message || 'Erro ao buscar dados');
      }
    }

    load();
  }, []);

  const topCategory = useMemo(() => {
    if (!dashboard?.categories?.length) return null;
    return [...dashboard.categories].sort((a, b) => b.amount - a.amount)[0];
  }, [dashboard]);

  if (error) return <main className="container"><p className="error">{error}</p></main>;
  if (!dashboard) return <main className="container"><p>Carregando dashboard...</p></main>;

  return (
    <main className="container">
      <header>
        <h1>Controle de Finanças Familiar</h1>
        <p className="subtitle">Visão rápida do mês {dashboard.month}</p>
      </header>

      <section className="cards">
        <article className="card">
          <h2>Receitas</h2>
          <strong>{currency.format(dashboard.income)}</strong>
        </article>
        <article className="card">
          <h2>Despesas</h2>
          <strong>{currency.format(dashboard.expenses)}</strong>
        </article>
        <article className="card">
          <h2>Saldo</h2>
          <strong>{currency.format(dashboard.balance)}</strong>
        </article>
        <article className="card">
          <h2>Taxa de poupança</h2>
          <strong>{dashboard.savingsRate}%</strong>
        </article>
      </section>

      <section className="grid">
        <article className="panel">
          <h3>Para onde o dinheiro está indo</h3>
          <ul>
            {dashboard.categories.map((category) => (
              <li key={category.name}>
                <span>{category.name}</span>
                <strong>{currency.format(category.amount)}</strong>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h3>Sugestões de economia</h3>
          <ul>
            {suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </article>
      </section>

      {topCategory ? (
        <footer className="highlight">
          Maior categoria de gasto no mês: <strong>{topCategory.name}</strong> ({currency.format(topCategory.amount)}).
        </footer>
      ) : null}
    </main>
  );
}

export default App;
