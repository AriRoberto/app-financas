import { useEffect, useMemo, useState } from 'react';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

const initialForm = {
  memberId: 'you',
  type: 'expense',
  category: '',
  description: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10)
};

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [dashboardRes, suggestionsRes, membersRes, transactionsRes] = await Promise.all([
        fetch(`${API_URL}/api/dashboard`),
        fetch(`${API_URL}/api/suggestions`),
        fetch(`${API_URL}/api/family-members`),
        fetch(`${API_URL}/api/transactions`)
      ]);

      if (!dashboardRes.ok || !suggestionsRes.ok || !membersRes.ok || !transactionsRes.ok) {
        throw new Error('Não foi possível carregar os dados do app.');
      }

      const dashboardData = await dashboardRes.json();
      const suggestionsData = await suggestionsRes.json();
      const membersData = await membersRes.json();
      const transactionsData = await transactionsRes.json();

      setDashboard(dashboardData);
      setSuggestions(suggestionsData.suggestions || []);
      setMembers(membersData.members || []);
      setTransactions(transactionsData.transactions || []);
    } catch (err) {
      setError(err.message || 'Erro ao buscar dados.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount)
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao salvar transação.');
      }

      setForm({ ...initialForm, memberId: form.memberId, type: form.type });
      await loadAll();
    } catch (err) {
      setError(err.message || 'Erro ao salvar transação.');
    } finally {
      setSaving(false);
    }
  }

  const topCategory = useMemo(() => {
    if (!dashboard?.categories?.length) return null;
    return dashboard.categories[0];
  }, [dashboard]);

  if (loading) return <main className="page"><p>Carregando dashboard familiar...</p></main>;
  if (error && !dashboard) return <main className="page"><p className="error">{error}</p></main>;

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="badge">Planejamento Familiar</p>
          <h1>Controle de Finanças: você + esposa</h1>
          <p className="subtitle">Acompanhe despesas de cada membro, veja os totais do mês e registre novas movimentações em segundos.</p>
        </div>
        <div className="hero-card">
          <p>Mês de referência</p>
          <strong>{dashboard.month}</strong>
          <span>Taxa de poupança {dashboard.savingsRate}%</span>
        </div>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="cards">
        <article className="card">
          <p>Receitas</p>
          <strong>{currency.format(dashboard.income)}</strong>
        </article>
        <article className="card expense">
          <p>Despesas</p>
          <strong>{currency.format(dashboard.expenses)}</strong>
        </article>
        <article className="card">
          <p>Saldo</p>
          <strong>{currency.format(dashboard.balance)}</strong>
        </article>
      </section>

      <section className="member-grid">
        {dashboard.byMember.map((member) => (
          <article key={member.memberId} className="member-card">
            <h3>{member.memberName}</h3>
            <p>Receitas: <strong>{currency.format(member.income)}</strong></p>
            <p>Despesas: <strong>{currency.format(member.expenses)}</strong></p>
            <p>Saldo: <strong>{currency.format(member.balance)}</strong></p>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel">
          <h2>Lançar receita/despesa</h2>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Membro
              <select
                value={form.memberId}
                onChange={(event) => setForm((old) => ({ ...old, memberId: event.target.value }))}
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </label>

            <label>
              Tipo
              <select
                value={form.type}
                onChange={(event) => setForm((old) => ({ ...old, type: event.target.value }))}
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </label>

            <label>
              Categoria
              <input
                value={form.category}
                onChange={(event) => setForm((old) => ({ ...old, category: event.target.value }))}
                placeholder="Ex.: Mercado"
              />
            </label>

            <label>
              Descrição
              <input
                value={form.description}
                onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))}
                placeholder="Ex.: Compra semanal"
              />
            </label>

            <label>
              Valor (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm((old) => ({ ...old, amount: event.target.value }))}
                placeholder="0,00"
              />
            </label>

            <label>
              Data
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm((old) => ({ ...old, date: event.target.value }))}
              />
            </label>

            <button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar lançamento'}</button>
          </form>
        </article>

        <article className="panel">
          <h2>Para onde o dinheiro está indo</h2>
          <ul className="category-list">
            {dashboard.categories.map((category) => {
              const percent = dashboard.expenses > 0 ? (category.amount / dashboard.expenses) * 100 : 0;
              return (
                <li key={category.name}>
                  <div className="category-row">
                    <span>{category.name}</span>
                    <strong>{currency.format(category.amount)}</strong>
                  </div>
                  <div className="progress">
                    <div style={{ width: `${Math.min(percent, 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <h2>Sugestões automáticas</h2>
          <ul className="suggestions">
            {suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
          </ul>
        </article>

        <article className="panel">
          <h2>Últimos lançamentos</h2>
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
                {transactions.slice(0, 8).map((item) => {
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
          Maior categoria de despesa no mês: <strong>{topCategory.name}</strong> ({currency.format(topCategory.amount)}).
        </footer>
      ) : null}
    </main>
  );
}

export default App;
