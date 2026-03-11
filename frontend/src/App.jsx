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


function capitalizeFirst(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function memberLabel(memberId) {
  const labels = {
    husband: 'Marido',
    wife: 'Esposa',
    family: 'Familia'
  };
  return labels[memberId] || capitalizeFirst(memberId);
}

function typeLabel(type) {
  const labels = {
    expense: 'Despesa',
    income: 'Receita',
    investment: 'Investimento'
  };
  return labels[type] || type;
}

function termLabel(term) {
  const labels = {
    short: 'Curto prazo',
    medium: 'Médio prazo',
    long: 'Longo prazo'
  };
  return labels[term] || '-';
}


function recoverySeverityClass(level) {
  if (level >= 3) return 'critical';
  if (level >= 2) return 'risk';
  if (level >= 1) return 'attention';
  return 'stable';
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
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const [connectingBank, setConnectingBank] = useState(false);
  const [bankInstitution, setBankInstitution] = useState('BB');
  const [bankInstitutions, setBankInstitutions] = useState([]);
  const [bankConnections, setBankConnections] = useState([]);
  const [recoveryPlan, setRecoveryPlan] = useState(null);

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
    const [membersRes, categoriesRes, institutionsRes] = await Promise.all([
      fetch(`${API_URL}/api/members`),
      fetch(`${API_URL}/api/categories`),
      fetch(`${API_URL}/api/banks/institutions`)
    ]);

    const membersData = await membersRes.json();
    const categoriesData = await categoriesRes.json();
    const institutionsData = await institutionsRes.json();

    setMembers(membersData.members || []);
    setExpenseCategories(categoriesData.expenseCategories || categoriesData.categories || []);
    setIncomeCategories(categoriesData.incomeCategories || []);
    setInvestmentCategories(categoriesData.investmentCategories || []);
    setBankInstitutions(institutionsData.institutions || []);

    const category = categoriesData.expenseCategories?.[0] || 'Outros';
    setForm((old) => ({ ...old, memberId: membersData.members?.[0]?.id || 'husband', category }));
    await loadDescriptionTemplates('expense', category);
  }

  async function loadData(month = selectedMonth) {
    const params = queryParams(month);
    const [dashboardRes, suggestionsRes, transactionsRes, monthsRes, investmentsRes, bankConnectionsRes, recoveryPlanRes] = await Promise.all([
      fetch(`${API_URL}/api/dashboard?${params}`),
      fetch(`${API_URL}/api/suggestions?${params}`),
      fetch(`${API_URL}/api/transactions?${params}`),
      fetch(`${API_URL}/api/months?member=${selectedMember}`),
      fetch(`${API_URL}/api/investments?member=${selectedMember}&from=${fromDate}&to=${toDate}`),
      fetch(`${API_URL}/api/banks/connections`),
      fetch(`${API_URL}/api/recovery/plan?${params}`)
    ]);

    const dashboardData = await dashboardRes.json();
    const suggestionsData = await suggestionsRes.json();
    const transactionsData = await transactionsRes.json();
    const monthsData = await monthsRes.json();
    const investmentsJson = await investmentsRes.json();
    const connectionsJson = await bankConnectionsRes.json();
    const recoveryPlanJson = await recoveryPlanRes.json();

    setDashboard(dashboardData);
    setSuggestions(suggestionsData.suggestions || []);
    setTransactions(transactionsData.transactions || []);
    setMonths(monthsData.months || []);
    setInvestments(investmentsJson);
    setBankConnections(connectionsJson.connections || []);
    setRecoveryPlan(recoveryPlanJson);
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

  const categoriesByType = useMemo(() => {
    const grouped = {
      expense: {},
      income: {},
      investment: {}
    };

    transactions.forEach((item) => {
      if (!grouped[item.type]) return;
      grouped[item.type][item.category] = (grouped[item.type][item.category] || 0) + item.amount;
    });

    const normalize = (type) => {
      const rows = Object.entries(grouped[type])
        .map(([category, total]) => ({ type, category, total }))
        .sort((a, b) => b.total - a.total);

      const totalByType = rows.reduce((sum, row) => sum + row.total, 0);

      return rows.map((row) => ({
        ...row,
        percentage: totalByType > 0 ? Number(((row.total / totalByType) * 100).toFixed(2)) : 0,
        totalByType,
        key: `${row.type}:${row.category}`
      }));
    };

    return {
      expense: normalize('expense'),
      income: normalize('income'),
      investment: normalize('investment')
    };
  }, [transactions]);

  const allCategoryRows = useMemo(
    () => [...categoriesByType.expense, ...categoriesByType.income, ...categoriesByType.investment],
    [categoriesByType]
  );

  useEffect(() => {
    if (!allCategoryRows.length) {
      setSelectedCategoryKey('');
      return;
    }

    const exists = allCategoryRows.some((item) => item.key === selectedCategoryKey);
    if (!exists) setSelectedCategoryKey(allCategoryRows[0].key);
  }, [allCategoryRows, selectedCategoryKey]);



  async function openPluggyWidget(connectToken, state) {
    if (!window.PluggyConnect) {
      throw new Error('Pluggy Connect indisponível no navegador.');
    }

    return new Promise((resolve, reject) => {
      const pluggy = new window.PluggyConnect({
        connectToken,
        includeSandbox: true,
        onSuccess: async (itemData) => {
          try {
            const itemId = itemData?.itemId || itemData?.item?.id;
            const callbackRes = await fetch(`${API_URL}/api/banks/callback?state=${encodeURIComponent(state)}&itemId=${encodeURIComponent(itemId || '')}`);
            if (!callbackRes.ok) throw new Error('Falha ao concluir callback com item Pluggy.');
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        onError: () => reject(new Error('Falha no fluxo Pluggy Connect.')),
        onClose: () => reject(new Error('Conexão cancelada pelo usuário.'))
      });
      pluggy.init();
    });
  }

  async function handleConnectBank() {
    setConnectingBank(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/banks/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution_key: bankInstitution, scopes: ['accounts', 'transactions'] })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Não foi possível conectar o banco.');

      if (data.status === 'UNSUPPORTED') {
        await loadData(selectedMonth);
        throw new Error(data.message || 'Instituição ainda não suportada pelo agregador.');
      }

      if (data.redirectUrl) {
        const callbackResponse = await fetch(data.redirectUrl);
        if (!callbackResponse.ok) {
          throw new Error('Falha ao concluir consentimento da conexão bancária.');
        }
      } else if (data.connectToken && data.state) {
        await openPluggyWidget(data.connectToken, data.state);
      } else {
        throw new Error('Resposta inválida ao iniciar conexão bancária.');
      }

      await loadData(selectedMonth);
    } catch (err) {
      setError(err.message || 'Erro ao conectar banco.');
    } finally {
      setConnectingBank(false);
    }
  }

  async function handleRevokeConnection(connectionId) {
    try {
      const response = await fetch(`${API_URL}/api/banks/${connectionId}/revoke`, { method: 'POST' });
      if (!response.ok) throw new Error('Falha ao revogar conexão.');
      await loadData(selectedMonth);
    } catch (err) {
      setError(err.message || 'Erro ao revogar conexão.');
    }
  }

  async function handleSyncConnection(connectionId) {
    try {
      const response = await fetch(`${API_URL}/api/banks/${connectionId}/sync`, { method: 'POST' });
      if (!response.ok) throw new Error('Falha ao sincronizar conexão.');
      await loadData(selectedMonth);
    } catch (err) {
      setError(err.message || 'Erro ao sincronizar conexão.');
    }
  }

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


  async function handleClearDemoData() {
    const confirmed = window.confirm('Isso vai limpar todos os dados atuais (inclusive lançamentos reais). Deseja continuar?');
    if (!confirmed) return;

    setClearing(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/transactions`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Não foi possível limpar os dados de teste.');
      }
      await loadData(selectedMonth);
    } catch (err) {
      setError(err.message || 'Erro ao limpar os dados de teste.');
    } finally {
      setClearing(false);
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
    () => allCategoryRows.find((item) => item.key === selectedCategoryKey) || null,
    [allCategoryRows, selectedCategoryKey]
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
            {members.map((member) => <option key={member.id} value={member.id}>{memberLabel(member.id)}</option>)}
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

      {recoveryPlan?.entryPoints?.passive?.shouldSurface ? (
        <section className={`panel recovery-alert ${recoverySeverityClass(recoveryPlan.severity)}`}>
          <h2>Plano de recuperação financeira</h2>
          <p>{recoveryPlan.entryPoints.passive.message}</p>
          <p><strong>Próxima ação recomendada:</strong> {recoveryPlan.nextBestAction?.title}</p>
        </section>
      ) : null}


      <section className="panel bank-panel">
        <h2>Conectar banco (Open Finance / AISP)</h2>
        <p className="panel-help">Conexão com consentimento explícito: BB, Itaú, CEF, Santander, Nubank ou Bradesco.</p>
        <div className="bank-connect-row">
          <select value={bankInstitution} onChange={(e) => setBankInstitution(e.target.value)}>
            {(bankInstitutions.length ? bankInstitutions : [
              { key: 'BB', name: 'Banco do Brasil' },
              { key: 'ITAU', name: 'Itaú' },
              { key: 'CEF', name: 'Caixa (CEF)' },
              { key: 'SANTANDER', name: 'Santander' },
              { key: 'NUBANK', name: 'Nubank' },
              { key: 'BRADESCO', name: 'Bradesco' }
            ]).map((institution) => (
              <option key={institution.key} value={institution.key}>{institution.name}</option>
            ))}
          </select>
          <button type="button" onClick={handleConnectBank} disabled={connectingBank}>
            {connectingBank ? 'Conectando...' : 'Conectar Banco'}
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Instituição</th>
                <th>Status</th>
                <th>Escopos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {bankConnections.map((conn) => (
                <tr key={conn.id}>
                  <td>{conn.institution}</td>
                  <td>{String(conn.status || "-").toUpperCase()}</td>
                  <td>{conn.consent?.scopes?.join(', ') || '-'}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="ghost" onClick={() => handleSyncConnection(conn.id)}>Sincronizar</button>
                      <button type="button" className="ghost danger" onClick={() => handleRevokeConnection(conn.id)}>Revogar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!bankConnections.length ? (
                <tr><td colSpan="4">Sem conexões bancárias.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>


      <section className="cards">
        <article className="card"><p>Receita total</p><strong>{currency.format(dashboard?.income || 0)}</strong></article>
        <article className="card expense"><p>Despesas</p><strong>{currency.format(dashboard?.expenses || 0)}</strong></article>
        <article className="card investment"><p>Investimento espelhado</p><strong>{currency.format(dashboard?.investments || 0)}</strong></article>
        <article className="card"><p>Total investido (aba)</p><strong>{currency.format(investments.total || 0)}</strong></article>
      </section>

      <section className="member-income-grid">
        {dashboard?.byMember?.map((member) => (
          <article className="card" key={member.memberId}>
            <p>{memberLabel(member.memberId)}</p>
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
                {members.map((member) => <option key={member.id} value={member.id}>{memberLabel(member.id)}</option>)}
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
              <button type="button" className="ghost" onClick={handleRestoreDemoData}>Trazer dados de teste</button>
              <button type="button" className="ghost danger" disabled={clearing} onClick={handleClearDemoData}>
                {clearing ? 'Limpando...' : 'Limpar dados de teste'}
              </button>
            </div>
          </form>
        </article>

        <article className="panel">
          <h2>Quadro de categorias + gráfico por categoria</h2>
          <p className="panel-help">Clique em uma categoria para ver o gráfico ao lado (despesas, receitas e investimentos).</p>
          <div className="category-insights">
            <ul className="category-list clickable">
              {[
                { type: 'expense', title: 'Despesas', rows: categoriesByType.expense },
                { type: 'income', title: 'Receitas', rows: categoriesByType.income },
                { type: 'investment', title: 'Investimentos', rows: categoriesByType.investment }
              ].map((group) => (
                <li key={group.type}>
                  <p className="group-title">{group.title}</p>
                  <ul className="category-list clickable nested">
                    {group.rows.map((item) => (
                      <li key={item.key}>
                        <button
                          type="button"
                          className={selectedCategoryKey === item.key ? 'category-btn active' : 'category-btn'}
                          onClick={() => setSelectedCategoryKey(item.key)}
                        >
                          <span>{item.category}</span>
                          <strong>{currency.format(item.total)} ({item.percentage}%)</strong>
                        </button>
                      </li>
                    ))}
                    {!group.rows.length ? <li className="empty-row">Sem lançamentos.</li> : null}
                  </ul>
                </li>
              ))}
            </ul>

            <div className="selected-category-chart">
              <div className="pie" style={pieStyle} />
              {selectedCategoryData ? (
                <p>
                  <strong>{selectedCategoryData.category}</strong> representa {selectedCategoryData.percentage}% dentro de{' '}
                  <strong>{selectedCategoryData.type === 'expense' ? 'despesas' : selectedCategoryData.type === 'income' ? 'receitas' : 'investimentos'}</strong> no período.
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
              <li key={item.term}>{termLabel(item.term)}: {currency.format(item.total)}</li>
            ))}
          </ul>
          <h3>Sugestões</h3>
          <ul className="suggestions">{suggestions.map((text) => <li key={text}>{text}</li>)}</ul>
        </article>


        <article className="panel recovery-module">
          <h2>Plano de recuperação financeira</h2>
          <p className="panel-help">Ferramenta de apoio com orientações práticas por prazo para estabilizar e evoluir sua vida financeira.</p>

          {recoveryPlan ? (
            <>
              <p className={`severity-badge ${recoverySeverityClass(recoveryPlan.severity)}`}>
                Nível atual: <strong>{recoveryPlan.severityLabel}</strong> (score {recoveryPlan.score})
              </p>
              <p>{recoveryPlan.summary}</p>

              <div className="recovery-metrics">
                <div><span>Saldo de caixa projetado</span><strong>{currency.format(recoveryPlan.metrics.saldoCaixaProjetado || 0)}</strong></div>
                <div><span>Comprometimento com dívida</span><strong>{((recoveryPlan.metrics.comprometimentoRendaDivida || 0) * 100).toFixed(0)}%</strong></div>
                <div><span>Reserva estimada</span><strong>{(recoveryPlan.metrics.reservaMeses || 0).toFixed(1)} meses</strong></div>
              </div>

              <h3>Ações por prazo</h3>
              <div className="recovery-horizons">
                <div>
                  <h4>Curto prazo (0-3 meses)</h4>
                  <ul className="suggestions">
                    {recoveryPlan.horizons.short.map((action) => <li key={action.id}>{action.title}</li>)}
                  </ul>
                </div>
                <div>
                  <h4>Médio prazo (3-12 meses)</h4>
                  <ul className="suggestions">
                    {recoveryPlan.horizons.medium.map((action) => <li key={action.id}>{action.title}</li>)}
                  </ul>
                </div>
                <div>
                  <h4>Longo prazo (12+ meses)</h4>
                  <ul className="suggestions">
                    {recoveryPlan.horizons.long.map((action) => <li key={action.id}>{action.title}</li>)}
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <p>Carregando plano de recuperação...</p>
          )}
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
                    <td>{memberLabel(item.memberId)}</td>
                    <td>{typeLabel(item.type)}</td>
                    <td>{item.category}</td>
                    <td>{termLabel(item.term)}</td>
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
