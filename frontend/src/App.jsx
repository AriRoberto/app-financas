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

function labelByType(type) {
  if (type === 'income') return 'Receita';
  if (type === 'investment') return 'Investimento';
  return 'Despesa';
}

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [members, setMembers] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [investmentCategories, setInvestmentCategories] = useState([]);
  const [descriptionTemplates, setDescriptionTemplates] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  const currentCategories = useMemo(() => {
    if (form.type === 'investment') return investmentCategories;
    if (form.type === 'income') return ['Salário', 'Renda extra', 'Freelance', 'Bônus'];
    return expenseCategories;
  }, [form.type, expenseCategories, investmentCategories]);

  async function loadDescriptionTemplates(type, category) {
    const response = await fetch(`${API_URL}/api/description-templates?type=${type}&category=${encodeURIComponent(category || '')}`);

    if (!response.ok) {
      throw new Error('Não foi possível carregar sugestões de descrição.');
    }

    const data = await response.json();
    setDescriptionTemplates(data.templates || []);
  }

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

    const expenseData = categoriesData.expenseCategories || categoriesData.categories || [];
    const investmentData = categoriesData.investmentCategories || [];

    setMembers(membersData.members || []);
    setExpenseCategories(expenseData);
    setInvestmentCategories(investmentData);
    setMonths(availableMonths);
    setSelectedMonth(preferredMonth);

    const nextCategory = expenseData[0] || 'Outros';
    setForm((old) => ({
      ...old,
      memberId: membersData.members?.[0]?.id || 'you',
      type: 'expense',
      category: nextCategory,
      month: preferredMonth || currentMonth()
    }));

    await loadDescriptionTemplates('expense', nextCategory);
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

  async function handleTypeOrCategoryChange(nextType, nextCategory) {
    setForm((old) => ({ ...old, type: nextType, category: nextCategory }));

    try {
      await loadDescriptionTemplates(nextType, nextCategory);
    } catch (err) {
      setDescriptionTemplates([]);
      setError(err.message || 'Erro ao atualizar sugestões de descrição.');
    }
  }

  async function handleClearDemoData() {
    const confirmed = window.confirm('Isso vai apagar todos os lançamentos atuais, incluindo os de exemplo. Deseja continuar?');

    if (!confirmed) return;

    setResetting(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/transactions`, { method: 'DELETE' });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao limpar dados.');
      }

      const defaultMonth = currentMonth();
      setSelectedMonth(defaultMonth);
      await boot();
      setForm((old) => ({ ...old, month: defaultMonth, description: '', amount: '', date: '' }));
    } catch (err) {
      setError(err.message || 'Erro ao limpar dados.');
    } finally {
      setResetting(false);
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
  const monthOptions = months.length ? months : [selectedMonth];

  if (loading) return <main className="page"><p>Carregando painel financeiro...</p></main>;
  if (!dashboard) return <main className="page"><p className="error">{error || 'Sem dados disponíveis.'}</p></main>;

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="badge">Cadastro e Comparação de Despesas + Investimentos</p>
          <h1>Controle Familiar com Histórico Mensal</h1>
          <p className="subtitle">Cadastre despesas, investimentos e receitas para comparar evolução, visualizar renda individual e projeção de saídas.</p>
        </div>
        <div className="hero-card">
          <label>
            Mês analisado
            <select value={selectedMonth} onChange={(event) => handleMonthChange(event.target.value)}>
              {monthOptions.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </label>
          <span>Projeção de saídas no próximo mês: {currency.format(dashboard.projection.projectedNextMonthOutflow)}</span>
        </div>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="cards">
        <article className="card">
          <p>Receita total da família</p>
          <strong>{currency.format(dashboard.income)}</strong>
        </article>
        <article className="card expense">
          <p>Despesas do mês</p>
          <strong>{currency.format(dashboard.expenses)}</strong>
        </article>
        <article className="card investment">
          <p>Investimentos do mês</p>
          <strong>{currency.format(dashboard.investments)}</strong>
        </article>
        <article className="card">
          <p>Saldo final do mês</p>
          <strong>{currency.format(dashboard.balance)}</strong>
        </article>
        <article className="card">
          <p>Comparação de saídas com mês anterior</p>
          <strong className={dashboard.comparison.differenceFromPrevious > 0 ? 'negative' : 'positive'}>
            {dashboard.comparison.previousMonth
              ? `${dashboard.comparison.differenceFromPrevious > 0 ? '+' : ''}${currency.format(dashboard.comparison.differenceFromPrevious)}`
              : 'Sem histórico'}
          </strong>
        </article>
      </section>

      <section className="member-income-grid">
        {dashboard.byMember.map((member) => (
          <article className="card" key={member.memberId}>
            <p>Receita individual - {member.memberName}</p>
            <strong>{currency.format(member.income)}</strong>
            <small>Despesas: {currency.format(member.expenses)} | Investimentos: {currency.format(member.investments)}</small>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel">
          <h2>Tela de cadastro de lançamentos</h2>
          <p className="panel-help">
            Quer começar do zero com os seus valores reais? Clique em <strong>"Zerar dados de exemplo"</strong> e depois cadastre despesas, investimentos e receitas.
          </p>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Membro
              <select value={form.memberId} onChange={(event) => setForm((old) => ({ ...old, memberId: event.target.value }))}>
                {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
            <label>
              Tipo
              <select
                value={form.type}
                onChange={async (event) => {
                  const nextType = event.target.value;
                  const categoriesByType = nextType === 'investment'
                    ? investmentCategories
                    : nextType === 'income'
                      ? ['Salário', 'Renda extra', 'Freelance', 'Bônus']
                      : expenseCategories;
                  const nextCategory = categoriesByType[0] || 'Outros';
                  await handleTypeOrCategoryChange(nextType, nextCategory);
                }}
              >
                <option value="expense">Despesa</option>
                <option value="investment">Investimento</option>
                <option value="income">Receita</option>
              </select>
            </label>
            <label>
              Categoria
              <select
                value={form.category}
                onChange={async (event) => {
                  const nextCategory = event.target.value;
                  await handleTypeOrCategoryChange(form.type, nextCategory);
                }}
              >
                {currentCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label>
              Mês de competência
              <input type="month" value={form.month} onChange={(event) => setForm((old) => ({ ...old, month: event.target.value }))} />
            </label>
            <label>
              Descrição (com modelos + digitação livre)
              <input
                list="description-models"
                value={form.description}
                onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))}
                placeholder="Ex.: Mercado semanal"
              />
              <datalist id="description-models">
                {descriptionTemplates.map((template) => <option key={template} value={template} />)}
              </datalist>
            </label>
            <label>
              Valor (R$)
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm((old) => ({ ...old, amount: event.target.value }))} placeholder="0,00" />
            </label>
            <label>
              Data (opcional)
              <input type="date" value={form.date} onChange={(event) => setForm((old) => ({ ...old, date: event.target.value }))} />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar lançamento'}</button>
              <button type="button" className="ghost danger" onClick={handleClearDemoData} disabled={resetting}>
                {resetting ? 'Limpando...' : 'Zerar dados de exemplo'}
              </button>
            </div>
          </form>
        </article>

        <article className="panel">
          <h2>Categorias e projeção de saídas</h2>
          <ul className="category-list">
            {dashboard.categories.map((category) => {
              const percent = dashboard.outflow > 0 ? (category.amount / dashboard.outflow) * 100 : 0;
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
                  <th>Investimentos</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.monthlyHistory.map((item) => (
                  <tr key={item.month}>
                    <td>{item.month}</td>
                    <td className="positive">{currency.format(item.income)}</td>
                    <td className="negative">{currency.format(item.expenses)}</td>
                    <td className="investment-text">{currency.format(item.investments)}</td>
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
                      <td>{labelByType(item.type)}</td>
                      <td>{item.category}</td>
                      <td>{item.description}</td>
                      <td className={item.type === 'income' ? 'positive' : item.type === 'investment' ? 'investment-text' : 'negative'}>{currency.format(item.amount)}</td>
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
          Maior categoria de saída no mês selecionado: <strong>{topCategory.name}</strong> ({currency.format(topCategory.amount)}).
        </footer>
      ) : null}
    </main>
  );
}

export default App;
