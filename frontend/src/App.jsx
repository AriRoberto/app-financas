const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const defaultTransactionForm = {
  memberId: 'husband',
  type: 'expense',
  category: '',
  description: '',
  amount: '',
  month: new Date().toISOString().slice(0, 7),
  date: '',
  dueDate: '',
  isInvestmentReserve: false
};

const defaultImportForm = {
  memberId: 'husband',
  importType: 'transaction',
  month: new Date().toISOString().slice(0, 7),
  fileName: '',
  content: ''
};

function memberLabel(memberId) {
  return {
    husband: 'Marido',
    wife: 'Esposa',
    family: 'Família',
    all: 'Todos'
  }[memberId] || memberId;
}

function typeLabel(type) {
  return {
    income: 'Receita',
    expense: 'Despesa',
    investment: 'Investimento'
  }[type] || type;
}

function termLabel(term) {
  return {
    short: 'Curto prazo',
    medium: 'Médio prazo',
    long: 'Longo prazo'
  }[term] || '-';
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function parseJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'Falha na comunicação com a API.');
  }
  return payload;
}

export function createApp({ root, apiUrl }) {
  const state = {
    loading: true,
    busy: false,
    error: '',
    success: '',
    members: [],
    expenseCategories: [],
    incomeCategories: [],
    investmentCategories: [],
    months: [],
    selectedMember: 'all',
    selectedMonth: new Date().toISOString().slice(0, 7),
    dashboard: null,
    transactions: [],
    investments: { total: 0, investments: [] },
    recoveryPlan: null,
    bankInstitutions: [],
    bankInstitution: 'BB',
    bankConnections: [],
    importHistory: [],
    importPreview: null,
    transactionForm: { ...defaultTransactionForm },
    importForm: { ...defaultImportForm }
  };

  function currentCategoryOptions() {
    if (state.transactionForm.type === 'income') return state.incomeCategories;
    if (state.transactionForm.type === 'investment') return state.investmentCategories;
    return state.expenseCategories;
  }

  function setMessage(type, message) {
    if (type === 'error') {
      state.error = message;
      state.success = '';
    } else {
      state.success = message;
      state.error = '';
    }
    render();
  }

  async function request(path, options) {
    return parseJson(await fetch(`${apiUrl}${path}`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
      ...options
    }));
  }

  async function loadStaticData() {
    const [membersData, categoriesData, institutionsData] = await Promise.all([
      request('/api/members'),
      request('/api/categories'),
      request('/api/banks/institutions')
    ]);

    state.members = membersData.members || [];
    state.expenseCategories = categoriesData.expenseCategories || [];
    state.incomeCategories = categoriesData.incomeCategories || [];
    state.investmentCategories = categoriesData.investmentCategories || [];
    state.bankInstitutions = institutionsData.institutions || [];

    const firstMember = state.members[0]?.id || 'husband';
    state.transactionForm.memberId = firstMember;
    state.importForm.memberId = firstMember;
    state.transactionForm.category = currentCategoryOptions()[0] || '';
    state.bankInstitution = state.bankInstitutions[0]?.key || state.bankInstitution;
  }

  async function loadDynamicData() {
    const member = state.selectedMember || 'all';
    const month = state.selectedMonth;
    const monthParams = new URLSearchParams({ member, month, from: `${month}-01`, to: `${month}-31` });
    const investmentsParams = new URLSearchParams({ member, from: `${month}-01`, to: `${month}-31` });

    const [dashboardData, transactionsData, monthsData, investmentsData, recoveryData, connectionsData, importsData] = await Promise.all([
      request(`/api/dashboard?${monthParams}`),
      request(`/api/transactions?${monthParams}`),
      request(`/api/months?member=${member}`),
      request(`/api/investments?${investmentsParams}`),
      request(`/api/recovery/plan?${monthParams}`),
      request('/api/banks/connections'),
      request('/api/imports/history')
    ]);

    state.dashboard = dashboardData;
    state.transactions = transactionsData.transactions || [];
    state.months = monthsData.months || [];
    state.investments = investmentsData;
    state.recoveryPlan = recoveryData;
    state.bankConnections = connectionsData.connections || [];
    state.importHistory = importsData.imports || [];

    if (!state.months.includes(state.selectedMonth) && state.months[0]) {
      state.selectedMonth = state.months[state.months.length - 1];
    }
  }

  async function refreshData() {
    state.loading = true;
    render();
    try {
      await loadDynamicData();
      state.loading = false;
      render();
    } catch (error) {
      state.loading = false;
      setMessage('error', error.message);
    }
  }

  async function boot() {
    try {
      await loadStaticData();
      await loadDynamicData();
      state.loading = false;
      render();
    } catch (error) {
      state.loading = false;
      setMessage('error', error.message);
    }
  }

  async function runBusy(task, successMessage) {
    state.busy = true;
    render();
    try {
      const result = await task();
      if (successMessage) {
        setMessage('success', successMessage);
      }
      await loadDynamicData();
      state.busy = false;
      render();
      return result;
    } catch (error) {
      state.busy = false;
      setMessage('error', error.message);
      throw error;
    }
  }

  function transactionPayload() {
    return {
      ...state.transactionForm,
      amount: Number(state.transactionForm.amount)
    };
  }

  function renderSummaryCards() {
    const dashboard = state.dashboard || {};
    return `
      <section class="card-grid">
        <article class="card stat-card">
          <span class="muted">Receitas</span>
          <strong>${currency.format(dashboard.income || 0)}</strong>
        </article>
        <article class="card stat-card">
          <span class="muted">Despesas</span>
          <strong>${currency.format(dashboard.expenses || 0)}</strong>
        </article>
        <article class="card stat-card">
          <span class="muted">Investimentos</span>
          <strong>${currency.format(dashboard.investments || 0)}</strong>
        </article>
        <article class="card stat-card ${dashboard.balance >= 0 ? 'positive' : 'negative'}">
          <span class="muted">Saldo</span>
          <strong>${currency.format(dashboard.balance || 0)}</strong>
        </article>
      </section>
    `;
  }

  function renderOptions(items, selectedValue, formatter) {
    return items.map((item) => {
      const value = typeof item === 'string' ? item : item.id || item.key || item.value;
      const label = formatter ? formatter(item) : (typeof item === 'string' ? item : item.name || item.label || value);
      return `<option value="${esc(value)}" ${String(value) === String(selectedValue) ? 'selected' : ''}>${esc(label)}</option>`;
    }).join('');
  }

  function renderTransactions() {
    if (!state.transactions.length) {
      return '<p class="empty-state">Nenhum lançamento encontrado para o filtro atual.</p>';
    }

    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Membro</th>
              <th>Tipo</th>
              <th>Categoria</th>
              <th>Descrição</th>
              <th>Prazo</th>
              <th>Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${state.transactions.map((transaction) => `
              <tr>
                <td>${esc(transaction.date)}</td>
                <td>${esc(memberLabel(transaction.memberId))}</td>
                <td>${esc(typeLabel(transaction.type))}</td>
                <td>${esc(transaction.category)}</td>
                <td>${esc(transaction.description)}</td>
                <td>${esc(termLabel(transaction.term))}</td>
                <td>${currency.format(transaction.amount)}</td>
                <td><button class="ghost-button" data-action="delete-transaction" data-id="${esc(transaction.id)}">Excluir</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderInvestments() {
    const rows = state.investments?.investments || [];
    return `
      <div class="stack-sm">
        <p><strong>Total investido:</strong> ${currency.format(state.investments?.total || 0)}</p>
        ${rows.length ? `
          <ul class="simple-list">
            ${rows.map((item) => `<li>${esc(item.date)} · ${esc(memberLabel(item.memberId))} · ${currency.format(item.amount)} · ${esc(item.type)}</li>`).join('')}
          </ul>
        ` : '<p class="empty-state">Nenhum investimento encontrado.</p>'}
      </div>
    `;
  }

  function renderConnections() {
    return `
      <div class="stack-sm">
        <div class="inline-form">
          <select name="bankInstitution">${renderOptions(state.bankInstitutions, state.bankInstitution, (item) => item.name)}</select>
          <button data-action="connect-bank">Conectar banco</button>
        </div>
        ${(state.bankConnections || []).length ? `
          <ul class="simple-list">
            ${state.bankConnections.map((connection) => `
              <li>
                <strong>${esc(connection.institution)}</strong> · ${esc(connection.status)}
                <div class="inline-actions">
                  <button class="ghost-button" data-action="sync-bank" data-id="${esc(connection.id)}">Sincronizar</button>
                  <button class="ghost-button" data-action="revoke-bank" data-id="${esc(connection.id)}">Revogar</button>
                </div>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="empty-state">Nenhuma conexão bancária cadastrada.</p>'}
      </div>
    `;
  }

  function renderImportPreview() {
    if (!state.importPreview) {
      return '<p class="empty-state">Carregue um CSV/JSON para visualizar antes de importar.</p>';
    }

    return `
      <div class="stack-sm">
        <p><strong>Arquivo:</strong> ${esc(state.importPreview.fileName)} · <strong>Linhas:</strong> ${esc(state.importPreview.summary?.totalRows || 0)} · <strong>Duplicadas:</strong> ${esc(state.importPreview.summary?.duplicates || 0)}</p>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              ${(state.importPreview.rows || []).slice(0, 10).map((row) => `
                <tr>
                  <td>${esc(row.date)}</td>
                  <td>${esc(row.description)}</td>
                  <td>${esc(row.category)}</td>
                  <td>${currency.format(row.amount || 0)}</td>
                  <td>${esc(typeLabel(row.type))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderImportHistory() {
    if (!state.importHistory.length) {
      return '<p class="empty-state">Nenhuma importação registrada.</p>';
    }

    return `
      <ul class="simple-list">
        ${state.importHistory.map((item) => `
          <li>
            <strong>${esc(item.fileName)}</strong> · ${esc(memberLabel(item.memberId))} · ${esc(item.importedRows)} importados / ${esc(item.duplicateRows)} duplicados
            <br />
            <span class="muted">Meses: ${esc((item.importedMonths || []).join(', ') || '-')} · ${esc(new Date(item.createdAt).toLocaleString('pt-BR'))}</span>
          </li>
        `).join('')}
      </ul>
    `;
  }

  function renderRecoveryPlan() {
    const plan = state.recoveryPlan;
    if (!plan) {
      return '<p class="empty-state">Plano de recuperação indisponível.</p>';
    }

    const shortActions = plan.horizons?.short || [];

    return `
      <div class="stack-sm">
        <p><strong>Severidade:</strong> ${esc(plan.severityLabel || '-')}</p>
        <p>${esc(plan.summary || '')}</p>
        <p><strong>Reserva:</strong> ${esc(String(plan.metrics?.reservaMeses ?? 0))} meses</p>
        <p><strong>Saldo projetado:</strong> ${currency.format(plan.metrics?.saldoCaixaProjetado || 0)}</p>
        ${shortActions.length ? `
          <ul class="simple-list">
            ${shortActions.map((action) => `<li><strong>${esc(action.title)}</strong> — ${esc(action.description)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `;
  }

  function render() {
    const monthOptions = state.months.length ? state.months : [state.selectedMonth];
    const categoryOptions = currentCategoryOptions();

    root.innerHTML = `
      <div class="app-shell">
        <header class="hero card">
          <div>
            <p class="eyebrow">App Finanças</p>
            <h1>Painel financeiro familiar</h1>
            <p class="muted">Frontend estático compatível com Docker, consumindo a API local sem depender de React/Vite no runtime.</p>
          </div>
          <div class="hero-actions">
            <button data-action="seed-data" ${state.busy ? 'disabled' : ''}>Restaurar dados de exemplo</button>
            <button class="ghost-button" data-action="clear-data" ${state.busy ? 'disabled' : ''}>Limpar lançamentos</button>
          </div>
        </header>

        ${state.error ? `<div class="banner error">${esc(state.error)}</div>` : ''}
        ${state.success ? `<div class="banner success">${esc(state.success)}</div>` : ''}

        <section class="card filters">
          <div>
            <label>Membro</label>
            <select name="selectedMember">${renderOptions([{ id: 'all', name: 'Todos' }, ...state.members], state.selectedMember, (item) => item.name || item.id)}</select>
          </div>
          <div>
            <label>Mês</label>
            <select name="selectedMonth">${renderOptions(monthOptions, state.selectedMonth)}</select>
          </div>
          <div class="filter-action">
            <button data-action="refresh" ${state.busy ? 'disabled' : ''}>${state.loading ? 'Carregando...' : 'Atualizar painel'}</button>
          </div>
        </section>

        ${renderSummaryCards()}

        <section class="card-grid details-grid">
          <article class="card">
            <h2>Novo lançamento</h2>
            <div class="form-grid">
              <label><span>Membro</span><select name="tx-memberId">${renderOptions(state.members, state.transactionForm.memberId, (item) => item.name)}</select></label>
              <label><span>Tipo</span><select name="tx-type">${renderOptions(['expense', 'income', 'investment'], state.transactionForm.type, typeLabel)}</select></label>
              <label><span>Categoria</span><select name="tx-category">${renderOptions(categoryOptions, state.transactionForm.category)}</select></label>
              <label><span>Descrição</span><input name="tx-description" value="${esc(state.transactionForm.description)}" /></label>
              <label><span>Valor</span><input name="tx-amount" type="number" min="0" step="0.01" value="${esc(state.transactionForm.amount)}" /></label>
              <label><span>Mês</span><input name="tx-month" type="month" value="${esc(state.transactionForm.month)}" /></label>
              <label><span>Data</span><input name="tx-date" type="date" value="${esc(state.transactionForm.date)}" /></label>
              <label><span>Vencimento</span><input name="tx-dueDate" type="date" value="${esc(state.transactionForm.dueDate)}" /></label>
            </div>
            <label class="checkbox-row"><input name="tx-isInvestmentReserve" type="checkbox" ${state.transactionForm.isInvestmentReserve ? 'checked' : ''} /> Reserva para investir</label>
            <button data-action="save-transaction" ${state.busy ? 'disabled' : ''}>Salvar lançamento</button>
          </article>

          <article class="card">
            <h2>Plano de recuperação</h2>
            ${renderRecoveryPlan()}
          </article>
        </section>

        <section class="card">
          <h2>Lançamentos</h2>
          ${renderTransactions()}
        </section>

        <section class="card-grid details-grid">
          <article class="card">
            <h2>Investimentos</h2>
            ${renderInvestments()}
          </article>
          <article class="card">
            <h2>Open Finance</h2>
            ${renderConnections()}
          </article>
        </section>

        <section class="card-grid details-grid">
          <article class="card">
            <h2>Importação manual</h2>
            <div class="form-grid">
              <label><span>Membro</span><select name="import-memberId">${renderOptions(state.members, state.importForm.memberId, (item) => item.name)}</select></label>
              <label><span>Tipo</span><select name="import-importType">${renderOptions(['transaction'], state.importForm.importType)}</select></label>
              <label><span>Mês fallback</span><input name="import-month" type="month" value="${esc(state.importForm.month)}" /></label>
              <label class="full-width"><span>Arquivo</span><input name="import-file" type="file" accept=".csv,.json,.txt" /></label>
              <label class="full-width"><span>Conteúdo</span><textarea name="import-content" rows="8">${esc(state.importForm.content)}</textarea></label>
            </div>
            <div class="inline-actions">
              <button data-action="preview-import" ${state.busy ? 'disabled' : ''}>Pré-visualizar</button>
              <button class="ghost-button" data-action="commit-import" ${state.busy ? 'disabled' : ''}>Importar</button>
            </div>
            ${renderImportPreview()}
          </article>
          <article class="card">
            <h2>Histórico de importações</h2>
            ${renderImportHistory()}
          </article>
        </section>
      </div>
    `;

    bindEvents();
  }

  async function handleAction(action, element) {
    if (state.busy && action !== 'refresh') return;

    if (action === 'refresh') {
      await refreshData();
      return;
    }

    if (action === 'seed-data') {
      await runBusy(() => request('/api/transactions/seed', { method: 'POST', body: '{}' }), 'Dados de exemplo restaurados.');
      return;
    }

    if (action === 'clear-data') {
      await runBusy(() => request('/api/transactions', { method: 'DELETE' }), 'Todos os lançamentos foram removidos.');
      state.importPreview = null;
      return;
    }

    if (action === 'save-transaction') {
      await runBusy(() => request('/api/transactions', { method: 'POST', body: JSON.stringify(transactionPayload()) }), 'Lançamento salvo com sucesso.');
      state.transactionForm = { ...defaultTransactionForm, memberId: state.transactionForm.memberId, category: currentCategoryOptions()[0] || '', month: state.selectedMonth };
      return;
    }

    if (action === 'delete-transaction') {
      await runBusy(() => request(`/api/transactions/${element.dataset.id}`, { method: 'DELETE' }), 'Lançamento removido com sucesso.');
      return;
    }

    if (action === 'connect-bank') {
      const payload = { institution_key: state.bankInstitution, member: state.transactionForm.memberId };
      const data = await runBusy(() => request('/api/banks/connect', { method: 'POST', body: JSON.stringify(payload) }), 'Conexão bancária iniciada.');
      if (data.redirectUrl) {
        setMessage('success', `Conexão iniciada. Abra manualmente a URL de callback/mock se necessário: ${data.redirectUrl}`);
      }
      return;
    }

    if (action === 'sync-bank') {
      await runBusy(() => request(`/api/banks/${element.dataset.id}/sync`, { method: 'POST', body: '{}' }), 'Sincronização concluída.');
      return;
    }

    if (action === 'revoke-bank') {
      await runBusy(() => request(`/api/banks/${element.dataset.id}/revoke`, { method: 'POST', body: '{}' }), 'Consentimento revogado.');
      return;
    }

    if (action === 'preview-import') {
      state.importPreview = await runBusy(() => request('/api/imports/preview', { method: 'POST', body: JSON.stringify(state.importForm) }));
      state.success = 'Pré-visualização gerada com sucesso.';
      render();
      return;
    }

    if (action === 'commit-import') {
      const data = await runBusy(() => request('/api/imports/commit', { method: 'POST', body: JSON.stringify(state.importForm) }));
      state.importPreview = null;
      setMessage('success', data.message || 'Importação concluída com sucesso.');
    }
  }

  function bindEvents() {
    root.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        handleAction(button.dataset.action, button).catch(() => {});
      });
    });

    const selectedMember = root.querySelector('select[name="selectedMember"]');
    if (selectedMember) {
      selectedMember.addEventListener('change', async (event) => {
        state.selectedMember = event.target.value;
        await refreshData();
      });
    }

    const selectedMonth = root.querySelector('select[name="selectedMonth"]');
    if (selectedMonth) {
      selectedMonth.addEventListener('change', async (event) => {
        state.selectedMonth = event.target.value;
        state.transactionForm.month = event.target.value;
        state.importForm.month = event.target.value;
        await refreshData();
      });
    }

    root.querySelectorAll('[name^="tx-"]').forEach((input) => {
      input.addEventListener('change', (event) => {
        const field = event.target.name.replace('tx-', '');
        state.transactionForm[field] = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        if (field === 'type') {
          state.transactionForm.category = currentCategoryOptions()[0] || '';
          render();
        }
      });
    });

    root.querySelectorAll('[name^="import-"]').forEach((input) => {
      input.addEventListener('change', (event) => {
        const field = event.target.name.replace('import-', '');
        state.importForm[field] = event.target.value;
      });
    });

    const bankInstitution = root.querySelector('select[name="bankInstitution"]');
    if (bankInstitution) {
      bankInstitution.addEventListener('change', (event) => {
        state.bankInstitution = event.target.value;
      });
    }

    const fileInput = root.querySelector('input[name="import-file"]');
    if (fileInput) {
      fileInput.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        state.importForm.fileName = file.name;
        state.importForm.content = await file.text();
        render();
      });
    }
  }

  render();
  boot();
}
