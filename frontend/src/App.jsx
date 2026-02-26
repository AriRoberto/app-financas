import { useEffect, useMemo, useState } from 'react';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

const initialForm = {
  memberId: 'you',
  type: 'expense',
  category: 'Alimentação',
  description: '',
  amount: '',
  month: currentMonth(),
  date: ''
};

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadStaticData() {
    const [membersRes, categoriesRes, monthsRes] = await Promise.all([
      fetch(`${API_URL}/api/family-members`),
      fetch(`${API_URL}/api/categories`),
      fetch(`${API_URL}/api/months`)
    ]);

    if (!membersRes.ok || !categoriesRes.ok || !monthsRes.ok) {
      throw new Error('Não foi possível carregar os dados de configuração.');
    }

    const membersData = await membersRes.json();
    const categoriesData = await categoriesRes.json();
    const monthsData = await monthsRes.json();

    const availableMonths = monthsData.months || [];
    const preferredMonth = availableMonths.includes(selectedMonth)
      ? selectedMonth
      : availableMonths[availableMonths.length - 1] || selectedMonth;

    setMembers(membersData.members || []);
    setCategories(categoriesData.categories || []);
    setMonths(availableMonths);
    setSelectedMonth(preferredMonth);
    setForm((old) => ({
      ...old,
      memberId: membersData.members?.[0]?.id || 'you',
      category: categoriesData.categories?.[0] || 'Outros',
      month: preferredMonth
    }));

    return preferredMonth;
  }

  async function loadFinancialData(month) {
    const [dashboardRes, suggestionsRes, transactionsRes] = await Promise.all([
      fetch(`${API_URL}/api/dashboard?month=${month}`),
      fetch(`${API_URL}/api/suggestions?month=${month}`),
      fetch(`${API_URL}/api/transactions?month=${month}`)
    ]);

    if (!dashboardRes.ok || !suggestionsRes.ok || !transactionsRes.ok) {
      throw new Error('Não foi possível carregar os dados financeiros.');
    }

    const dashboardData = await dashboardRes.json();
    const suggestionsData = await suggestionsRes.json();
    const transactionsData = await transactionsRes.json();

    setDashboard(dashboardData);
    setSuggestions(suggestionsData.suggestions || []);
    setTransactions(transactionsData.transactions || []);
    setMonths(dashboardData.availableMonths || []);
  }

  async function boot() {
    setLoading(true);
    setError('');
    try {
      const preferredMonth = await loadStaticData();
      await loadFinancialData(preferredMonth);
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    boot();
  }, []);

  async function handleMonthChange(month) {
    setSelectedMonth(month);
    setForm((old) => ({ ...old, month }));

    try {
      await loadFinancialData(month);
      setError('');
    } catch (err) {
      setError(err.message || 'Erro ao atualizar mês.');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        amount: Number(form.amount)
      };

      const response = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao salvar lançamento.');
      }

      await boot();
      setForm((old) => ({ ...old, description: '', amount: '', date: '' }));
    } catch (err) {
      setError(err.message || 'Erro ao salvar lançamento.');
    } finally {
      setSaving(false);
    }
  }

  const topCategory = useMemo(() => dashboard?.categories?.[0] || null, [dashboard]);

  if (loading) return <main className="page"><p>Carregando painel financeiro...</p></main>;
  if (!dashboard) return <main className="page"><p className="error">{error || 'Sem dados disponíveis.'}</p></main>;

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="badge">Cadastro e Comparação de Despesas</p>
          <h1>Controle Familiar com Histórico Mensal</h1>
          <p className="subtitle">Cadastre despesas de meses anteriores para comparar evolução e gerar projeção do próximo mês.</p>
        </div>
        <div className="hero-card">
          <label>
            Mês analisado
            <select value={selectedMonth} onChange={(event) => handleMonthChange(event.target.value)}>
              {months.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </label>
          <span>Projeção próxima despesa: {currency.format(dashboard.projection.projectedNextMonthExpenses)}</span>
        </div>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="cards">
        <article className="card">
          <p>Receitas do mês</p>
          <strong>{currency.format(dashboard.income)}</strong>
        </article>
        <article className="card expense">
          <p>Despesas do mês</p>
          <strong>{currency.format(dashboard.expenses)}</strong>
        </article>
        <article className="card">
          <p>Saldo</p>
          <strong>{currency.format(dashboard.balance)}</strong>
        </article>
        <article className="card">
          <p>Comparação com mês anterior</p>
          <strong className={dashboard.comparison.differenceFromPrevious > 0 ? 'negative' : 'positive'}>
            {dashboard.comparison.previousMonth
              ? `${dashboard.comparison.differenceFromPrevious > 0 ? '+' : ''}${currency.format(dashboard.comparison.differenceFromPrevious)}`
              : 'Sem histórico'}
          </strong>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <h2>Tela de cadastro de despesas</h2>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Membro
              <select value={form.memberId} onChange={(event) => setForm((old) => ({ ...old, memberId: event.target.value }))}>
                {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
            <label>
              Tipo
              <select value={form.type} onChange={(event) => setForm((old) => ({ ...old, type: event.target.value }))}>
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </label>
            <label>
              Categoria
              <select value={form.category} onChange={(event) => setForm((old) => ({ ...old, category: event.target.value }))}>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label>
              Mês de competência
              <input type="month" value={form.month} onChange={(event) => setForm((old) => ({ ...old, month: event.target.value }))} />
            </label>
            <label>
              Descrição
              <input value={form.description} onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))} placeholder="Ex.: Mercado semanal" />
            </label>
            <label>
              Valor (R$)
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm((old) => ({ ...old, amount: event.target.value }))} placeholder="0,00" />
            </label>
            <label>
              Data (opcional)
              <input type="date" value={form.date} onChange={(event) => setForm((old) => ({ ...old, date: event.target.value }))} />
            </label>
            <button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar lançamento'}</button>
          </form>
        </article>

        <article className="panel">
          <h2>Categorias e projeção de gastos</h2>
          <ul className="category-list">
            {dashboard.categories.map((category) => {
              const percent = dashboard.expenses > 0 ? (category.amount / dashboard.expenses) * 100 : 0;
              return (
                <li key={category.name}>
                  <div className="category-row">
                    <span>{category.name}</span>
                    <strong>{currency.format(category.amount)}</strong>
                  </div>
                  <div className="progress"><div style={{ width: `${Math.min(percent, 100)}%` }} /></div>
                </li>
              );
            })}
          </ul>

          <h3>Histórico mensal</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Receitas</th>
                  <th>Despesas</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.monthlyHistory.map((item) => (
                  <tr key={item.month}>
                    <td>{item.month}</td>
                    <td className="positive">{currency.format(item.income)}</td>
                    <td className="negative">{currency.format(item.expenses)}</td>
                    <td>{currency.format(item.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <h2>Sugestões automáticas</h2>
          <ul className="suggestions">{suggestions.map((text) => <li key={text}>{text}</li>)}</ul>
        </article>

        <article className="panel">
          <h2>Lançamentos do mês {selectedMonth}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Membro</th>
                  <th>Tipo</th>
                  <th>Categoria</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((item) => {
                  const member = members.find((m) => m.id === item.memberId);
                  return (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{member?.name || item.memberId}</td>
                      <td>{item.type === 'income' ? 'Receita' : 'Despesa'}</td>
                      <td>{item.category}</td>
                      <td>{item.description}</td>
                      <td className={item.type === 'income' ? 'positive' : 'negative'}>{currency.format(item.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {topCategory ? (
        <footer className="highlight">
          Maior categoria no mês selecionado: <strong>{topCategory.name}</strong> ({currency.format(topCategory.amount)}).
        </footer>
      ) : null}
    </main>
  );
}

export default App;
