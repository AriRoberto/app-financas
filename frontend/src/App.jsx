import { useEffect, useMemo, useState } from 'react';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function getPresetRange(preset) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  if (preset === 'month') {
    return { from: `${yyyy}-${mm}-01`, to: `${yyyy}-${mm}-31` };
  }
  if (preset === 'last3months') {
    const fromDate = new Date(Date.UTC(yyyy, now.getUTCMonth() - 2, 1));
    const from = `${fromDate.getUTCFullYear()}-${String(fromDate.getUTCMonth() + 1).padStart(2, '0')}-01`;
    return { from, to: `${yyyy}-${mm}-31` };
  }
  if (preset === 'year') {
    return { from: `${yyyy}-01-01`, to: `${yyyy}-12-31` };
  }
  return { from: '', to: '' };
}

const initialForm = {
  memberId: 'husband',
  type: 'expense',
  category: 'Alimentação',
  description: '',
  amount: '',
  month: currentMonth(),
  date: '',
  dueDate: '',
  isInvestmentReserve: false
};

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [members, setMembers] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [investmentCategories, setInvestmentCategories] = useState([]);
  const [descriptionTemplates, setDescriptionTemplates] = useState([]);
  const [months, setMonths] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [investments, setInvestments] = useState({ total: 0, investments: [] });
  const [form, setForm] = useState(initialForm);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [selectedMember, setSelectedMember] = useState('all');
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [periodPreset, setPeriodPreset] = useState('month');
  const [fromDate, setFromDate] = useState(getPresetRange('month').from);
  const [toDate, setToDate] = useState(getPresetRange('month').to);
  const [reportData, setReportData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currentCategories = useMemo(() => {
    if (form.type === 'income') return incomeCategories;
    if (form.type === 'investment') return investmentCategories;
    return expenseCategories;
  }, [form.type, incomeCategories, investmentCategories, expenseCategories]);

  async function loadDescriptionTemplates(type, category) {
    const response = await fetch(`${API_URL}/api/description-templates?type=${type}&category=${encodeURIComponent(category || '')}`);
    const data = await response.json();
    setDescriptionTemplates(data.templates || []);
  }

  function queryParams(month = selectedMonth) {
    return new URLSearchParams({
      month,
      member: selectedMember,
      term: selectedTerm,
      from: fromDate,
      to: toDate
    }).toString();
  }

  async function loadStaticData() {
    const [membersRes, categoriesRes] = await Promise.all([
      fetch(`${API_URL}/api/members`),
      fetch(`${API_URL}/api/categories`)
    ]);

    const membersData = await membersRes.json();
    const categoriesData = await categoriesRes.json();

    setMembers(membersData.members || []);
    setExpenseCategories(categoriesData.expenseCategories || categoriesData.categories || []);
    setIncomeCategories(categoriesData.incomeCategories || []);
    setInvestmentCategories(categoriesData.investmentCategories || []);

    const category = categoriesData.expenseCategories?.[0] || 'Outros';
    setForm((old) => ({ ...old, memberId: membersData.members?.[0]?.id || 'husband', category }));
    await loadDescriptionTemplates('expense', category);
  }

  async function loadData(month = selectedMonth) {
    const params = queryParams(month);
    const [dashboardRes, suggestionsRes, transactionsRes, monthsRes, reportRes, investmentsRes] = await Promise.all([
      fetch(`${API_URL}/api/dashboard?${params}`),
      fetch(`${API_URL}/api/suggestions?${params}`),
      fetch(`${API_URL}/api/transactions?${params}`),
      fetch(`${API_URL}/api/months?member=${selectedMember}`),
      fetch(`${API_URL}/reports/expenses-by-category?member=${selectedMember}&from=${fromDate}&to=${toDate}`),
      fetch(`${API_URL}/api/investments?member=${selectedMember}&from=${fromDate}&to=${toDate}`)
    ]);

    const dashboardData = await dashboardRes.json();
    const suggestionsData = await suggestionsRes.json();
    const transactionsData = await transactionsRes.json();
    const monthsData = await monthsRes.json();
    const reportJson = await reportRes.json();
    const investmentsJson = await investmentsRes.json();

    setDashboard(dashboardData);
    setSuggestions(suggestionsData.suggestions || []);
    setTransactions(transactionsData.transactions || []);
    setMonths(monthsData.months || []);
    setReportData(reportJson.categories || []);
    setInvestments(investmentsJson);
  }

  async function boot() {
    setLoading(true);
    setError('');
    try {
      await loadStaticData();
      await loadData(selectedMonth);
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    boot();
  }, []);

  useEffect(() => {
    if (!loading) loadData(selectedMonth).catch((err) => setError(err.message));
  }, [selectedMember, selectedTerm, fromDate, toDate]);

  useEffect(() => {
    if (!reportData.length) {
      setSelectedCategory('');
      return;
    }

    const exists = reportData.some((item) => item.category === selectedCategory);
    if (!exists) setSelectedCategory(reportData[0].category);
  }, [reportData, selectedCategory]);

  async function submitTransaction(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        isInvestmentReserve: form.type === 'expense' && (form.isInvestmentReserve || form.category === 'Reserva para investir')
      };
      const response = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao salvar.');
      }

      await loadData(selectedMonth);
      setForm((old) => ({ ...old, description: '', amount: '', date: '', dueDate: '', isInvestmentReserve: false }));
    } catch (err) {
      setError(err.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRestoreDemoData() {
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/transactions/seed`, { method: 'POST' });
      if (!response.ok) {
        throw new Error('Não foi possível restaurar os dados de exemplo.');
      }
      await loadData(selectedMonth);
    } catch (err) {
      setError(err.message || 'Erro ao restaurar os dados de exemplo.');
    }
  }

  function changePreset(nextPreset) {
    setPeriodPreset(nextPreset);
    const range = getPresetRange(nextPreset);
    setFromDate(range.from);
    setToDate(range.to);
  }

  const selectedCategoryData = useMemo(
    () => reportData.find((item) => item.category === selectedCategory) || null,
    [reportData, selectedCategory]
  );

  const pieStyle = useMemo(() => {
    if (!selectedCategoryData) return { background: '#e2e8f0' };

    const selectedPercent = selectedCategoryData.percentage;
    const otherPercent = Math.max(0, 100 - selectedPercent);

    return {
      background: `conic-gradient(#2563eb 0% ${selectedPercent}%, #cbd5e1 ${selectedPercent}% ${selectedPercent + otherPercent}%)`
    };
  }, [selectedCategoryData]);

  if (loading) return <main className="page"><p>Carregando...</p></main>;

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="badge">Multi-membro + Despesas + Investimentos</p>
          <h1>Controle de Finanças Familiar</h1>
        </div>
      </section>

      <section className="filters">
        <label>Membro
          <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)}>
            <option value="all">Todos</option>
            {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
        </label>
        <label>Prazo
          <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}>
            <option value="all">Todos</option>
            <option value="short">Curto</option>
            <option value="medium">Médio</option>
            <option value="long">Longo</option>
          </select>
        </label>
        <label>Período
          <select value={periodPreset} onChange={(e) => changePreset(e.target.value)}>
            <option value="month">Mês atual</option>
            <option value="last3months">Últimos 3 meses</option>
            <option value="year">Ano corrente</option>
            <option value="custom">Customizado</option>
          </select>
        </label>
        <label>De
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label>Até
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <label>Mês analisado
          <select value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); loadData(e.target.value); }}>
            {(months.length ? months : [selectedMonth]).map((month) => <option key={month} value={month}>{month}</option>)}
          </select>
        </label>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="cards">
        <article className="card"><p>Receita total</p><strong>{currency.format(dashboard?.income || 0)}</strong></article>
        <article className="card expense"><p>Despesas</p><strong>{currency.format(dashboard?.expenses || 0)}</strong></article>
        <article className="card investment"><p>Investimento espelhado</p><strong>{currency.format(dashboard?.investments || 0)}</strong></article>
        <article className="card"><p>Total investido (aba)</p><strong>{currency.format(investments.total || 0)}</strong></article>
      </section>

      <section className="member-income-grid">
        {dashboard?.byMember?.map((member) => (
          <article className="card" key={member.memberId}>
            <p>{member.memberName}</p>
            <strong>{currency.format(member.income)}</strong>
            <small>Despesas: {currency.format(member.expenses)}</small>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel">
          <h2>Cadastro de lançamentos</h2>
          <form onSubmit={submitTransaction} className="form-grid">
            <label>Membro
              <select value={form.memberId} onChange={(e) => setForm((old) => ({ ...old, memberId: e.target.value }))}>
                {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
            <label>Tipo
              <select value={form.type} onChange={async (e) => {
                const nextType = e.target.value;
                const nextCategory = nextType === 'income'
                  ? incomeCategories[0]
                  : nextType === 'investment'
                    ? investmentCategories[0]
                    : expenseCategories[0];
                setForm((old) => ({ ...old, type: nextType, category: nextCategory }));
                await loadDescriptionTemplates(nextType, nextCategory);
              }}>
                <option value="expense">Despesa</option>
                <option value="investment">Investimento</option>
                <option value="income">Receita</option>
              </select>
            </label>
            <label>Categoria
              <select value={form.category} onChange={async (e) => {
                const nextCategory = e.target.value;
                setForm((old) => ({ ...old, category: nextCategory }));
                await loadDescriptionTemplates(form.type, nextCategory);
              }}>
                {currentCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label>Descrição
              <input list="desc-templates" value={form.description} onChange={(e) => setForm((old) => ({ ...old, description: e.target.value }))} />
              <datalist id="desc-templates">{descriptionTemplates.map((item) => <option key={item} value={item} />)}</datalist>
            </label>
            <label>Valor
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((old) => ({ ...old, amount: e.target.value }))} />
            </label>
            <label>Mês
              <input type="month" value={form.month} onChange={(e) => setForm((old) => ({ ...old, month: e.target.value }))} />
            </label>
            <label>Data
              <input type="date" value={form.date} onChange={(e) => setForm((old) => ({ ...old, date: e.target.value }))} />
            </label>
            <label>Vencimento (prazo)
              <input type="date" value={form.dueDate} onChange={(e) => setForm((old) => ({ ...old, dueDate: e.target.value }))} />
            </label>
            {form.type === 'expense' ? (
              <label className="checkbox">
                <input type="checkbox" checked={form.isInvestmentReserve} onChange={(e) => setForm((old) => ({ ...old, isInvestmentReserve: e.target.checked }))} />
                Reserva para investir
              </label>
            ) : null}
            <div className="form-actions">
              <button disabled={saving} type="submit">{saving ? 'Salvando...' : 'Salvar'}</button>
              <button type="button" className="ghost" onClick={handleRestoreDemoData}>Restaurar dados de exemplo</button>
            </div>
          </form>
        </article>

        <article className="panel">
          <h2>Quadro de categorias + gráfico por categoria</h2>
          <p className="panel-help">Clique em uma categoria de despesa para ver o gráfico de pizza ao lado.</p>
          <div className="category-insights">
            <ul className="category-list clickable">
              {reportData.map((item) => (
                <li key={item.category}>
                  <button
                    type="button"
                    className={selectedCategory === item.category ? 'category-btn active' : 'category-btn'}
                    onClick={() => setSelectedCategory(item.category)}
                  >
                    <span>{item.category}</span>
                    <strong>{currency.format(item.total)} ({item.percentage}%)</strong>
                  </button>
                </li>
              ))}
            </ul>

            <div className="selected-category-chart">
              <div className="pie" style={pieStyle} />
              {selectedCategoryData ? (
                <p>
                  <strong>{selectedCategoryData.category}</strong> representa {selectedCategoryData.percentage}% das despesas no período.
                </p>
              ) : (
                <p>Sem dados para o período selecionado.</p>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <h2>Totais por prazo</h2>
          <ul className="category-list">
            {dashboard?.termTotals?.map((item) => (
              <li key={item.term}>{item.term}: {currency.format(item.total)}</li>
            ))}
          </ul>
          <h3>Sugestões</h3>
          <ul className="suggestions">{suggestions.map((text) => <li key={text}>{text}</li>)}</ul>
        </article>

        <article className="panel">
          <h2>Lançamentos</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Data</th><th>Membro</th><th>Tipo</th><th>Categoria</th><th>Prazo</th><th>Valor</th></tr></thead>
              <tbody>
                {transactions.map((item) => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td>{item.memberId}</td>
                    <td>{item.type}</td>
                    <td>{item.category}</td>
                    <td>{item.term || '-'}</td>
                    <td>{currency.format(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}

export default App;
